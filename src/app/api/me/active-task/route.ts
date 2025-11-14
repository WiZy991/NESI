import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { canTakeMoreTasks } from '@/lib/level/taskLimit'

export async function GET(req: NextRequest) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  // Только для исполнителей имеет смысл
  if (me.role !== 'executor') {
    return NextResponse.json({ 
      has: false, 
      canTake: false,
      activeCount: 0,
      maxCount: 0,
      remaining: 0
    })
  }

  const taskLimit = await canTakeMoreTasks(me.id)
  return NextResponse.json({ 
    has: taskLimit.activeCount > 0,
    canTake: taskLimit.canTake,
    activeCount: taskLimit.activeCount,
    maxCount: taskLimit.maxCount,
    remaining: taskLimit.remaining
  })
}
