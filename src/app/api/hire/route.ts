// src/app/api/hire/route.ts
import { getUserFromRequest, hashPassword } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

// Динамический импорт для избежания проблем при импорте модуля
let sendNotificationToUser: ((userId: string, notification: any) => boolean) | null = null

// Функция для безопасной отправки уведомлений
async function safeSendNotification(userId: string, notification: any) {
	try {
		if (!sendNotificationToUser) {
			const module = await import('@/app/api/notifications/stream/route')
			sendNotificationToUser = module.sendNotificationToUser
		}
		return sendNotificationToUser(userId, notification)
	} catch (error) {
		console.warn('⚠️ Не удалось импортировать или вызвать sendNotificationToUser:', error)
		return false
	}
}

const HIRE_COST = 1990

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
							select: { id: true, fullName: true, email: true, avatarUrl: true, location: true },
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
							select: { id: true, fullName: true, email: true, avatarUrl: true, location: true },
						},
					},
					orderBy: { createdAt: 'desc' },
				})
				return NextResponse.json(sent, { status: 200 })
			} else {
				return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
			}
		} catch (e: any) {
			console.error('❌ /api/hire GET error (inner):', e)
			
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
		console.error('❌ Ошибка /api/hire GET (outer):', err)
		
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
		console.log('📥 POST /api/hire: начало обработки запроса')
		const me = await getUserFromRequest(req)
		if (!me) {
			console.warn('/api/hire: пользователь не найден по токену')
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}
		console.log('✅ Пользователь авторизован:', me.id, me.role)

		if (me.role !== 'customer') {
			console.warn(`/api/hire: роль не customer (role=${me.role})`)
			return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
		}

		let body
		try {
			body = await req.json()
			console.log('✅ Тело запроса получено:', { executorId: body?.executorId, messageLength: body?.message?.length })
		} catch (e) {
			console.error('❌ Ошибка парсинга JSON:', e)
			body = null
		}
		const executorId = body?.executorId as string | undefined
		const message = body?.message as string | undefined

		if (!executorId) {
			return NextResponse.json(
				{ error: 'Не передан executorId' },
				{ status: 400 }
			)
		}

		if (!message || message.trim().length === 0) {
			return NextResponse.json(
				{ error: 'Сопроводительное письмо обязательно' },
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
		console.log('💳 Проверка баланса заказчика:', me.id)
		let customer
		try {
			customer = await prisma.user.findUnique({
				where: { id: me.id },
				select: { balance: true, fullName: true, email: true },
			})
			console.log('✅ Баланс заказчика:', customer?.balance)
		} catch (dbError: any) {
			console.error('❌ Ошибка при получении данных заказчика:', dbError)
			throw dbError
		}

		if (!customer) {
			return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
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
		console.log('👤 Проверка исполнителя:', executorId)
		let executor
		try {
			executor = await prisma.user.findUnique({
				where: { id: executorId },
				select: { id: true, role: true, fullName: true, email: true },
			})
		} catch (dbError: any) {
			console.error('❌ Ошибка при получении данных исполнителя:', dbError)
			throw dbError
		}

		if (!executor || executor.role !== 'executor') {
			return NextResponse.json(
				{ error: 'Исполнитель не найден' },
				{ status: 404 }
			)
		}

		// Проверяем существующий запрос
		console.log('🔍 Проверка существующего запроса найма')
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
			console.error('❌ Ошибка при проверке существующего запроса:', dbError)
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

		// Находим владельца платформы (админ) или создаём его
		console.log('👑 Поиск владельца платформы (admin)')
		let platformOwner
		try {
			platformOwner = await prisma.user.findFirst({
				where: { role: 'admin' },
				select: { id: true },
				orderBy: { createdAt: 'asc' },
			})
			
			// Если админа нет, создаём его автоматически
			if (!platformOwner) {
				console.log('⚠️ Админ не найден, создаём системного администратора')
				// Создаём хеш пароля для системного аккаунта (пароль не будет использоваться)
				const systemPassword = await hashPassword(`system_admin_${Date.now()}_${Math.random()}`)
				platformOwner = await prisma.user.create({
					data: {
						email: 'admin@nesi.platform',
						fullName: 'Системный администратор',
						role: 'admin',
						verified: true,
						balance: 0,
						password: systemPassword,
					},
					select: { id: true },
				})
				console.log('✅ Системный администратор создан:', platformOwner.id)
			}
		} catch (dbError: any) {
			console.error('❌ Ошибка при поиске/создании владельца платформы:', dbError)
			throw dbError
		}

		// Транзакция: создаём запрос, списываем средства, отправляем владельцу
		console.log('💰 Начало транзакции найма')
		let hire
		try {
			hire = await prisma.$transaction(async (tx) => {
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

				// 4. Создаём транзакцию
				await tx.transaction.create({
					data: {
						userId: me.id,
						amount: hireCost,
						type: 'expense',
						reason: `Оплата запроса найма исполнителя`,
						status: 'completed',
					},
				})

				// 5. Создаём транзакцию для владельца
				await tx.transaction.create({
					data: {
						userId: platformOwner.id,
						amount: hireCost,
						type: 'income',
						reason: `Оплата найма исполнителя`,
						status: 'completed',
					},
				})

				return hireRequest
			})
			console.log('✅ Транзакция завершена, hireId:', hire.id)
		} catch (txError: any) {
			console.error('❌ Ошибка в транзакции найма:', txError)
			console.error('❌ Детали ошибки транзакции:', {
				name: txError?.name,
				message: txError?.message,
				code: txError?.code,
				meta: txError?.meta,
			})
			throw txError
		}

		// Создаём приватное сообщение исполнителю
		console.log('💬 Создание приватного сообщения')
		try {
			await prisma.privateMessage.create({
				data: {
					senderId: me.id,
					recipientId: executorId,
					content: `Здравствуйте! Я хочу пригласить вас к сотрудничеству.\n\n${message}`,
				},
			})
			console.log('✅ Приватное сообщение создано')
		} catch (msgError: any) {
			console.error('❌ Ошибка при создании приватного сообщения:', msgError)
			// Это не критично, продолжаем
		}

		// Создаём уведомление исполнителю
		console.log('🔔 Создание уведомления в БД')
		try {
			await prisma.notification.create({
				data: {
					userId: executorId,
					type: 'hire_request',
					message: `Заказчик ${customer.fullName || customer.email} хочет нанять вас. Проверьте чат!`,
					link: `/chats?open=${me.id}`,
				},
			})
			console.log('✅ Уведомление создано')
		} catch (notifError: any) {
			console.error('❌ Ошибка при создании уведомления:', notifError)
			// Это не критично, продолжаем
		}

		// Отправляем уведомление в реальном времени
		console.log('📤 Отправка уведомления через SSE')
		await safeSendNotification(executorId, {
			type: 'hire',
			title: 'Запрос найма',
			message: `Заказчик ${customer.fullName || customer.email} хочет нанять вас`,
			link: `/chats?open=${me.id}`,
			senderId: me.id,
			sender: customer.fullName || customer.email,
			playSound: true,
		})

		return NextResponse.json(
			{ ok: true, already: false, hireId: hire.id, status: hire.status },
			{ status: 201 }
		)
	} catch (err: any) {
		console.error('❌ Ошибка /api/hire POST:', err)
		console.error('❌ Stack trace:', err?.stack)
		console.error('❌ Error details:', {
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
				{ error: 'Ошибка схемы базы данных. Пожалуйста, обратитесь к администратору.' },
				{ status: 503 }
			)
		}
		
		if (isConnectionError) {
			return NextResponse.json(
				{ error: 'Ошибка подключения к базе данных. Пожалуйста, попробуйте позже.' },
				{ status: 503 }
			)
		}
		
		// Для других ошибок возвращаем общее сообщение
		return NextResponse.json(
			{ 
				error: 'Ошибка сервера', 
				details: process.env.NODE_ENV === 'development' ? err?.message : undefined,
				stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
			},
			{ status: 500 }
		)
	}
}
