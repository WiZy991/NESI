import prisma from './prisma'
import { NextRequest } from 'next/server'

/**
 * Получить IP-адрес из запроса
 */
export function getClientIP(req: NextRequest | Request): string {
  // Проверяем различные заголовки для получения реального IP
  const forwarded = req.headers.get('x-forwarded-for')
  const real = req.headers.get('x-real-ip')
  const cfConnecting = req.headers.get('cf-connecting-ip') // Cloudflare
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (real) {
    return real.trim()
  }
  
  if (cfConnecting) {
    return cfConnecting.trim()
  }
  
  return 'unknown'
}

/**
 * Получить User-Agent из запроса
 */
export function getUserAgent(req: NextRequest | Request): string {
  return req.headers.get('user-agent') || 'unknown'
}

/**
 * Логировать активность пользователя
 * (обратно совместимо - работает даже если таблица ActivityLog не создана)
 */
export async function logActivity(
  userId: string,
  action: string,
  req: NextRequest | Request,
  metadata?: any
) {
  try {
    const ipAddress = getClientIP(req)
    const userAgent = getUserAgent(req)
    
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        ipAddress,
        userAgent,
        metadata: metadata || null,
      },
    })
    
    console.log(`📊 Activity logged: ${userId} - ${action} from ${ipAddress}`)
  } catch (error) {
    console.warn('⚠️ ActivityLog таблица не найдена (миграция не применена), пропускаем логирование')
    // Не прерываем выполнение, если таблица не существует
  }
}

/**
 * Отправить уведомление администратору
 */
export async function sendAdminAlert(
  message: string,
  link?: string,
  metadata?: any
) {
  try {
    const adminId = process.env.PLATFORM_OWNER_ID
    
    if (!adminId) {
      console.warn('⚠️ PLATFORM_OWNER_ID не настроен, уведомление админу не отправлено')
      return
    }
    
    await prisma.notification.create({
      data: {
        userId: adminId,
        type: 'admin_alert',
        message: `⚠️ ${message}`,
        link: link || '/admin',
      },
    })
    
    console.log(`🚨 Admin alert sent: ${message}`)
  } catch (error) {
    console.error('❌ Failed to send admin alert:', error)
  }
}

/**
 * Проверить, не заблокирован ли пользователь
 * (обратно совместимо - работает даже если поля blockedUntil/blockedReason не созданы)
 */
export async function checkUserBlocked(userId: string): Promise<{
  isBlocked: boolean
  reason?: string
  until?: Date
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { blocked: true, blockedUntil: true, blockedReason: true },
    })
    
    if (!user) {
      return { isBlocked: false }
    }
    
    // Постоянная блокировка
    if (user.blocked && !user.blockedUntil) {
      return { isBlocked: true, reason: user.blockedReason || undefined }
    }
    
    // Временная блокировка
    if (user.blockedUntil) {
      const now = new Date()
      if (user.blockedUntil > now) {
        return {
          isBlocked: true,
          reason: user.blockedReason || undefined,
          until: user.blockedUntil,
        }
      } else {
        // Блокировка истекла, снимаем её
        await prisma.user.update({
          where: { id: userId },
          data: { blockedUntil: null, blockedReason: null },
        })
        return { isBlocked: false }
      }
    }
    
    return { isBlocked: false }
  } catch (error) {
    console.warn('⚠️ Anti-fraud поля не найдены в БД (миграция не применена), пропускаем проверку блокировки')
    // Если поля не существуют - просто возвращаем что пользователь не заблокирован
    return { isBlocked: false }
  }
}

/**
 * Проверки перед выводом средств
 */
export async function validateWithdrawal(userId: string, amount: number): Promise<{
  allowed: boolean
  error?: string
  warning?: string
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      executedTasks: {
        where: { status: 'completed' },
        select: { id: true },
      },
    },
  })
  
  if (!user) {
    return { allowed: false, error: 'Пользователь не найден' }
  }
  
  // Проверка 1: Хотя бы одна выполненная задача
  const completedTasksCount = user.executedTasks.length
  if (completedTasksCount === 0) {
    return {
      allowed: false,
      error: 'Вывод доступен только после выполнения хотя бы одной задачи',
    }
  }
  
  // Проверка 2: Лимиты для новых аккаунтов (младше 7 дней)
  const accountAge = Date.now() - user.createdAt.getTime()
  const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000 // 7 дней
  
  if (isNewAccount && amount > 5000) {
    return {
      allowed: false,
      error: 'Новые аккаунты (младше 7 дней) могут выводить максимум 5000₽ за раз',
    }
  }
  
  // Проверка 3: Активные споры
  const activeDisputes = await prisma.dispute.count({
    where: {
      OR: [
        { task: { customerId: userId } },
        { task: { executorId: userId } },
      ],
      status: { in: ['open', 'in_review'] },
    },
  })
  
  if (activeDisputes > 0) {
    return {
      allowed: false,
      error: `У вас есть ${activeDisputes} активных спор(а/ов). Вывод временно недоступен до их разрешения.`,
    }
  }
  
  // Предупреждение для новых аккаунтов
  let warning: string | undefined
  if (isNewAccount) {
    const daysOld = Math.floor(accountAge / (24 * 60 * 60 * 1000))
    warning = `Ваш аккаунт создан ${daysOld} дней назад. Лимит вывода: 5000₽`
  }
  
  return { allowed: true, warning }
}

/**
 * Выявить круговые сделки между двумя пользователями
 */
export async function detectCircularDeals(userAId: string, userBId: string): Promise<{
  count: number
  suspicious: boolean
  tasks: any[]
}> {
  const mutualTasks = await prisma.task.findMany({
    where: {
      OR: [
        { customerId: userAId, executorId: userBId },
        { customerId: userBId, executorId: userAId },
      ],
      status: 'completed',
    },
    select: {
      id: true,
      title: true,
      price: true,
      completedAt: true,
      customerId: true,
      executorId: true,
    },
    orderBy: { completedAt: 'desc' },
  })
  
  const count = mutualTasks.length
  const suspicious = count >= 3 // 3+ взаимных задач = подозрительно
  
  return { count, suspicious, tasks: mutualTasks }
}

