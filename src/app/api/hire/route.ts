// src/app/api/hire/route.ts
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { NextRequest, NextResponse } from 'next/server'

// Динамический импорт для избежания проблем при импорте модуля
let sendNotificationToUser:
	| ((userId: string, notification: any) => boolean)
	| null = null

// Функция для безопасной отправки уведомлений
async function safeSendNotification(userId: string, notification: any) {
	try {
		if (!sendNotificationToUser) {
			const module = await import('@/app/api/notifications/stream/route')
			sendNotificationToUser = module.sendNotificationToUser
		}
		return sendNotificationToUser(userId, notification)
	} catch (error) {
		logger.warn('Не удалось импортировать или вызвать sendNotificationToUser', {
			error,
		})
		return false
	}
}

const HIRE_COST = 390

export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		try {
			if (user.role === 'executor') {
				// Входящие запросы для исполнителя
				const incoming = await prisma.hireRequest.findMany({
					where: { executorId: user.id },
					select: {
						id: true,
						createdAt: true,
						paid: true,
						status: true,
						message: true,
						amount: true,
						customer: {
							select: {
								id: true,
								fullName: true,
								email: true,
								avatarUrl: true,
								location: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
				})
				return NextResponse.json(incoming, { status: 200 })
			} else if (user.role === 'customer') {
				// Отправленные запросы для заказчика
				const sent = await prisma.hireRequest.findMany({
					where: { customerId: user.id },
					select: {
						id: true,
						createdAt: true,
						paid: true,
						status: true,
						message: true,
						amount: true,
						executor: {
							select: {
								id: true,
								fullName: true,
								email: true,
								avatarUrl: true,
								location: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
				})
				return NextResponse.json(sent, { status: 200 })
			} else {
				return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
			}
		} catch (e: any) {
			logger.error('Ошибка /api/hire GET (inner)', e)

			const isSchemaError =
				e?.name === 'DatabaseSchemaError' ||
				e?.code === 'P2021' ||
				e?.message?.includes('does not exist')

			const isConnectionError =
				e?.name === 'DatabaseConnectionError' ||
				e?.code === 'P1017' ||
				e?.code === 'P1001'

			if (isSchemaError || isConnectionError) {
				return NextResponse.json(
					{ error: 'Ошибка базы данных. Пожалуйста, попробуйте позже.' },
					{ status: 503 }
				)
			}

			return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
		}
	} catch (err: any) {
		logger.error('Ошибка /api/hire GET (outer)', err)

		const isSchemaError =
			err?.name === 'DatabaseSchemaError' ||
			err?.code === 'P2021' ||
			err?.message?.includes('does not exist')

		const isConnectionError =
			err?.name === 'DatabaseConnectionError' ||
			err?.code === 'P1017' ||
			err?.code === 'P1001'

		if (isSchemaError || isConnectionError) {
			return NextResponse.json(
				{ error: 'Ошибка базы данных. Пожалуйста, попробуйте позже.' },
				{ status: 503 }
			)
		}

		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		logger.debug('POST /api/hire: начало обработки запроса')
		const me = await getUserFromRequest(req)
		if (!me) {
			logger.warn('Пользователь не найден по токену в /api/hire')
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}
		logger.debug('Пользователь авторизован', { userId: me.id, role: me.role })

		if (me.role !== 'customer') {
			logger.warn('Роль не customer в /api/hire', {
				role: me.role,
				userId: me.id,
			})
			return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
		}

		let body
		try {
			body = await req.json()
			logger.debug('Тело запроса получено', {
				executorId: body?.executorId,
				messageLength: body?.message?.length,
			})
		} catch (e) {
			logger.error('Ошибка парсинга JSON в /api/hire', e)
			return NextResponse.json(
				{ error: 'Неверный формат данных' },
				{ status: 400 }
			)
		}

		// Валидация с использованием Zod
		const { validateWithZod } = await import('@/lib/validations')
		const { validateStringLength } = await import('@/lib/security')
		const { z } = await import('zod')

		const hireSchema = z.object({
			executorId: z.string().min(1, 'ID исполнителя обязателен'),
			message: z
				.string()
				.min(1, 'Сопроводительное письмо обязательно')
				.max(
					2000,
					'Сопроводительное письмо слишком длинное (максимум 2000 символов)'
				)
				.trim(),
		})

		const validation = validateWithZod(hireSchema, body)
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.errors.join(', ') },
				{ status: 400 }
			)
		}

		const { executorId, message } = validation.data

		// Дополнительная валидация длины сообщения
		const messageValidation = validateStringLength(
			message,
			2000,
			'Сопроводительное письмо'
		)
		if (!messageValidation.valid) {
			return NextResponse.json(
				{ error: messageValidation.error },
				{ status: 400 }
			)
		}

		if (executorId === me.id) {
			return NextResponse.json(
				{ error: 'Нельзя нанять самого себя' },
				{ status: 400 }
			)
		}

		// Проверяем баланс заказчика
		logger.debug('Проверка баланса заказчика', { userId: me.id })
		let customer
		try {
			customer = await prisma.user.findUnique({
				where: { id: me.id },
				select: { balance: true, fullName: true, email: true },
			})
			logger.debug('Баланс заказчика получен', {
				userId: me.id,
				balance: customer?.balance,
			})
		} catch (dbError: any) {
			logger.error('Ошибка при получении данных заказчика', dbError, {
				userId: me.id,
			})
			throw dbError
		}

		if (!customer) {
			return NextResponse.json(
				{ error: 'Пользователь не найден' },
				{ status: 404 }
			)
		}

		const customerBalance = new Decimal(customer.balance)
		const hireCost = new Decimal(HIRE_COST)

		if (customerBalance.lessThan(hireCost)) {
			return NextResponse.json(
				{
					error: 'Недостаточно средств на балансе',
					required: HIRE_COST,
					balance: customerBalance.toNumber(),
				},
				{ status: 400 }
			)
		}

		// Проверяем, что исполнитель существует
		logger.debug('Проверка исполнителя', { executorId, customerId: me.id })
		let executor
		try {
			executor = await prisma.user.findUnique({
				where: { id: executorId },
				select: { id: true, role: true, fullName: true, email: true },
			})
		} catch (dbError: any) {
			logger.error('Ошибка при получении данных исполнителя', dbError, {
				executorId,
			})
			throw dbError
		}

		if (!executor || executor.role !== 'executor') {
			return NextResponse.json(
				{ error: 'Исполнитель не найден' },
				{ status: 404 }
			)
		}

		// Проверяем существующий запрос
		logger.debug('Проверка существующего запроса найма', {
			customerId: me.id,
			executorId,
		})
		let existing
		try {
			existing = await prisma.hireRequest.findFirst({
				where: {
					customerId: me.id,
					executorId,
					status: { in: ['pending', 'accepted'] },
				},
				select: { id: true, status: true, createdAt: true },
			})
		} catch (dbError: any) {
			logger.error('Ошибка при проверке существующего запроса', dbError, {
				customerId: me.id,
				executorId,
			})
			// Если таблица не существует, это будет обработано в общем catch
			throw dbError
		}

		if (existing) {
			return NextResponse.json(
				{
					ok: true,
					already: true,
					hireId: existing.id,
					status: existing.status,
					message:
						existing.status === 'accepted'
							? 'Запрос уже принят'
							: 'Запрос уже отправлен',
				},
				{ status: 409 }
			)
		}

		// Находим владельца платформы через PLATFORM_OWNER_ID из переменных окружения
		logger.debug('Поиск владельца платформы')
		let platformOwner
		try {
			const platformOwnerId = process.env.PLATFORM_OWNER_ID

			if (platformOwnerId) {
				// Используем ID из переменных окружения
				platformOwner = await prisma.user.findUnique({
					where: { id: platformOwnerId },
					select: { id: true },
				})

				if (!platformOwner) {
					logger.error(
						'Пользователь с PLATFORM_OWNER_ID не найден в базе данных',
						{ platformOwnerId }
					)
					return NextResponse.json(
						{ error: 'Ошибка конфигурации платформы' },
						{ status: 500 }
					)
				}
			} else {
				// Fallback: ищем первого админа, если PLATFORM_OWNER_ID не настроен
				logger.warn('PLATFORM_OWNER_ID не настроен, используем первого админа')
				platformOwner = await prisma.user.findFirst({
					where: { role: 'admin' },
					select: { id: true },
					orderBy: { createdAt: 'asc' },
				})

				if (!platformOwner) {
					logger.error('Админ не найден в базе данных')
					return NextResponse.json(
						{ error: 'Ошибка конфигурации платформы' },
						{ status: 500 }
					)
				}
			}
		} catch (dbError: any) {
			logger.error('Ошибка при поиске владельца платформы', dbError)
			throw dbError
		}

		// Транзакция: создаём запрос, списываем средства, отправляем владельцу
		logger.debug('Начало транзакции найма', { customerId: me.id, executorId })
		
		// КРИТИЧНО: Находим DealId из последней транзакции пополнения заказчика через Т-Банк
		// Это нужно для того, чтобы владелец платформы мог вывести комиссию через Т-Банк
		let customerDealId: string | null = null
		try {
			const customerDepositTx = await prisma.transaction.findFirst({
				where: {
					userId: me.id,
					type: 'deposit',
					dealId: { not: null },
					paymentId: { not: null }, // Только транзакции Т-Банка
				},
				orderBy: { createdAt: 'desc' },
				select: { dealId: true },
			})
			
			if (customerDepositTx?.dealId) {
				customerDealId = String(customerDepositTx.dealId)
				logger.debug('Найден DealId заказчика для комиссии', { 
					customerId: me.id, 
					dealId: customerDealId 
				})
			} else {
				logger.warn('DealId заказчика не найден - комиссия не будет привязана к сделке', {
					customerId: me.id,
				})
			}
		} catch (dealError) {
			logger.warn('Ошибка при поиске DealId заказчика', { error: dealError })
		}
		
		let hire
		try {
			hire = await prisma.$transaction(async tx => {
				// 1. Создаём запрос на найм
				const hireRequest = await tx.hireRequest.create({
					data: {
						customerId: me.id,
						executorId,
						message,
						amount: hireCost,
						paid: true,
						status: 'pending',
					},
				})

				// 2. Списываем средства с заказчика
				await tx.user.update({
					where: { id: me.id },
					data: {
						balance: {
							decrement: hireCost,
						},
					},
				})

				// 3. Добавляем средства владельцу платформы
				await tx.user.update({
					where: { id: platformOwner.id },
					data: {
						balance: {
							increment: hireCost,
						},
					},
				})

				// 4. Создаём транзакцию для заказчика
				await tx.transaction.create({
					data: {
						userId: me.id,
						amount: hireCost,
						type: 'expense',
						reason: `Оплата запроса найма исполнителя`,
						status: 'completed',
						// Сохраняем DealId для отслеживания
						...(customerDealId ? { dealId: customerDealId } : {}),
					},
				})

				// 5. Создаём транзакцию для владельца платформы (тип commission для отображения в админ панели)
				// КРИТИЧНО: Сохраняем DealId заказчика, чтобы владелец платформы мог вывести комиссию через Т-Банк
				await tx.transaction.create({
					data: {
						userId: platformOwner.id,
						amount: hireCost,
						type: 'commission',
						reason: `Оплата найма исполнителя (390₽)`,
						status: 'completed',
						// DealId заказчика - позволяет выводить комиссию через ту же сделку Т-Банка
						...(customerDealId ? { dealId: customerDealId } : {}),
					},
				})

				return hireRequest
			})
			logger.info('Транзакция найма завершена', {
				hireId: hire.id,
				customerId: me.id,
				executorId,
			})
		} catch (txError: any) {
			logger.error('Ошибка в транзакции найма', txError, {
				name: txError?.name,
				message: txError?.message,
				code: txError?.code,
				meta: txError?.meta,
			})
			throw txError
		}

		// Создаём приватное сообщение исполнителю
		logger.debug('Создание приватного сообщения для найма', {
			customerId: me.id,
			executorId,
		})
		try {
			await prisma.privateMessage.create({
				data: {
					senderId: me.id,
					recipientId: executorId,
					content: `Здравствуйте! Я хочу пригласить вас к сотрудничеству.\n\n${message}`,
				},
			})
			logger.debug('Приватное сообщение создано')
		} catch (msgError: any) {
			logger.warn(
				'Ошибка при создании приватного сообщения (не критично)',
				msgError
			)
			// Это не критично, продолжаем
		}

		// Создаём уведомление исполнителю
		logger.debug('Создание уведомления в БД для найма', { executorId })
		try {
			await prisma.notification.create({
				data: {
					userId: executorId,
					type: 'hire_request',
					message: `Заказчик ${
						customer.fullName || customer.email
					} хочет нанять вас. Проверьте чат!`,
					link: `/chats?open=${me.id}`,
				},
			})
			logger.debug('Уведомление создано')
		} catch (notifError: any) {
			logger.warn('Ошибка при создании уведомления (не критично)', notifError)
			// Это не критично, продолжаем
		}

		// Отправляем уведомление в реальном времени
		logger.debug('Отправка уведомления через SSE для найма', { executorId })
		await safeSendNotification(executorId, {
			type: 'hire',
			title: 'Запрос найма',
			message: `Заказчик ${
				customer.fullName || customer.email
			} хочет нанять вас`,
			link: `/chats?open=${me.id}`,
			senderId: me.id,
			sender: customer.fullName || customer.email,
			playSound: true,
		})

		logger.info('Запрос найма успешно создан', {
			hireId: hire.id,
			customerId: me.id,
			executorId,
		})
		return NextResponse.json(
			{ ok: true, already: false, hireId: hire.id, status: hire.status },
			{ status: 201 }
		)
	} catch (err: any) {
		logger.error('Ошибка /api/hire POST', err, {
			name: err?.name,
			message: err?.message,
			code: err?.code,
			meta: err?.meta,
		})

		// Проверяем, является ли это ошибкой схемы БД
		const isSchemaError =
			err?.name === 'DatabaseSchemaError' ||
			err?.code === 'P2021' ||
			err?.message?.includes('does not exist')

		const isConnectionError =
			err?.name === 'DatabaseConnectionError' ||
			err?.code === 'P1017' ||
			err?.code === 'P1001'

		if (isSchemaError) {
			return NextResponse.json(
				{
					error:
						'Ошибка схемы базы данных. Пожалуйста, обратитесь к администратору.',
				},
				{ status: 503 }
			)
		}

		if (isConnectionError) {
			return NextResponse.json(
				{
					error:
						'Ошибка подключения к базе данных. Пожалуйста, попробуйте позже.',
				},
				{ status: 503 }
			)
		}

		// Для других ошибок возвращаем общее сообщение
		return NextResponse.json(
			{
				error: 'Ошибка сервера',
				details:
					process.env.NODE_ENV === 'development' ? err?.message : undefined,
				stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
			},
			{ status: 500 }
		)
	}
}
