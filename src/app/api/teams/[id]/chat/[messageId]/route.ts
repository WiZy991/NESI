/**
 * API для редактирования и удаления сообщений командного чата
 * PATCH /api/teams/[id]/chat/[messageId] - редактирование
 * DELETE /api/teams/[id]/chat/[messageId] - удаление
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { validateWithZod } from '@/lib/validations'
import { validateStringLength } from '@/lib/security'

// Схема валидации для редактирования сообщения
const editMessageSchema = z.object({
	content: z
		.string()
		.min(1, 'Текст сообщения не может быть пустым')
		.max(5000, 'Сообщение слишком длинное (максимум 5000 символов)')
		.trim(),
})

// PATCH - Редактирование сообщения
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string; messageId: string }> }
) {
	try {
		const { id: teamId, messageId } = await params
		logger.debug('PATCH запрос на редактирование сообщения командного чата', { 
			messageId, 
			teamId 
		})
		
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		let body
		try {
			body = await req.json()
		} catch (error) {
			return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
		}

		// Валидация данных
		const validation = validateWithZod(editMessageSchema, body)
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.errors.join(', ') },
				{ status: 400 }
			)
		}

		const { content } = validation.data

		// Дополнительная валидация длины
		const contentValidation = validateStringLength(content, 5000, 'Сообщение')
		if (!contentValidation.valid) {
			return NextResponse.json(
				{ error: contentValidation.error },
				{ status: 400 }
			)
		}

		// Проверяем существование сообщения и права доступа
		const message = await prisma.teamChat.findUnique({
			where: { id: messageId },
			include: {
				sender: {
					select: {
						id: true,
						fullName: true,
						email: true,
						avatarFileId: true,
					},
				},
			},
		})

		if (!message) {
			return NextResponse.json(
				{ error: 'Сообщение не найдено' },
				{ status: 404 }
			)
		}

		// Проверяем, что сообщение принадлежит команде
		if (message.teamId !== teamId) {
			return NextResponse.json(
				{ error: 'Сообщение не принадлежит этой команде' },
				{ status: 403 }
			)
		}

		// Проверяем, что пользователь является участником команды
		const teamMember = await prisma.teamMember.findUnique({
			where: {
				teamId_userId: {
					teamId,
					userId: user.id,
				},
			},
		})

		if (!teamMember) {
			return NextResponse.json(
				{ error: 'Вы не являетесь участником этой команды' },
				{ status: 403 }
			)
		}

		// Проверяем, что пользователь является автором сообщения
		if (message.senderId !== user.id) {
			logger.warn('Попытка редактирования чужого сообщения', { 
				messageId, 
				senderId: message.senderId, 
				userId: user.id 
			})
			return NextResponse.json(
				{ error: 'Нет прав для редактирования' },
				{ status: 403 }
			)
		}

		// Обновляем сообщение
		const updatedMessage = await prisma.teamChat.update({
			where: { id: messageId },
			data: {
				content: content.trim(),
				editedAt: new Date(),
			},
			include: {
				sender: {
					select: {
						id: true,
						fullName: true,
						email: true,
						avatarFileId: true,
					},
				},
				file: {
					select: {
						id: true,
						filename: true,
						mimetype: true,
					},
				},
				reactions: {
					include: {
						user: {
							select: {
								id: true,
								fullName: true,
							},
						},
					},
				},
			},
		})

		logger.debug('Сообщение командного чата обновлено', { messageId })
		
		return NextResponse.json({ 
			message: {
				id: updatedMessage.id,
				content: updatedMessage.content,
				createdAt: updatedMessage.createdAt.toISOString(),
				editedAt: updatedMessage.editedAt?.toISOString() || null,
				sender: {
					id: updatedMessage.sender.id,
					fullName: updatedMessage.sender.fullName,
					email: updatedMessage.sender.email,
					avatarUrl: updatedMessage.sender.avatarFileId 
						? `/api/files/${updatedMessage.sender.avatarFileId}` 
						: undefined,
				},
				fileId: updatedMessage.file?.id || null,
				fileName: updatedMessage.file?.filename || null,
				fileMimetype: updatedMessage.file?.mimetype || null,
				fileUrl: updatedMessage.file ? `/api/files/${updatedMessage.file.id}` : null,
				reactions: updatedMessage.reactions.map(r => ({
					emoji: r.emoji,
					userId: r.user.id,
					user: r.user,
				})),
			}
		})
	} catch (error: any) {
		logger.error('Ошибка редактирования сообщения командного чата', error, { 
			messageId: (await params).messageId 
		})
		return NextResponse.json({ 
			error: 'Ошибка сервера'
		}, { status: 500 })
	}
}

// DELETE - Удаление сообщения
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string; messageId: string }> }
) {
	try {
		const { id: teamId, messageId } = await params
		logger.debug('DELETE запрос на удаление сообщения командного чата', { 
			messageId, 
			teamId 
		})
		
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Проверяем существование сообщения и права доступа
		const message = await prisma.teamChat.findUnique({
			where: { id: messageId },
		})

		if (!message) {
			return NextResponse.json(
				{ error: 'Сообщение не найдено' },
				{ status: 404 }
			)
		}

		// Проверяем, что сообщение принадлежит команде
		if (message.teamId !== teamId) {
			return NextResponse.json(
				{ error: 'Сообщение не принадлежит этой команде' },
				{ status: 403 }
			)
		}

		// Проверяем, что пользователь является участником команды
		const teamMember = await prisma.teamMember.findUnique({
			where: {
				teamId_userId: {
					teamId,
					userId: user.id,
				},
			},
		})

		if (!teamMember) {
			return NextResponse.json(
				{ error: 'Вы не являетесь участником этой команды' },
				{ status: 403 }
			)
		}

		// Проверяем, что пользователь является автором сообщения
		if (message.senderId !== user.id) {
			logger.warn('Нет прав для удаления сообщения', {
				messageId,
				messageSenderId: message.senderId,
				userId: user.id,
			})
			return NextResponse.json(
				{ error: 'Нет прав для удаления' },
				{ status: 403 }
			)
		}

		// Помечаем сообщение как удаленное (soft delete)
		const updatedMessage = await prisma.teamChat.update({
			where: { id: messageId },
			data: {
				content: '[Сообщение удалено]',
				deletedAt: new Date(),
			},
		})

		logger.info('Сообщение командного чата удалено', { messageId: updatedMessage.id })
		return NextResponse.json({ 
			message: {
				id: updatedMessage.id,
				content: updatedMessage.content,
			}
		})
	} catch (error: any) {
		logger.error('Ошибка удаления сообщения командного чата', error, { 
			messageId: (await params).messageId 
		})
		return NextResponse.json({ 
			error: 'Ошибка сервера: ' + String(error) 
		}, { status: 500 })
	}
}

