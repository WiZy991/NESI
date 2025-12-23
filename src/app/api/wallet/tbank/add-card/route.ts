/**
 * API для привязки карты через T-Bank
 * 
 * Документация: метод AddCard (oplata_multisplit.md, раздел 5.4)
 * 
 * Процесс:
 * 1. Создаем клиента в T-Bank (AddCustomer) если его нет
 * 2. Инициируем привязку карты (AddCard)
 * 3. Возвращаем URL для перенаправления пользователя на форму привязки
 * 4. После успешной привязки T-Bank отправит нотификацию на Notification URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { TBankPayoutClient } from '@/lib/tbank/client'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { TBANK_CONFIG } from '@/lib/tbank/config'

/**
 * POST /api/wallet/tbank/add-card
 * 
 * Инициирует привязку карты для пользователя
 * Возвращает URL для перенаправления на форму привязки карты T-Bank
 */
export async function POST(req: NextRequest) {
	try {
		// Проверяем конфигурацию E2C терминала (для выплат)
		if (!TBANK_CONFIG.E2C_TERMINAL_KEY || !TBANK_CONFIG.E2C_TERMINAL_PASSWORD) {
			return NextResponse.json(
				{ error: 'Сервис привязки карт временно недоступен' },
				{ status: 503 }
			)
		}

		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Получаем данные пользователя (email для AddCustomer)
		const userData = await prisma.user.findUnique({
			where: { id: user.id },
			select: { email: true },
		})

		if (!userData) {
			return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
		}

		// Берем E2C терминал и пароль (для выплат)
		const terminalKey = process.env.TBANK_E2C_TERMINAL_KEY || ''
		const password = process.env.TBANK_E2C_TERMINAL_PASSWORD || ''
		
		if (!terminalKey || !password) {
			return NextResponse.json(
				{ error: 'Сервис привязки карт временно недоступен' },
				{ status: 503 }
			)
		}

		const client = new TBankPayoutClient(terminalKey, password)
		const customerKey = user.id

		// Шаг 1: Создаем/проверяем клиента в T-Bank E2C
		// Согласно документации: ошибка 7 "Неверный статус покупателя" означает, что клиент уже существует
		// Ошибка 99 также означает, что клиент уже существует
		const addCustomerResult = await client.addCustomer(
			customerKey,
			userData.email || undefined,
			undefined
		)

		// ErrorCode "0" - успех
		// ErrorCode "7" - "Неверный статус покупателя" (клиент уже существует, но в неправильном статусе)
		// ErrorCode "99" - клиент уже существует
		// Все эти случаи означают, что клиент существует, можно продолжать
		const isCustomerExists = 
			addCustomerResult.ErrorCode === '99' || 
			addCustomerResult.ErrorCode === '7' ||
			(addCustomerResult.Success && addCustomerResult.ErrorCode === '0')
		
		if (!addCustomerResult.Success && !isCustomerExists) {
			logger.error('TBank E2C AddCustomer failed', undefined, { 
				errorCode: addCustomerResult.ErrorCode,
				message: addCustomerResult.Message,
				details: addCustomerResult.Details,
				customerKey,
			})
			return NextResponse.json(
				{ error: 'Ошибка при привязке карты. Попробуйте позже' },
				{ status: 400 }
			)
		}

		// Логируем результат AddCustomer для отладки
		if (isCustomerExists) {
			logger.info('TBank E2C Customer exists or created', {
				customerKey,
				errorCode: addCustomerResult.ErrorCode,
				message: addCustomerResult.Message,
			})
		}

		// Шаг 2: Инициируем привязку карты через E2C
		// Убираем кастомные URL, используем настройки терминала, и ставим HOLD (чаще принимается)
		logger.info('TBank E2C AddCard request', {
			customerKey,
			checkType: 'HOLD',
			note: 'SuccessURL/FailURL/NotificationURL не передаем — используем настройки терминала',
		})

		const addCardResult = await client.addCard({
			customerKey,
			checkType: 'HOLD',
		})
		
		if (!addCardResult.Success) {
			logger.error('TBank E2C AddCard failed', undefined, { 
				errorCode: addCardResult.ErrorCode,
				message: addCardResult.Message,
				details: addCardResult.Details,
				customerKey,
				// Логируем полный ответ для отладки
				fullResponse: addCardResult,
			})
			
			// Более детальное сообщение об ошибке для пользователя
			let errorMessage = 'Сервис привязки карт временно недоступен. Попробуйте позже'
			if (addCardResult.ErrorCode === '322') {
				errorMessage = 'Ошибка при привязке карты. Возможно, клиент в неправильном статусе. Обратитесь в поддержку.'
			} else if (addCardResult.Message) {
				errorMessage = `Ошибка: ${addCardResult.Message}`
			}
			
			return NextResponse.json(
				{ error: errorMessage },
				{ status: 400 }
			)
		}

		if (!addCardResult.PaymentURL) {
			return NextResponse.json(
				{ error: 'Сервис привязки карт временно недоступен' },
				{ status: 500 }
			)
		}

		return NextResponse.json({
			success: true,
			paymentURL: addCardResult.PaymentURL,
			requestKey: addCardResult.RequestKey,
		})

	} catch (error) {
		logger.error('Add card error', error instanceof Error ? error : undefined)
		return NextResponse.json(
			{ error: 'Ошибка при привязке карты' },
			{ status: 500 }
		)
	}
}
