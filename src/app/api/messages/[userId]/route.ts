import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
	req: NextRequest,
	context: { params: Promise<{ userId: string }> }
) {
	try {
		const me = await getUserFromRequest(req)
		if (!me)
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

		const { userId } = await context.params // ✅ теперь асинхронно

		if (!userId) {
			return NextResponse.json({ error: 'userId не передан' }, { status: 400 })
		}

		// Безопасный запрос с обработкой ошибок
		let messages
		try {
			messages = await prisma.privateMessage.findMany({
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
					replyTo: {
						include: {
							sender: {
								select: {
									id: true,
									fullName: true,
									email: true,
								},
							},
						},
					},
					reactions: true,
				},
				orderBy: { createdAt: 'asc' },
			})
		} catch (prismaError: any) {
			console.error('❌ Ошибка Prisma при получении приватных сообщений:', prismaError)
			// Если ошибка связана с отсутствующими полями, делаем базовый запрос
			if (prismaError.message?.includes('replyTo') || prismaError.message?.includes('reactions') || prismaError.code === 'P2021') {
				console.warn('⚠️ Поля replyTo/reactions недоступны, используем базовый запрос')
				messages = await prisma.privateMessage.findMany({
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
			} else {
				throw prismaError
			}
		}

	// Преобразуем данные в нужный формат
	const result = messages.map(msg => {
		// Безопасная обработка replyTo - если сообщение удалено или не найдено, возвращаем null
		let replyToData = null
		if (msg.replyTo && !(msg.replyTo as any).deletedAt) {
			replyToData = {
				id: (msg.replyTo as any).id,
				content: (msg.replyTo as any).content || '[Сообщение удалено]',
				sender: (msg.replyTo as any).sender,
			}
		}

		return {
			id: msg.id,
			content: msg.content,
			createdAt: msg.createdAt,
			editedAt: msg.editedAt,
			sender: msg.sender,
			fileUrl: msg.fileUrl || (msg.file ? `/api/files/${msg.file.id}` : null),
			fileName: msg.fileName || msg.file?.filename || null,
			fileMimetype: msg.mimeType || msg.file?.mimetype || null,
			replyTo: replyToData,
			reactions: (msg.reactions || []).map((r: any) => ({
				emoji: r.emoji,
				userId: r.userId,
			})),
		}
	})

		console.log('📨 Приватные сообщения найдены:', result.length)
		if (result.length > 0) {
			console.log('📝 Первое сообщение:', result[0])
		} else {
			console.log('📝 Сообщений нет, возвращаем пустой массив')
		}

		return NextResponse.json(result, { status: 200 })
	} catch (error: any) {
		console.error('❌ Ошибка получения приватных сообщений:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера', details: error.message },
			{ status: 500 }
		)
	}
}
