// src/app/api/hire/route.ts
import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

const HIRE_COST = 1990

export async function POST(req: NextRequest) {
	try {
		const me = await getUserFromRequest(req)
		if (!me) {
			console.warn('/api/hire: пользователь не найден по токену')
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		if (me.role !== 'customer') {
			console.warn(`/api/hire: роль не customer (role=${me.role})`)
			return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
		}

		const body = await req.json().catch(() => null)
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
		const customer = await prisma.user.findUnique({
			where: { id: me.id },
			select: { balance: true, fullName: true, email: true },
		})

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
		const executor = await prisma.user.findUnique({
			where: { id: executorId },
			select: { id: true, role: true, fullName: true, email: true },
		})

		if (!executor || executor.role !== 'executor') {
			return NextResponse.json(
				{ error: 'Исполнитель не найден' },
				{ status: 404 }
			)
		}

		// Проверяем существующий запрос
		const existing = await prisma.hireRequest.findFirst({
			where: {
				customerId: me.id,
				executorId,
				status: { in: ['pending', 'accepted'] },
			},
			select: { id: true, status: true, createdAt: true },
		})

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

		// Находим владельца платформы (админ)
		const platformOwner = await prisma.user.findFirst({
			where: { role: 'admin' },
			select: { id: true },
			orderBy: { createdAt: 'asc' },
		})

		if (!platformOwner) {
			console.error('Не найден владелец платформы (admin)')
			return NextResponse.json({ error: 'Системная ошибка' }, { status: 500 })
		}

		// Транзакция: создаём запрос, списываем средства, отправляем владельцу
		const hire = await prisma.$transaction(async (tx) => {
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

		// Создаём приватное сообщение исполнителю
		await prisma.privateMessage.create({
			data: {
				senderId: me.id,
				recipientId: executorId,
				content: `Здравствуйте! Я хочу пригласить вас к сотрудничеству.\n\n${message}`,
			},
		})

		// Создаём уведомление исполнителю
		await prisma.notification.create({
			data: {
				userId: executorId,
				type: 'hire_request',
				message: `Заказчик ${customer.fullName || customer.email} хочет нанять вас. Проверьте чат!`,
				link: `/chats?open=${me.id}`,
			},
		})

		// Отправляем уведомление в реальном времени
		sendNotificationToUser(executorId, {
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
	} catch (err) {
		console.error('Ошибка /api/hire:', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
