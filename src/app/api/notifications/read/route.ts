// app/api/notifications/read/route.ts
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 })
    }

    const { messageId, chatType, chatId } = body

    // Помечаем уведомления как прочитанные
    // Если передан messageId - помечаем уведомления с этим messageId
    // Если передан chatType и chatId - помечаем все уведомления связанные с этим чатом
    const whereClause: any = {
      userId: user.id,
      isRead: false,
      type: 'message',
    }

    if (messageId) {
      // Ищем уведомления по messageId через link или message поле
      whereClause.OR = [
        { link: { contains: messageId } },
        { message: { contains: messageId } },
      ]
    } else if (chatType && chatId) {
      // Ищем уведомления по chatId через link
      const linkPattern = chatType === 'private' 
        ? `/chats?open=${chatId}`
        : `/tasks/${chatId}`
      whereClause.link = { contains: linkPattern }
    } else {
      return NextResponse.json({ error: 'Необходимо указать messageId или chatType+chatId' }, { status: 400 })
    }

    const result = await prisma.notification.updateMany({
      where: whereClause,
      data: { isRead: true },
    })

    return NextResponse.json({ 
      success: true, 
      updated: result.count 
    })
  } catch (error: any) {
    console.error('Ошибка пометки уведомлений как прочитанных:', error)
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    )
  }
}

