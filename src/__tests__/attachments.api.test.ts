import { GET } from '@/app/api/chats/[id]/attachments/route'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: {
		privateMessage: {
			findMany: jest.fn(),
		},
		message: {
			findMany: jest.fn(),
		},
		task: {
			findUnique: jest.fn(),
		},
	},
}))

jest.mock('@/lib/auth', () => ({
	getUserFromRequest: jest.fn(),
}))

const mockedPrisma = prisma as jest.Mocked<typeof prisma>
const mockedGetUser = getUserFromRequest as jest.Mock

const mockUser = { id: 'me', role: 'user' }

beforeEach(() => {
	jest.clearAllMocks()
	mockedGetUser.mockResolvedValue(mockUser)
})

describe('GET /api/chats/[id]/attachments', () => {
	const buildRequest = (url: string, headers: HeadersInit = {}) =>
		({
			url,
			headers: new Headers(headers),
		} as unknown as Request)

	const buildContext = (id: string) => ({
		params: Promise.resolve({ id }),
	})

	it('возвращает 401 без авторизации', async () => {
		mockedGetUser.mockResolvedValueOnce(null)

		const response = await GET(
			buildRequest('http://localhost/api/chats/private_other/attachments'),
			buildContext('private_other')
		)

		expect(response.status).toBe(401)
	})

	it('возвращает вложения приватного чата и корректно формирует ссылку', async () => {
		mockedPrisma.privateMessage.findMany.mockResolvedValueOnce([
			{
				id: 'msg-image',
				senderId: 'other',
				recipientId: 'me',
				content: 'image',
				fileId: 'file-img',
				fileName: 'pic.png',
				fileUrl: null,
				mimeType: 'image/png',
				size: 1234,
				createdAt: new Date('2025-02-01T10:00:00Z'),
				file: {
					id: 'file-img',
					filename: 'pic.png',
					mimetype: 'image/png',
					size: 1234,
					url: null,
				},
			},
			{
				id: 'msg-doc',
				senderId: 'me',
				recipientId: 'other',
				content: 'doc',
				fileId: null,
				fileName: 'invoice.pdf',
				fileUrl: '/api/files/doc-id',
				mimeType: 'application/pdf',
				size: 555,
				createdAt: new Date('2025-02-01T11:00:00Z'),
				file: null,
			},
		] as any)

		const response = await GET(
			buildRequest('http://localhost/api/chats/private_other/attachments?type=all'),
			buildContext('private_other')
		)

		expect(mockedPrisma.privateMessage.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					AND: expect.arrayContaining([
						expect.objectContaining({
							OR: expect.arrayContaining([
								expect.objectContaining({ senderId: 'me', recipientId: 'other' }),
								expect.objectContaining({ senderId: 'other', recipientId: 'me' }),
							]),
						}),
					]),
				}),
			})
		)

		const payload = await response.json()
		expect(response.status).toBe(200)
		expect(payload.attachments).toHaveLength(2)
		expect(payload.attachments[0]).toMatchObject({
			messageId: 'msg-doc',
			fileName: 'invoice.pdf',
			mimeType: 'application/pdf',
			downloadUrl: '/api/files/doc-id',
			thumbnailUrl: null,
		})
		expect(payload.attachments[1]).toMatchObject({
			messageId: 'msg-image',
			fileName: 'pic.png',
			mimeType: 'image/png',
			downloadUrl: '/api/files/file-img',
			thumbnailUrl: '/api/files/file-img',
		})
	})

	it('фильтрует вложения по типу "doc"', async () => {
		mockedPrisma.privateMessage.findMany.mockResolvedValueOnce([
			{
				id: 'msg-image',
				senderId: 'other',
				recipientId: 'me',
				fileId: 'file-img',
				fileName: 'pic.png',
				fileUrl: null,
				mimeType: 'image/png',
				size: 1234,
				createdAt: new Date('2025-02-01T10:00:00Z'),
				file: null,
			},
			{
				id: 'msg-doc',
				senderId: 'me',
				recipientId: 'other',
				fileId: null,
				fileName: 'invoice.pdf',
				fileUrl: '/api/files/doc-id',
				mimeType: 'application/pdf',
				size: 555,
				createdAt: new Date('2025-02-01T11:00:00Z'),
				file: null,
			},
		] as any)

		const response = await GET(
			buildRequest('http://localhost/api/chats/private_other/attachments?type=doc'),
			buildContext('private_other')
		)

		const payload = await response.json()
		expect(response.status).toBe(200)
		expect(payload.attachments).toHaveLength(1)
		expect(payload.attachments[0].mimeType).toBe('application/pdf')
	})
})

