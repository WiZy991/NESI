import { getUserFromRequest } from '@/lib/auth'
import { getChatKey, updateChatActivity } from '@/lib/chatActivity'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationToUser } from '../notifications/stream/route'

type ChatType = 'private' | 'task'

type TypingState = {
	isTyping: boolean
	lastSent: number
	timeout?: NodeJS.Timeout
}

const TYPING_DEBOUNCE_MS = 800
const AUTO_STOP_MS = 5000

declare global {
	// eslint-disable-next-line no-var
	var __chatTypingStates: Map<string, TypingState> | undefined
}

function getTypingStatesMap() {
	if (!globalThis.__chatTypingStates) {
		globalThis.__chatTypingStates = new Map<string, TypingState>()
	}
	return globalThis.__chatTypingStates
}

function resolveChatIdentifiers(
	chatType: ChatType,
	params: {
		currentUserId: string
		recipientId: string
		rawChatId?: string
		taskId?: string | null
	}
) {
	if (chatType === 'private') {
		const broadcastChatId = `private_${params.currentUserId}`
		const normalizedChatId = getChatKey('private', {
			chatType: 'private',
			userA: params.currentUserId,
			userB: params.recipientId,
		})

		return { broadcastChatId, normalizedChatId }
	}

	const resolvedTaskId =
		(params.taskId && typeof params.taskId === 'string'
			? params.taskId
			: undefined) ??
		(params.rawChatId?.startsWith('task_')
			? params.rawChatId.slice('task_'.length)
			: params.rawChatId)

	if (!resolvedTaskId) {
		throw new Error('Не указан taskId для чатa задачи')
	}

	return {
		broadcastChatId: `task_${resolvedTaskId}`,
		normalizedChatId: getChatKey('task', { chatType: 'task', taskId: resolvedTaskId }),
	}
}

export async function POST(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const body = await req.json()
		const recipientId: string | undefined = body?.recipientId
		const rawChatType: string = body?.chatType || 'private'
		const chatType: ChatType = rawChatType === 'task' ? 'task' : 'private'
		const rawChatId: string | undefined = body?.chatId || undefined
		const taskId: string | undefined = body?.taskId || undefined
		const isTyping: boolean = Boolean(body?.isTyping)

		if (!recipientId) {
			return NextResponse.json(
				{ error: 'recipientId обязателен' },
				{ status: 400 }
			)
		}

		const { broadcastChatId, normalizedChatId } = resolveChatIdentifiers(chatType, {
			currentUserId: user.id,
			recipientId,
			rawChatId,
			taskId,
		})

		const typingStates = getTypingStatesMap()
		const typingKey = `${user.id}:${chatType}:${normalizedChatId}`
		const existingState = typingStates.get(typingKey)
		const now = Date.now()
		const senderName = user.fullName || user.email

		const stopTyping = async (
			reason: 'manual' | 'timeout',
			options: { forceBroadcast?: boolean } = {}
		) => {
			const current = typingStates.get(typingKey)
			const wasTyping = current?.isTyping ?? false

			if (current?.timeout) {
				clearTimeout(current.timeout)
			}

			typingStates.delete(typingKey)

			if (wasTyping || options.forceBroadcast) {
				console.log('⌨️ Событие остановки набора:', {
					senderId: user.id,
					recipientId,
					chatType,
					chatId: broadcastChatId,
					reason,
				})

				sendNotificationToUser(recipientId, {
					type: 'stoppedTyping',
					senderId: user.id,
					sender: senderName,
					chatType,
					chatId: broadcastChatId,
				})
			}

			await updateChatActivity({
				chatType,
				chatId: normalizedChatId,
				userId: user.id,
				typingAt: null,
				lastActivityAt: new Date(),
			})
		}

		if (isTyping) {
			const shouldBroadcast =
				!existingState?.isTyping ||
				now - (existingState?.lastSent ?? 0) >= TYPING_DEBOUNCE_MS

			if (shouldBroadcast) {
				sendNotificationToUser(recipientId, {
					type: 'typing',
					senderId: user.id,
					sender: senderName,
					chatType,
					chatId: broadcastChatId,
				})

				console.log('⌨️ Событие набора отправлено:', {
					senderId: user.id,
					recipientId,
					chatType,
					chatId: broadcastChatId,
				})
			} else {
				console.log('⌨️ Событие набора пропущено (дебаунс):', {
					senderId: user.id,
					recipientId,
					chatType,
					chatId: broadcastChatId,
				})
			}

			if (existingState?.timeout) {
				clearTimeout(existingState.timeout)
			}

			const timeout = setTimeout(() => {
				stopTyping('timeout').catch(error =>
					console.error('Ошибка auto-stop typing:', error)
				)
			}, AUTO_STOP_MS)

			typingStates.set(typingKey, {
				isTyping: true,
				lastSent: shouldBroadcast ? now : existingState?.lastSent ?? now,
				timeout,
			})

			await updateChatActivity({
				chatType,
				chatId: normalizedChatId,
				userId: user.id,
				lastActivityAt: new Date(),
				typingAt: new Date(),
			})
		} else {
			await stopTyping('manual', { forceBroadcast: false })
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Ошибка отправки события набора:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
