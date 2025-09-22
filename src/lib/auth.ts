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

  return user
}

export async function getUserFromRequest(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) return null

  try {
    const user = await getUserFromToken(token)
    return user
  } catch (error) {
    console.error('❌ Ошибка при декодировании токена:', error)
    return null
  }
}

// ✅ Универсальная функция — теперь точно работает и с App Router, и с API
export function getTokenFromRequest(req: Request | NextRequest): string | null {
  // 1. Authorization: Bearer <token>
  const auth = req.headers.get('authorization')
  if (auth && auth.startsWith('Bearer ')) {
    return auth.split(' ')[1]
  }

  // 2. Cookies — работает и в App Router (через req.cookies.get)
  if ('cookies' in req) {
    const token = req.cookies.get('token')
    if (typeof token === 'string') return token
    if (token?.value) return token.value
  }

  return null
}
