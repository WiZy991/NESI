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

    // ⚠️ НЕ БЛОКИРУЕМ пользователя, если не верифицирован
    // Просто возвращаем данные, чтобы не выбивало из системы
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
