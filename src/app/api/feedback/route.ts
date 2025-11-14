import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateStringLength } from '@/lib/security'
import { rateLimit, rateLimitConfigs } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
	try {
		// Rate limiting для защиты от спама
		const feedbackRateLimit = rateLimit(rateLimitConfigs.api)
		const rateLimitResult = await feedbackRateLimit(request)

		if (!rateLimitResult.success) {
			return NextResponse.json(
				{ error: 'Слишком много запросов. Попробуйте позже.' },
				{
					status: 429,
					headers: {
						'Retry-After': Math.ceil(
							(rateLimitResult.resetTime - Date.now()) / 1000
						).toString(),
						'X-RateLimit-Limit': '60',
						'X-RateLimit-Remaining': '0',
						'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
					},
				}
			)
		}

		const body = await request.json()
		const { name, email, message, type } = body

		// Валидация
		if (!name || !message) {
			return NextResponse.json(
				{ error: 'Имя и сообщение обязательны' },
				{ status: 400 }
			)
		}

		// Валидация длины имени
		const nameValidation = validateStringLength(name.trim(), 100, 'Имя')
		if (!nameValidation.valid) {
			return NextResponse.json(
				{ error: nameValidation.error },
				{ status: 400 }
			)
		}

		// Валидация длины сообщения (максимум 5000 символов)
		const messageValidation = validateStringLength(message.trim(), 5000, 'Сообщение')
		if (!messageValidation.valid) {
			return NextResponse.json(
				{ error: messageValidation.error },
				{ status: 400 }
			)
		}

		// Валидация email если указан
		if (email && email.trim().length > 0) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			if (!emailRegex.test(email.trim())) {
				return NextResponse.json(
					{ error: 'Некорректный формат email' },
					{ status: 400 }
				)
			}
		}

		// Сохранение обратной связи
		const feedback = await prisma.feedback.create({
			data: {
				name: name.trim(),
				email: email?.trim() || null,
				message: message.trim(),
				type: type || 'general',
			},
		})

		logger.info('Обратная связь сохранена', { feedbackId: feedback.id, type })
		return NextResponse.json(
			{
				success: true,
				message: 'Обратная связь успешно отправлена',
				id: feedback.id,
			},
			{ status: 201 }
		)
	} catch (error) {
		logger.error('Ошибка при сохранении обратной связи', error)
		return NextResponse.json(
			{ error: 'Не удалось отправить обратную связь' },
			{ status: 500 }
		)
	}
}

