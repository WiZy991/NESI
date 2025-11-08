import { Prisma } from '@prisma/client'
import prisma from './prisma'
import {
	cacheKeys,
	cacheTTL,
	setCachedData,
	withCache,
} from './cache'

type RecommendationTag =
	| 'skill_match'
	| 'subcategory_match'
	| 'fresh'
	| 'low_responses'
	| 'favorite_match'

export type TaskRecommendation = {
	task: {
		id: string
		title: string
		description: string | null
		createdAt: string
		price: number | null
		status: string
		customer: { id: string; fullName?: string | null } | null
		subcategory: {
			id: string
			name: string
			category: { id: string; name: string } | null
		} | null
		responseCount: number
		favoritesCount: number
	}
	score: number
	reasons: string[]
	tags: RecommendationTag[]
	meta: {
		isFavorite: boolean
		lowResponses: boolean
	}
}

type TaskRecommendationOptions = {
	limit?: number
	refresh?: boolean
}

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 12
const MIN_LIMIT = 1
const CANDIDATE_POOL_MULTIPLIER = 6

const DEFAULT_TTL = cacheTTL.taskRecommendations ?? 2 * 60 * 1000

type CandidateTask = Prisma.TaskGetPayload<{
	select: {
		id: true
		title: true
		description: true
		price: true
		status: true
		createdAt: true
		subcategoryId: true
		customer: { select: { id: true; fullName: true } }
		subcategory: {
			select: {
				id: true
				name: true
				category: { select: { id: true; name: true } }
			}
		}
		_count: { select: { responses: true; favorites: true } }
		favorites: { select: { userId: true } }
	}
}>

const WORD_SPLIT_REGEX = /[^a-zа-яё0-9+#]+/i

export async function getTaskRecommendations(
	userId: string,
	options: TaskRecommendationOptions = {}
): Promise<TaskRecommendation[]> {
	const limit = clamp(
		options.limit ?? DEFAULT_LIMIT,
		MIN_LIMIT,
		MAX_LIMIT
	)

	const cacheKey = cacheKeys.taskRecommendations
		? cacheKeys.taskRecommendations(userId, limit)
		: `task-reco:${userId}:${limit}`

	const fetcher = () => buildRecommendations(userId, limit)

	if (options.refresh) {
		const data = await fetcher()
		setCachedData(cacheKey, data, DEFAULT_TTL)
		return data
	}

	return withCache(cacheKey, fetcher, DEFAULT_TTL)
}

async function buildRecommendations(
	userId: string,
	limit: number
): Promise<TaskRecommendation[]> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			skills: true,
			favoriteTasks: {
				select: {
					taskId: true,
					task: {
						select: {
							id: true,
							title: true,
							description: true,
							subcategoryId: true,
						},
					},
				},
			},
			responses: {
				select: {
					taskId: true,
					task: {
						select: {
							id: true,
							title: true,
							description: true,
							subcategoryId: true,
						},
					},
				},
			},
			executedTasks: {
				select: {
					id: true,
					title: true,
					description: true,
					subcategoryId: true,
				},
				orderBy: { createdAt: 'desc' },
				take: 50,
			},
		},
	})

	if (!user) {
		return []
	}

	const {
		skills,
		favoriteTasks,
		responses,
		executedTasks,
	} = user

	const normalizedSkills = (skills || [])
		.map(skill => skill.trim().toLowerCase())
		.filter(Boolean)

	const hasSignals =
		normalizedSkills.length > 0 ||
		(favoriteTasks?.length ?? 0) > 0 ||
		(responses?.length ?? 0) > 0 ||
		(executedTasks?.length ?? 0) > 0

	if (!hasSignals) {
		return []
	}

	const preferenceBySubcategory = new Map<string, number>()
	const keywordWeights = new Map<string, number>()
	const respondedTaskIds = new Set<string>()
	const excludedTaskIds = new Set<string>()

	const addSubcategoryPreference = (
		subcategoryId: string | null | undefined,
		weight: number
	) => {
		if (!subcategoryId) return
		const current = preferenceBySubcategory.get(subcategoryId) ?? 0
		preferenceBySubcategory.set(subcategoryId, current + weight)
	}

	const addKeywords = (text: string | null | undefined, weight: number) => {
		if (!text) return
		text
			.toLowerCase()
			.split(WORD_SPLIT_REGEX)
			.forEach(word => {
				const token = word.trim()
				if (token.length < 4) return
				const current = keywordWeights.get(token) ?? 0
				keywordWeights.set(token, current + weight)
			})
	}

	for (const fav of favoriteTasks || []) {
		addSubcategoryPreference(fav.task?.subcategoryId, 2.5)
		addKeywords(fav.task?.title, 1.5)
		addKeywords(fav.task?.description, 1)
	}

	for (const resp of responses || []) {
		respondedTaskIds.add(resp.taskId)
		excludedTaskIds.add(resp.taskId)
		addSubcategoryPreference(resp.task?.subcategoryId, 1.5)
		addKeywords(resp.task?.title, 1.2)
		addKeywords(resp.task?.description, 0.8)
	}

	for (const task of executedTasks || []) {
		excludedTaskIds.add(task.id)
		addSubcategoryPreference(task.subcategoryId, 1)
		addKeywords(task.title, 1)
		addKeywords(task.description, 0.5)
	}

	const frequentKeywords = new Set(
		Array.from(keywordWeights.entries())
			.filter(([, weight]) => weight >= 2)
			.map(([word]) => word)
	)

	const candidateLimit = Math.max(
		limit * CANDIDATE_POOL_MULTIPLIER,
		40
	)

	const candidateTasks = (await prisma.task.findMany({
		where: {
			status: 'open',
			customerId: { not: userId },
			executorId: null,
			NOT: {
				id: { in: Array.from(excludedTaskIds) },
			},
		},
		orderBy: { createdAt: 'desc' },
		take: candidateLimit,
		select: {
			id: true,
			title: true,
			description: true,
			price: true,
			status: true,
			createdAt: true,
			subcategoryId: true,
			customer: { select: { id: true, fullName: true } },
			subcategory: {
				select: {
					id: true,
					name: true,
					category: { select: { id: true, name: true } },
				},
			},
			_count: { select: { responses: true, favorites: true } },
			favorites: {
				select: { userId: true },
				where: { userId },
				take: 1,
			},
		},
	})) as CandidateTask[]

	const now = Date.now()

	const evaluated = candidateTasks.map(task =>
		evaluateTask(
			task,
			normalizedSkills,
			preferenceBySubcategory,
			frequentKeywords,
			now
		)
	)

	const sorted = evaluated
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)

	return sorted.map(item => ({
		task: {
			id: item.task.id,
			title: item.task.title,
			description: item.task.description,
			createdAt: item.task.createdAt.toISOString(),
			price: item.task.price ? Number(item.task.price) : null,
			status: item.task.status,
			customer: item.task.customer
				? {
						id: item.task.customer.id,
						fullName: item.task.customer.fullName,
				  }
				: null,
			subcategory: item.task.subcategory
				? {
						id: item.task.subcategory.id,
						name: item.task.subcategory.name,
						category: item.task.subcategory.category
							? {
									id: item.task.subcategory.category.id,
									name: item.task.subcategory.category.name,
							  }
							: null,
				  }
				: null,
			responseCount: item.task._count.responses,
			favoritesCount: item.task._count.favorites,
		},
		score: Number(item.score.toFixed(1)),
		reasons: item.reasons.slice(0, 4),
		tags: item.tags,
		meta: {
			isFavorite: item.isFavorite,
			lowResponses: item.lowResponses,
		},
	}))
}

function evaluateTask(
	task: CandidateTask,
	skills: string[],
	preferenceBySubcategory: Map<string, number>,
	keywords: Set<string>,
	now: number
) {
	const reasons: string[] = []
	const tags = new Set<RecommendationTag>()
	let score = 0

	const text = `${task.title} ${task.description ?? ''}`.toLowerCase()

	const matchedSkills = skills.filter(skill =>
		skill && text.includes(skill)
	)
	if (matchedSkills.length > 0) {
		score += 18 + (matchedSkills.length - 1) * 4
		tags.add('skill_match')
		reasons.push(
			`Совпадение с навыками: ${matchedSkills
				.slice(0, 3)
				.map(capitalize)
				.join(', ')}`
		)
	}

	const subPref = preferenceBySubcategory.get(
		task.subcategoryId ?? ''
	)
	if (subPref && subPref > 0) {
		score += 15 + subPref * 5
		tags.add('subcategory_match')
		if (task.subcategory?.name) {
			reasons.push(
				`Вы часто выбираете подкатегорию «${task.subcategory.name}»`
			)
		} else {
			reasons.push('Похоже на ваши любимые тематики')
		}
	}

	const keywordHits = Array.from(keywords).filter(word =>
		text.includes(word)
	)
	if (keywordHits.length > 0) {
		score += 8
		tags.add('favorite_match')
		reasons.push(
			`Похоже на задачи из вашего опыта: ${keywordHits
				.slice(0, 3)
				.map(capitalize)
				.join(', ')}`
		)
	}

	const ageHours =
		(now - task.createdAt.getTime()) / (1000 * 60 * 60)

	if (ageHours <= 12) {
		score += 12
		tags.add('fresh')
		reasons.push('Совсем новая задача (менее 12 часов)')
	} else if (ageHours <= 24) {
		score += 8
		tags.add('fresh')
		reasons.push('Новая задача (менее суток)')
	} else if (ageHours <= 72) {
		score += 4
	}

	const lowResponses = task._count.responses <= 2
	if (lowResponses) {
		score += 10
		tags.add('low_responses')
		reasons.push('Мало откликов — шанс получить задачу выше')
	} else if (task._count.responses <= 5) {
		score += 4
		reasons.push('Откликов пока немного')
	}

	if (task._count.favorites >= 5) {
		score += Math.min(6, task._count.favorites)
		reasons.push('Популярная задача среди исполнителей')
	}

	if (task.price) {
		const priceNumber = Number(task.price)
		if (!Number.isNaN(priceNumber)) {
			score += Math.min(priceNumber / 2000, 8)
		}
	}

	const isFavorite = task.favorites.length > 0
	if (isFavorite) {
		score += 3
		tags.add('favorite_match')
		reasons.push('Вы уже добавили задачу в избранное')
	}

	return {
		task,
		score,
		reasons: Array.from(new Set(reasons)),
		tags: Array.from(tags),
		isFavorite,
		lowResponses,
	}
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}

function capitalize(value: string) {
	if (!value) return value
	return value.charAt(0).toUpperCase() + value.slice(1)
}

