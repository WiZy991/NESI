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
import { TBankClient } from '@/lib/tbank/client'
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
		// Проверяем конфигурацию терминала
		if (!TBANK_CONFIG.TERMINAL_KEY || !TBANK_CONFIG.TERMINAL_PASSWORD) {
			logger.error('TBank terminal not configured for AddCard', undefined, {
				hasTerminalKey: !!TBANK_CONFIG.TERMINAL_KEY,
				hasTerminalPassword: !!TBANK_CONFIG.TERMINAL_PASSWORD,
			})
			return NextResponse.json(
				{ error: 'Сервис привязки карт временно недоступен. Терминал не настроен.' },
				{ status: 503 }
			)
		}

		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		console.log('🔗 [ADD-CARD] Начало привязки карты:', {
			userId: user.id,
			terminalKey: TBANK_CONFIG.TERMINAL_KEY?.slice(0, 8) + '...',
		})

		// Получаем данные пользователя (email для AddCustomer)
		// Поле phone не существует в модели User
		const userData = await prisma.user.findUnique({
			where: { id: user.id },
			select: { email: true },
		})

		if (!userData) {
			return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
		}

		// ВАЖНО: Используем основной клиент (TBankClient), а не E2C клиент (TBankPayoutClient)
		// AddCard и AddCustomer - это методы интернет-эквайринга, не E2C
		const client = new TBankClient()

		// CustomerKey - уникальный идентификатор клиента в нашей системе
		// Используем id пользователя
		const customerKey = user.id

		// Шаг 1: Создаем/проверяем клиента в T-Bank
		// AddCustomer можно вызывать многократно - если клиент существует, возвращается успех
		logger.info('TBank AddCustomer: creating/checking customer', { 
			userId: user.id, 
			customerKey 
		})

		const addCustomerResult = await client.addCustomer(
			customerKey,
			userData.email || undefined,
			undefined // phone не используется
		)

		// ErrorCode "0" - успех, "99" - клиент уже существует (это тоже ОК)
		if (!addCustomerResult.Success && addCustomerResult.ErrorCode !== '99') {
			logger.error('TBank AddCustomer failed', undefined, {
				userId: user.id,
				errorCode: addCustomerResult.ErrorCode,
				message: addCustomerResult.Message,
			})
			return NextResponse.json(
				{ error: addCustomerResult.Message || 'Ошибка создания клиента в T-Bank' },
				{ status: 400 }
			)
		}

		// Шаг 2: Инициируем привязку карты
		// checkType: 3DS - проверка 3DS, возвращает RebillID для выплат
		const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.work'
		
		logger.info('TBank AddCard: initiating card binding', { 
			userId: user.id, 
			customerKey 
		})

		// Пробуем сначала без проверки (NO), если терминал не поддерживает 3DS
		// NO - без проверок, HOLD - списание 0 руб, 3DS - проверка 3DS
		const addCardResult = await client.addCard({
			customerKey,
			checkType: 'NO', // Без проверки - работает на большинстве терминалов
			successURL: `${appUrl}/profile?cardAdded=success`,
			failURL: `${appUrl}/profile?cardAdded=fail`,
		})
		
		console.log('📥 [ADD-CARD] Результат AddCard:', {
			success: addCardResult.Success,
			errorCode: addCardResult.ErrorCode,
			message: addCardResult.Message,
			hasPaymentURL: !!addCardResult.PaymentURL,
		})

		if (!addCardResult.Success) {
			logger.error('TBank AddCard failed', undefined, {
				userId: user.id,
				errorCode: addCardResult.ErrorCode,
				message: addCardResult.Message,
			})
			
			// Специальная обработка ошибки 204 - проблема с терминалом
			if (addCardResult.ErrorCode === '204') {
				return NextResponse.json(
					{ 
						error: 'Привязка карт временно недоступна',
						details: 'Терминал не настроен для привязки карт. Обратитесь в поддержку.',
					},
					{ status: 503 }
				)
			}
			
			return NextResponse.json(
				{ error: addCardResult.Message || 'Ошибка инициализации привязки карты' },
				{ status: 400 }
			)
		}

		if (!addCardResult.PaymentURL) {
			logger.error('TBank AddCard: no PaymentURL returned', undefined, {
				userId: user.id,
				response: JSON.stringify(addCardResult),
			})
			return NextResponse.json(
				{ error: 'T-Bank не вернул URL для привязки карты' },
				{ status: 500 }
			)
		}

		logger.info('TBank AddCard success', {
			userId: user.id,
			requestKey: addCardResult.RequestKey,
			paymentURL: addCardResult.PaymentURL,
		})

		return NextResponse.json({
			success: true,
			paymentURL: addCardResult.PaymentURL, // URL для редиректа на форму привязки
			requestKey: addCardResult.RequestKey, // Для проверки статуса (если нужно)
		})

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		const errorStack = error instanceof Error ? error.stack : undefined
		
		logger.error('Add card error', error instanceof Error ? error : undefined, {
			errorMessage,
			errorStack,
		})
		
		console.error('❌ [ADD-CARD] Ошибка:', {
			message: errorMessage,
			stack: errorStack,
		})
		
		// Возвращаем более информативную ошибку
		return NextResponse.json(
			{ 
				error: 'Ошибка при привязке карты',
				details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
			},
			{ status: 500 }
		)
	}
}

