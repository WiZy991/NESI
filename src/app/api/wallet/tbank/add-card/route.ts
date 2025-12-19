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
			return NextResponse.json(
				{ error: 'Сервис привязки карт временно недоступен. Терминал не настроен.' },
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

		// Берем основной терминал и пароль
		const terminalKey = process.env.TBANK_TERMINAL_KEY || ''
		const password = process.env.TBANK_TERMINAL_PASSWORD || ''
		
		if (!terminalKey || !password) {
			return NextResponse.json(
				{ error: 'Терминал не настроен' },
				{ status: 503 }
			)
		}

		const client = new TBankClient(terminalKey, password)
		const customerKey = user.id

		// Шаг 1: Создаем/проверяем клиента в T-Bank
		const addCustomerResult = await client.addCustomer(
			customerKey,
			userData.email || undefined,
			undefined
		)

		// ErrorCode "0" - успех, "99" или "7" - клиент уже существует (это тоже ОК)
		const isCustomerExists = addCustomerResult.ErrorCode === '99' || addCustomerResult.ErrorCode === '7'
		
		if (!addCustomerResult.Success && !isCustomerExists) {
			logger.error('TBank AddCustomer failed', undefined, { errorCode: addCustomerResult.ErrorCode })
			return NextResponse.json(
				{ error: addCustomerResult.Message || 'Ошибка создания клиента в T-Bank' },
				{ status: 400 }
			)
		}

		// Шаг 2: Инициируем привязку карты
		const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.work'
		const notificationURL = `${appUrl}/api/wallet/tbank/add-card/callback`

		const addCardResult = await client.addCard({
			customerKey,
			checkType: 'NO',
			successURL: `${appUrl}/profile?cardAdded=success`,
			failURL: `${appUrl}/profile?cardAdded=fail`,
			notificationURL,
		})
		
		if (!addCardResult.Success) {
			const errorMsg = addCardResult.ErrorCode === '204' 
				? 'Неверный токен. Проверьте пароль в личном кабинете Т-Банка'
				: addCardResult.Message || 'Ошибка инициализации привязки карты'
			
			logger.error('TBank AddCard failed', undefined, { errorCode: addCardResult.ErrorCode })
			return NextResponse.json(
				{ error: errorMsg },
				{ status: 400 }
			)
		}

		if (!addCardResult.PaymentURL) {
			return NextResponse.json(
				{ error: 'T-Bank не вернул URL для привязки карты' },
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
