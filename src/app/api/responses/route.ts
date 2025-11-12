import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { hasActiveTask } from '@/lib/guards'
import { recordTaskResponseStatus } from '@/lib/taskResponseStatus'
import { validateWithZod, taskResponseSchema } from '@/lib/validations'
import { validateStringLength } from '@/lib/security'
import { logger } from '@/lib/logger'
import { createUserRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  if (me.role !== 'executor') {
    return NextResponse.json({ error: 'Только исполнитель может откликаться' }, { status: 403 })
  }

  // Rate limiting для отправки откликов
  const responseRateLimit = createUserRateLimit({
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 10, // Максимум 10 откликов в минуту
  })
  const rateLimitResult = await responseRateLimit(req)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Слишком много откликов. Подождите немного.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ).toString(),
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      }
    )
  }

  let body
  try {
    body = await req.json()
  } catch (error) {
    return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
  }

  // Валидация taskId
  if (!body.taskId || typeof body.taskId !== 'string' || !body.taskId.trim()) {
    return NextResponse.json({ error: 'taskId обязателен' }, { status: 400 })
  }

  const taskId = body.taskId.trim()

  // Валидация данных отклика (message и price)
  const responseData = {
    message: body.message || '',
    price: body.price,
  }

  const validation = validateWithZod(taskResponseSchema, responseData)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.errors.join(', ') },
      { status: 400 }
    )
  }

  const { message, price } = validation.data

  // Дополнительная валидация длины сообщения
  if (message) {
    const messageValidation = validateStringLength(message, 2000, 'Сообщение')
    if (!messageValidation.valid) {
      return NextResponse.json(
        { error: messageValidation.error },
        { status: 400 }
      )
    }
  }

  // 🔒 ГАРД: есть ли активная задача у исполнителя?
  if (await hasActiveTask(me.id)) {
    return NextResponse.json(
      { error: 'У вас уже есть активная задача. Завершите её, чтобы взять следующую.' },
      { status: 409 }
    )
  }

  // --- дальше твоя существующая логика валидации/минималок/дубликатов и т.п. ---
  // Проверим, что задача существует и открыта
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true },
  })
  if (!task) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
  if (task.status !== 'open') {
    return NextResponse.json({ error: 'Задача уже недоступна для откликов' }, { status: 400 })
  }

  // Не даём отправлять повторный отклик этого пользователя на ту же задачу
  const exists = await prisma.taskResponse.findUnique({
    where: { taskId_userId: { taskId, userId: me.id } },
  })
  if (exists) {
    return NextResponse.json({ error: 'Вы уже откликались на эту задачу' }, { status: 409 })
  }

  try {
    const created = await prisma.$transaction(async tx => {
      const response = await tx.taskResponse.create({
        data: {
          taskId,
          userId: me.id,
          message: message && message.trim() ? message.trim() : null,
          price: price ?? null,
        },
      })

      await recordTaskResponseStatus(response.id, 'pending', {
        changedById: me.id,
        note: 'Отклик отправлен',
        tx,
      })

      return response
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    logger.error('Ошибка создания отклика', error, { userId: me.id, taskId })
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
