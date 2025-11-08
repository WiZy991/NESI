import prisma from '@/lib/prisma'

export type ChatType = 'private' | 'task'

export function getPrivateChatKey(userA: string, userB: string) {
	const [first, second] = [userA, userB].sort()
	return `${first}:${second}`
}

export function getTaskChatKey(taskId: string) {
	return taskId
}

export function getChatKey(
	chatType: ChatType,
	options:
		| { chatType: 'private'; userA: string; userB: string }
		| { chatType: 'task'; taskId: string }
) {
	if (chatType === 'private') {
		const { userA, userB } = options as { chatType: 'private'; userA: string; userB: string }
		return getPrivateChatKey(userA, userB)
	}

	const { taskId } = options as { chatType: 'task'; taskId: string }
	return getTaskChatKey(taskId)
}

type NullableDate = Date | null | undefined

type UpdateChatActivityOptions = {
	chatType: ChatType
	chatId: string
	userId: string
	lastReadAt?: NullableDate
	lastActivityAt?: NullableDate
	typingAt?: NullableDate
}

export async function updateChatActivity({
	chatType,
	chatId,
	userId,
	lastReadAt,
	lastActivityAt,
	typingAt,
}: UpdateChatActivityOptions) {
	const data: Record<string, Date | null | undefined> = {}

	if (lastReadAt !== undefined) {
		data.lastReadAt = lastReadAt ?? null
	}

	if (lastActivityAt !== undefined) {
		data.lastActivityAt = lastActivityAt ?? null
	}

	if (typingAt !== undefined) {
		data.typingAt = typingAt ?? null
	}

	if (Object.keys(data).length === 0) {
		return
	}

	await prisma.chatActivity.upsert({
		where: {
			chatType_chatId_userId: {
				chatType,
				chatId,
				userId,
			},
		},
		create: {
			chatType,
			chatId,
			userId,
			...(data as any),
		},
		update: data,
	})
}

