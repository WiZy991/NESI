import { GET } from '@/app/api/tasks/recommendations/route'
import { getUserFromRequest } from '@/lib/auth'
import { getTaskRecommendations } from '@/lib/taskReco'

jest.mock('@/lib/auth', () => ({
	getUserFromRequest: jest.fn(),
}))

jest.mock('@/lib/taskReco', () => ({
	getTaskRecommendations: jest.fn(),
}))

const mockedGetUser = getUserFromRequest as jest.Mock
const mockedGetRecommendations = getTaskRecommendations as jest.Mock

const mockUser = { id: 'user-1' }

describe('GET /api/tasks/recommendations', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	const buildRequest = (url: string) =>
		new Request(url, {
			headers: {
				Authorization: 'Bearer token',
			},
		})

	it('возвращает 401, если пользователь не авторизован', async () => {
		mockedGetUser.mockResolvedValueOnce(null)

		const res = await GET(buildRequest('http://localhost/api/tasks/recommendations'))
		expect(res.status).toBe(401)
	})

	it('возвращает рекомендации и прокидывает limit', async () => {
		mockedGetUser.mockResolvedValueOnce(mockUser)
		mockedGetRecommendations.mockResolvedValueOnce([
			{
				task: {
					id: 'task-1',
					title: 'Task',
					description: 'Desc',
					createdAt: new Date().toISOString(),
					price: 1000,
					status: 'open',
					customer: { id: 'cust', fullName: 'Customer' },
					subcategory: null,
					responseCount: 0,
					favoritesCount: 0,
				},
				score: 12.3,
				reasons: ['reason'],
				tags: ['skill_match'],
				meta: { isFavorite: false, lowResponses: true },
			},
		])

		const res = await GET(
			buildRequest('http://localhost/api/tasks/recommendations?limit=4')
		)
		const payload = await res.json()

		expect(res.status).toBe(200)
		expect(mockedGetRecommendations).toHaveBeenCalledWith('user-1', {
			limit: 4,
			refresh: false,
		})
		expect(Array.isArray(payload.recommendations)).toBe(true)
		expect(payload.recommendations).toHaveLength(1)
	})

	it('передаёт параметр refresh', async () => {
		mockedGetUser.mockResolvedValueOnce(mockUser)
		mockedGetRecommendations.mockResolvedValueOnce([])

		await GET(
			buildRequest('http://localhost/api/tasks/recommendations?refresh=true')
		)

		expect(mockedGetRecommendations).toHaveBeenCalledWith('user-1', {
			limit: undefined,
			refresh: true,
		})
	})

	it('обрабатывает ошибки сервиса', async () => {
		mockedGetUser.mockResolvedValueOnce(mockUser)
		mockedGetRecommendations.mockRejectedValueOnce(new Error('boom'))

		const res = await GET(buildRequest('http://localhost/api/tasks/recommendations'))
		expect(res.status).toBe(500)
	})
})

