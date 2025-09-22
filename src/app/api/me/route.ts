// /api/me/route.ts
import { getUserFromRequest } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)

  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  return NextResponse.json({ user })
}
