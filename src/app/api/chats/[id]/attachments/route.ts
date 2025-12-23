import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

type AttachmentType = 'all' | 'image' | 'doc'

const VALID_TYPES: AttachmentType[] = ['all', 'image', 'doc']

const IMAGE_MIME_PREFIX = 'image/'
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.heic', '.heif']

const ATTACHMENTS_LIMIT = 200

function normalizeType(value: string | null): AttachmentType {
	const type = (value ?? 'all').toLowerCase()
	return (VALID_TYPES.includes(type as AttachmentType) ? type : 'all') as AttachmentType
}

function isImageAttachment(mimeType?: string | null, fileName?: string | null): boolean {
	if (mimeType && mimeType.startsWith(IMAGE_MIME_PREFIX)) {
		return true
	}

	if (fileName) {
		const lower = fileName.toLowerCase()
		return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext))
	}

	return false
}

function extractFileIdFromUrl(url?: string | null) {
	if (!url) return null
	const match = url.match(/\/api\/files\/([a-zA-Z0-9_-]+)/)
	return match ? match[1] : null
}

function buildDownloadUrl(fileId?: string | null, fallbackUrl?: string | null) {
	if (fileId) {
		return `/api/files/${fileId}`
	}
	return fallbackUrl ?? null
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { id } = await context.params
		if (!id) {
			return NextResponse.json({ error: 'Не указан идентификатор чата' }, { status: 400 })
		}

		const url = new URL(req.url)
		const typeParam = normalizeType(url.searchParams.get('type'))
		const rawSearch = url.searchParams.get('search')?.trim()
		const search = rawSearch && rawSearch.length > 0 ? rawSearch : null

		let chatType: 'private' | 'task' | 'team'
		let identifier: string

		if (id.startsWith('private_')) {
			chatType = 'private'
			identifier = id.slice('private_'.length)
		} else if (id.startsWith('task_')) {
			chatType = 'task'
			identifier = id.slice('task_'.length)
		} else if (id.startsWith('team_')) {
			chatType = 'team'
			identifier = id.slice('team_'.length)
		} else {
			return NextResponse.json({ error: 'Неверный формат идентификатора чата' }, { status: 400 })
		}

		if (!identifier) {
			return NextResponse.json({ error: 'Идентификатор чата не может быть пустым' }, { status: 400 })
		}

		let attachments: Array<{
			messageId: string
			fileId: string | null
			fileName: string | null
			mimeType: string | null
			size: number | null
			downloadUrl: string | null
			thumbnailUrl: string | null
			createdAt: Date
			senderId: string
		}> = []

		if (chatType === 'private') {
			if (identifier === user.id) {
				return NextResponse.json({ attachments: [] })
			}

			const whereClauses: Prisma.PrivateMessageWhereInput[] = [
				{
					OR: [
						{ senderId: user.id, recipientId: identifier },
						{ senderId: identifier, recipientId: user.id },
					],
				},
				{
					OR: [{ fileId: { not: null } }, { fileUrl: { not: null } }],
				},
			]

			if (search) {
				whereClauses.push({
					OR: [
						{ fileName: { contains: search, mode: 'insensitive' } },
						{ fileUrl: { contains: search, mode: 'insensitive' } },
						{ file: { filename: { contains: search, mode: 'insensitive' } } },
					],
				})
			}

			const messages = await prisma.privateMessage.findMany({
				where: { AND: whereClauses },
				orderBy: { createdAt: 'desc' },
				include: {
					file: {
						select: {
							id: true,
							filename: true,
							mimetype: true,
							size: true,
							url: true,
						},
					},
				},
				take: ATTACHMENTS_LIMIT,
			})

			attachments = messages.map(msg => {
				const fileRecord = msg.file
				const fileId = fileRecord?.id ?? msg.fileId ?? extractFileIdFromUrl(msg.fileUrl ?? undefined)
				const fileName = msg.fileName ?? fileRecord?.filename ?? null
				const mimeType = msg.mimeType ?? fileRecord?.mimetype ?? null
				const size =
					typeof msg.size === 'number'
						? msg.size
						: typeof fileRecord?.size === 'number'
							? fileRecord.size
							: null
				const downloadUrl = buildDownloadUrl(fileId, fileRecord?.url ?? msg.fileUrl ?? null)
				const isImage = isImageAttachment(mimeType, fileName)
				const thumbnailUrl = isImage ? downloadUrl : null

				return {
					messageId: msg.id,
					fileId,
					fileName,
					mimeType,
					size,
					downloadUrl,
					thumbnailUrl,
					createdAt: msg.createdAt,
					senderId: msg.senderId,
				}
			})
		} else if (chatType === 'task') {
			const task = await prisma.task.findUnique({
				where: { id: identifier },
				select: {
					customerId: true,
					executorId: true,
				},
			})

			if (!task) {
				return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
			}

			const isParticipant =
				task.customerId === user.id || task.executorId === user.id || user.role === 'admin'

			if (!isParticipant) {
				return NextResponse.json({ error: 'Нет доступа к вложениям этой задачи' }, { status: 403 })
			}

			const whereClauses: Prisma.MessageWhereInput[] = [
				{
					taskId: identifier,
				},
				{
					OR: [{ fileId: { not: null } }, { fileUrl: { not: null } }],
				},
			]

			if (search) {
				whereClauses.push({
					OR: [
						{ fileUrl: { contains: search, mode: 'insensitive' } },
						{ file: { filename: { contains: search, mode: 'insensitive' } } },
					],
				})
			}

			const messages = await prisma.message.findMany({
				where: { AND: whereClauses },
				orderBy: { createdAt: 'desc' },
				include: {
					file: {
						select: {
							id: true,
							filename: true,
							mimetype: true,
							size: true,
							url: true,
						},
					},
				},
				take: ATTACHMENTS_LIMIT,
			})

			attachments = messages.map(msg => {
				const fileRecord = msg.file
				const fileId = fileRecord?.id ?? msg.fileId ?? extractFileIdFromUrl(msg.fileUrl ?? undefined)
				const fileName = fileRecord?.filename ?? null
				const mimeType = fileRecord?.mimetype ?? null
				const size =
				typeof fileRecord?.size === 'number' ? fileRecord.size : null
				const downloadUrl = buildDownloadUrl(fileId, fileRecord?.url ?? msg.fileUrl ?? null)
				const isImage = isImageAttachment(mimeType, fileName)
				const thumbnailUrl = isImage ? downloadUrl : null

				return {
					messageId: msg.id,
					fileId,
					fileName,
					mimeType,
					size,
					downloadUrl,
					thumbnailUrl,
					createdAt: msg.createdAt,
					senderId: msg.senderId,
				}
			})
		} else if (chatType === 'team') {
			// Проверяем, что пользователь является участником команды
			const teamMember = await prisma.teamMember.findUnique({
				where: {
					teamId_userId: {
						teamId: identifier,
						userId: user.id,
					},
				},
			})

			if (!teamMember) {
				return NextResponse.json({ error: 'Вы не являетесь участником этой команды' }, { status: 403 })
			}

			const whereClauses: Prisma.TeamChatWhereInput[] = [
				{
					teamId: identifier,
					deletedAt: null,
				},
				{
					OR: [{ fileId: { not: null } }, { fileUrl: { not: null } }],
				},
			]

			if (search) {
				whereClauses.push({
					OR: [
						{ fileUrl: { contains: search, mode: 'insensitive' } },
						{ file: { filename: { contains: search, mode: 'insensitive' } } },
					],
				})
			}

			const messages = await prisma.teamChat.findMany({
				where: { AND: whereClauses },
				orderBy: { createdAt: 'desc' },
				include: {
					file: {
						select: {
							id: true,
							filename: true,
							mimetype: true,
							size: true,
							url: true,
						},
					},
				},
				take: ATTACHMENTS_LIMIT,
			})

			attachments = messages.map(msg => {
				const fileRecord = msg.file
				const fileId = fileRecord?.id ?? msg.fileId ?? extractFileIdFromUrl(msg.fileUrl ?? undefined)
				const fileName = fileRecord?.filename ?? null
				const mimeType = fileRecord?.mimetype ?? null
				const size =
				typeof fileRecord?.size === 'number' ? fileRecord.size : null
				const downloadUrl = buildDownloadUrl(fileId, fileRecord?.url ?? msg.fileUrl ?? null)
				const isImage = isImageAttachment(mimeType, fileName)
				const thumbnailUrl = isImage ? downloadUrl : null

				return {
					messageId: msg.id,
					fileId,
					fileName,
					mimeType,
					size,
					downloadUrl,
					thumbnailUrl,
					createdAt: msg.createdAt,
					senderId: msg.senderId,
				}
			})
		}

		if (typeParam !== 'all') {
			attachments = attachments.filter(attachment => {
				const isImage = isImageAttachment(attachment.mimeType, attachment.fileName)
				return typeParam === 'image' ? isImage : !isImage
			})
		}

		// Финальная сортировка — по дате (новые сверху)
		attachments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

		return NextResponse.json({
			attachments: attachments.map(item => ({
				messageId: item.messageId,
				fileId: item.fileId,
				fileName: item.fileName,
				mimeType: item.mimeType,
				size: item.size,
				downloadUrl: item.downloadUrl,
				thumbnailUrl: item.thumbnailUrl,
				createdAt: item.createdAt,
				senderId: item.senderId,
			})),
		})
	} catch (error: any) {
		logger.error('Ошибка получения вложений чата', error, {
			chatId: id,
			userId: user?.id,
		})
		return NextResponse.json(
			{ error: 'Не удалось получить вложения', details: error?.message ?? String(error) },
			{ status: 500 }
		)
	}
}

