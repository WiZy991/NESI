import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { hasActiveTask } from '@/lib/guards'

export async function GET(req: NextRequest) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  // Только для исполнителей имеет смысл
  if (me.role !== 'executor') return NextResponse.json({ has: false })

  const has = await hasActiveTask(me.id)
  return NextResponse.json({ has })
}
