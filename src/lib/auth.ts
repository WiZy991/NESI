import bcrypt from 'bcrypt'
import { verifyJWT } from './jwt'
import prisma from './prisma'
import { NextRequest } from 'next/server'

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

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  })

  // 🟢 если пользователь найден, но флаги не выставлены — просто предупреждаем, но не ломаем
  if (user && (!user.emailVerified || !user.verified)) {
    console.warn('⚠️ Пользователь без подтверждения:', user.email)
  }

  return user
}

export async function getUserFromRequest(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) return null

  try {
    const user = await getUserFromToken(token)
    if (!user) return null

    // 🔒 Проверяем блокировку пользователя (обратно совместимо)
    try {
      if (user.blocked) {
        // Постоянная блокировка
        if (!user.blockedUntil) {
          console.warn(`🚫 Попытка доступа заблокированного пользователя: ${user.email}`)
          return null
        }
        
        // Временная блокировка
        const now = new Date()
        if (user.blockedUntil > now) {
          console.warn(`🚫 Попытка доступа временно заблокированного пользователя: ${user.email} (до ${user.blockedUntil})`)
          return null
        } else {
          // Блокировка истекла, снимаем её
          await prisma.user.update({
            where: { id: user.id },
            data: { blocked: false, blockedUntil: null, blockedReason: null },
          })
          console.log(`✅ Временная блокировка снята: ${user.email}`)
          user.blocked = false
          user.blockedUntil = null
          user.blockedReason = null
        }
      }
    } catch (blockCheckError) {
      // Если поля blockedUntil/blockedReason не существуют в БД — игнорируем
      console.warn('⚠️ Anti-fraud поля не найдены в БД (миграция не применена), пропускаем проверку блокировки')
    }

    return user
  } catch (error) {
    console.error('❌ Ошибка при декодировании токена:', error)
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
