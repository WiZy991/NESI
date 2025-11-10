import prisma from '@/lib/prisma'

export type PollOption = {
	id: string
	postId: string
	text: string
	order: number
	votes: number
}

export type PollData = {
	options: PollOption[]
	totalVotes: number
	userVoteOptionId: string | null
}

function isMissingPollSchema(error: unknown) {
	if (!error || typeof error !== 'object') {
		return false
	}

	const message = 'message' in error ? String((error as { message?: unknown }).message) : ''
	const code = 'code' in error ? String((error as { code?: unknown }).code) : ''

	return (
		message.includes('CommunityPollOption') ||
		message.includes('CommunityPollVote') ||
		message.includes('no such table') ||
		message.includes('does not exist') ||
		code === 'P2010' ||
		code === 'P2016' ||
		code === 'P2021'
	)
}

async function loadPollOptions(postIds: string[]) {
	try {
		const pollOptionModel = (prisma as unknown as {
			communityPollOption?: {
				findMany: (args: {
					where: { postId: { in: string[] } }
					orderBy: { order: 'asc' }
					include: { _count: { select: { votes: true } } }
				}) => Promise<
					Array<{
						id: string
						postId: string
						text: string
						order: number
						_count?: { votes: number }
					}>
				>
			}
		}).communityPollOption

		if (!pollOptionModel?.findMany) {
			throw new Error('Polling models are not available on Prisma client')
		}

		const records = await pollOptionModel.findMany({
			where: { postId: { in: postIds } },
			orderBy: { order: 'asc' },
			include: {
				_count: { select: { votes: true } },
			},
		})

		return records.map<PollOption>(record => ({
			id: record.id,
			postId: record.postId,
			text: record.text,
			order: record.order,
			votes: record._count?.votes ?? 0,
		}))
	} catch (error) {
		if (!isMissingPollSchema(error)) {
			throw error
		}

		// Таблицы ещё не в схеме — возвращаем пустые данные
		return []
	}
}

async function loadUserVotes(postIds: string[], userId: string) {
	try {
		const pollVoteModel = (prisma as unknown as {
			communityPollVote?: {
				findMany: (args: {
					where: {
						userId: string
						option: { postId: { in: string[] } }
					}
					select: { optionId: true; option: { select: { postId: true } } }
				}) => Promise<
					Array<{
						optionId: string
						option: { postId: string }
					}>
				>
			}
		}).communityPollVote

		if (!pollVoteModel?.findMany) {
			throw new Error('Poll vote model is not available on Prisma client')
		}

		const votes = await pollVoteModel.findMany({
			where: {
				userId,
				option: {
					postId: { in: postIds },
				},
			},
			select: {
				optionId: true,
				option: { select: { postId: true } },
			},
		})

		return votes.map(vote => ({
			postId: vote.option.postId,
			optionId: vote.optionId,
		}))
	} catch (error) {
		if (!isMissingPollSchema(error)) {
			throw error
		}

		return []
	}
}

export async function fetchPollDataForPosts(postIds: string[], userId?: string | null) {
	if (!postIds.length) {
		return new Map<string, PollData>()
	}

	const pollDataMap = new Map<string, PollData>()

	const options = await loadPollOptions(postIds)

	const optionsByPost = new Map<string, PollOption[]>()
	for (const option of options) {
		const list = optionsByPost.get(option.postId) ?? []
		list.push(option)
		optionsByPost.set(option.postId, list)
	}

	const userVoteMap = new Map<string, string>()
	if (userId) {
		const votes = await loadUserVotes(postIds, userId)
		for (const vote of votes) {
			userVoteMap.set(vote.postId, vote.optionId)
		}
	}

	for (const postId of postIds) {
		const postOptions = optionsByPost.get(postId) ?? []
		const totalVotes = postOptions.reduce((sum, option) => sum + option.votes, 0)

		pollDataMap.set(postId, {
			options: postOptions,
			totalVotes,
			userVoteOptionId: userVoteMap.get(postId) ?? null,
		})
	}

	return pollDataMap
}

export async function fetchSinglePoll(postId: string, userId?: string | null) {
	const map = await fetchPollDataForPosts([postId], userId)
	return map.get(postId) ?? null
}

