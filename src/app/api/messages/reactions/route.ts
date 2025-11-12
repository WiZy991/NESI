import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// POST /api/messages/reactions - добавить/удалить реакцию
export async function POST(req: NextRequest) {
	const user = await getUserFromRequest(req)
	if (!user) {
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	try {
		const { messageId, emoji, chatType } = await req.json()

		if (!messageId || !emoji || !chatType) {
			return NextResponse.json(
				{ error: 'messageId, emoji и chatType обязательны' },
				{ status: 400 }
			)
		}

		// Проверяем, существует ли сообщение
		if (chatType === 'task') {
			const message = await prisma.message.findUnique({
				where: { id: messageId },
			})

			if (!message) {
				return NextResponse.json(
					{ error: 'Сообщение не найдено' },
					{ status: 404 }
				)
			}

			// Проверяем, есть ли уже такая реакция от этого пользователя
			const existingReaction = await prisma.messageReaction.findUnique({
				where: {
					messageId_userId_emoji: {
						messageId,
						userId: user.id,
						emoji,
					},
				},
			})

			if (existingReaction) {
				// Удаляем реакцию
				await prisma.messageReaction.delete({
					where: {
						id: existingReaction.id,
					},
				})

				return NextResponse.json({ action: 'removed', emoji })
			} else {
				// Добавляем реакцию
				await prisma.messageReaction.create({
					data: {
						messageId,
						userId: user.id,
						emoji,
					},
				})

				return NextResponse.json({ action: 'added', emoji })
			}
		} else if (chatType === 'private') {
			const message = await prisma.privateMessage.findUnique({
				where: { id: messageId },
			})

			if (!message) {
				return NextResponse.json(
					{ error: 'Сообщение не найдено' },
					{ status: 404 }
				)
			}

			// Проверяем, есть ли уже такая реакция от этого пользователя
			const existingReaction = await prisma.privateMessageReaction.findUnique({
				where: {
					messageId_userId_emoji: {
						messageId,
						userId: user.id,
						emoji,
					},
				},
			})

			if (existingReaction) {
				// Удаляем реакцию
				await prisma.privateMessageReaction.delete({
					where: {
						id: existingReaction.id,
					},
				})

				return NextResponse.json({ action: 'removed', emoji })
			} else {
				// Добавляем реакцию
				await prisma.privateMessageReaction.create({
					data: {
						messageId,
						userId: user.id,
						emoji,
					},
				})

				return NextResponse.json({ action: 'added', emoji })
			}
		} else {
			return NextResponse.json(
				{ error: 'Неверный chatType' },
				{ status: 400 }
			)
		}
	} catch (error: any) {
		logger.error('Ошибка при работе с реакцией', error, {
			userId: user?.id,
			messageId,
			emoji,
			chatType,
		})
		return NextResponse.json(
			{ error: 'Ошибка сервера', details: error.message },
			{ status: 500 }
		)
	}
}

