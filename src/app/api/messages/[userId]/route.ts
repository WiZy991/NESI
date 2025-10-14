import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
	req: NextRequest,
	context: { params: Promise<{ userId: string }> }
) {
	const me = await getUserFromRequest(req)
	if (!me)
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	const { userId } = await context.params // ✅ теперь асинхронно

	if (!userId) {
		return NextResponse.json({ error: 'userId не передан' }, { status: 400 })
	}

	const messages = await prisma.privateMessage.findMany({
		where: {
			OR: [
				{ senderId: me.id, recipientId: userId },
				{ senderId: userId, recipientId: me.id },
			],
		},
		include: {
			sender: {
				select: {
					id: true,
					fullName: true,
					email: true,
					avatarUrl: true,
				},
			},
			recipient: {
				select: {
					id: true,
					fullName: true,
					email: true,
					avatarUrl: true,
				},
			},
			file: {
				select: {
					id: true,
					filename: true,
					mimetype: true,
				},
			},
		},
		orderBy: { createdAt: 'asc' },
	})

	// Преобразуем данные в нужный формат
	const result = messages.map(msg => ({
		id: msg.id,
		content: msg.content,
		createdAt: msg.createdAt,
		sender: msg.sender,
		fileUrl: msg.fileUrl || (msg.file ? `/api/files/${msg.file.id}` : null),
		fileName: msg.fileName || msg.file?.filename || null,
		fileMimetype: msg.mimeType || msg.file?.mimetype || null,
	}))

	console.log('📨 Приватные сообщения найдены:', result.length)
	console.log('📝 Первое сообщение:', result[0])

	return NextResponse.json(result)
}
