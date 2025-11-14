import bcrypt from 'bcrypt'
import { verifyJWT } from './jwt'
import prisma from './prisma'
import { NextRequest } from 'next/server'
import { logger } from './logger'

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashed: string) {
  return await bcrypt.compare(password, hashed)
}

export async function getUserFromToken(token: string) {
  const payload = verifyJWT(token)

  if (!payload || !payload.userId) {
    throw new Error('Token does not contain userId')
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    // 🟢 если пользователь найден, но флаги не выставлены — просто предупреждаем, но не ломаем
    if (user && (!user.emailVerified || !user.verified)) {
      logger.warn('Пользователь без подтверждения', { email: user.email })
    }

    return user
  } catch (error: any) {
    // Проверяем различные типы ошибок БД
    const isConnectionError = 
      error?.code === 'P1017' || // Server has closed the connection
      error?.code === 'P1001' || // Can't reach database server
      error?.message?.includes('could not write init file') ||
      error?.message?.includes('FATAL') ||
      error?.message?.includes('Error in connector')
    
    const isTableMissingError = 
      error?.code === 'P2021' || // Table does not exist
      error?.message?.includes('does not exist') ||
      error?.message?.includes('Table')
    
    if (isConnectionError) {
      // Для ошибок подключения выбрасываем специальную ошибку
      const dbError = new Error('Database connection error')
      dbError.name = 'DatabaseConnectionError'
      throw dbError
    }
    
    if (isTableMissingError) {
      // Для ошибок отсутствующих таблиц выбрасываем специальную ошибку
      const dbError = new Error('Database schema error: tables not found. Please run migrations.')
      dbError.name = 'DatabaseSchemaError'
      throw dbError
    }
    
    // Для других ошибок просто пробрасываем
    throw error
  }
}

// Переменная для отслеживания последнего логирования ошибки БД
let lastDbErrorLog = 0
const DB_ERROR_LOG_INTERVAL = 30000 // Логируем ошибку БД не чаще раза в 30 секунд

export async function getUserFromRequest(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) return null

  try {
    const user = await getUserFromToken(token)
    if (!user) return null

    // 🔒 Проверяем блокировку пользователя
    if (user.blocked) {
      // Постоянная блокировка
      if (!user.blockedUntil) {
        logger.warn('Попытка доступа заблокированного пользователя', { email: user.email })
        return null
      }
      
      // Временная блокировка
      const now = new Date()
      if (user.blockedUntil > now) {
        logger.warn('Попытка доступа временно заблокированного пользователя', { 
          email: user.email, 
          blockedUntil: user.blockedUntil 
        })
        return null
      } else {
        // Блокировка истекла, снимаем её
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { blocked: false, blockedUntil: null, blockedReason: null },
          })
          logger.info('Временная блокировка снята', { email: user.email })
          user.blocked = false
          user.blockedUntil = null
          user.blockedReason = null
        } catch (updateError: any) {
          // Игнорируем ошибки БД при попытке снятия блокировки
          const isConnectionError = 
            updateError?.code === 'P1017' ||
            updateError?.code === 'P1001' ||
            updateError?.message?.includes('could not write init file') ||
            updateError?.message?.includes('FATAL')
          
          if (!isConnectionError) {
            logger.error('Ошибка при снятии блокировки', updateError, { userId: user.id })
          }
        }
      }
    }

    return user
  } catch (error: any) {
    // Проверяем различные типы ошибок БД
    const isConnectionError = 
      error?.name === 'DatabaseConnectionError' ||
      error?.code === 'P1017' ||
      error?.code === 'P1001' ||
      error?.message?.includes('could not write init file') ||
      error?.message?.includes('FATAL') ||
      error?.message?.includes('Error in connector')
    
    const isTableMissingError = 
      error?.name === 'DatabaseSchemaError' ||
      error?.code === 'P2021' ||
      error?.message?.includes('does not exist') ||
      error?.message?.includes('Table')
    
    if (isTableMissingError) {
      // Логируем ошибку схемы БД не чаще раза в минуту
      const now = Date.now()
      if (now - lastDbErrorLog > DB_ERROR_LOG_INTERVAL * 2) {
        logger.error('Ошибка схемы базы данных: таблицы не найдены', error, {
          solution: 'Выполните команду: npx prisma migrate deploy или npx prisma db push (для разработки)'
        })
        lastDbErrorLog = now
      }
      return null
    }
    
    if (isConnectionError) {
      // Логируем ошибку БД не чаще раза в 30 секунд, чтобы не спамить консоль
      const now = Date.now()
      if (now - lastDbErrorLog > DB_ERROR_LOG_INTERVAL) {
        logger.error('Ошибка подключения к базе данных. Проверьте доступность PostgreSQL', error)
        lastDbErrorLog = now
      }
      return null
    }
    
    // Для других ошибок (не связанных с БД) логируем всегда
    logger.error('Ошибка при декодировании токена', error)
    return null
  }
}

// ✅ Универсальная функция для извлечения токена
export function getTokenFromRequest(req: Request | NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth && auth.startsWith('Bearer ')) {
    return auth.split(' ')[1]
  }

  if ('cookies' in req) {
    const token = req.cookies.get('token')
    if (typeof token === 'string') return token
    if (token?.value) return token.value
  }

  return null
}
