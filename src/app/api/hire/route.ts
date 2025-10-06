// src/app/api/hire/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req)
    if (!me) {
      console.warn('/api/hire: пользователь не найден по токену')
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    if (me.role !== 'customer') {
      console.warn(`/api/hire: роль не customer (role=${me.role})`)
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const executorId = body?.executorId as string | undefined
    if (!executorId) {
      return NextResponse.json({ error: 'Не передан executorId' }, { status: 400 })
    }

    if (executorId === me.id) {
      return NextResponse.json({ error: 'Нельзя нанять самого себя' }, { status: 400 })
    }

    // проверим, что исполнитель существует и это именно исполнитель
    const executor = await prisma.user.findUnique({
      where: { id: executorId },
      select: { id: true, role: true },
    })
    if (!executor || executor.role !== 'executor') {
      return NextResponse.json({ error: 'Исполнитель не найден' }, { status: 404 })
    }

    // уже существует активный запрос? (pending/accepted)
    const existing = await prisma.hireRequest.findFirst({
      where: {
        customerId: me.id,
        executorId,
        status: { in: ['pending', 'accepted'] },
      },
      select: { id: true, status: true, createdAt: true },
    })

    if (existing) {
      return NextResponse.json(
        {
          ok: true,
          already: true,
          hireId: existing.id,
          status: existing.status,
          message:
            existing.status === 'accepted'
              ? 'Запрос уже принят'
              : 'Запрос уже отправлен',
        },
        { status: 409 }
      )
    }

    // создаём новый (status по схеме = 'pending')
    const hire = await prisma.hireRequest.create({
      data: { customerId: me.id, executorId },
      select: { id: true, status: true, createdAt: true },
    })

    // создаём уведомление исполнителю → сразу ведём в чат с заказчиком
    await prisma.notification.create({
      data: {
        userId: executorId,
        type: 'hire_request',
        message: `Заказчик ${me.fullName || me.email} хочет нанять вас`,
        link: `/messages/${me.id}`, //исполнитель при клике пойдёт в чат
      },
    })

    return NextResponse.json(
      { ok: true, already: false, hireId: hire.id, status: hire.status },
      { status: 201 }
    )
  } catch (err) {
    console.error('Ошибка /api/hire:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
