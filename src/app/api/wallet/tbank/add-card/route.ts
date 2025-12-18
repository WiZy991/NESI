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
		// НО: если основной терминал не работает (ошибка 204), пробуем использовать E2C терминал
		// (возможно, у пользователя один терминал для всего, или основной терминал не настроен правильно)
		
		// ВАЖНО: Для AddCard нужен пароль от терминала A2C (согласно info.md)
		// Согласно документации, для привязки карт используется пароль от терминала A2C
		// Попробуем использовать основной терминал, но если не работает - используем E2C
		// (возможно, E2C терминал и есть A2C терминал для привязки карт)
		let terminalKey = TBANK_CONFIG.TERMINAL_KEY
		// Берем пароль напрямую из process.env для основного терминала
		let password = process.env.TBANK_TERMINAL_PASSWORD || TBANK_CONFIG.TERMINAL_PASSWORD
		let useE2CTerminal = false
		
		// Если основной терминал не настроен, используем E2C
		if (!terminalKey || !password) {
			terminalKey = TBANK_CONFIG.E2C_TERMINAL_KEY
			password = process.env.TBANK_E2C_TERMINAL_PASSWORD || TBANK_CONFIG.E2C_TERMINAL_PASSWORD
			useE2CTerminal = true
		}
		
		console.log('🔑 [ADD-CARD] Конфигурация для AddCard:', {
			terminalKey: terminalKey?.slice(0, 8) + '...',
			hasPassword: !!password,
			passwordLength: password?.length,
			passwordPreview: password ? password.substring(0, 8) + '...' : 'нет',
			useE2CTerminal,
			note: 'Для AddCard нужен пароль от терминала A2C (согласно info.md)',
		})
		
		if (!terminalKey || !password) {
			return NextResponse.json(
				{ 
					error: 'Терминал не настроен',
					details: 'Настройте TBANK_TERMINAL_KEY и TBANK_TERMINAL_PASSWORD',
				},
				{ status: 503 }
			)
		}

		// Диагностика конфигурации
		console.log('🔍 [ADD-CARD] Конфигурация терминала:', {
			hasTerminalKey: !!TBANK_CONFIG.TERMINAL_KEY,
			hasTerminalPassword: !!TBANK_CONFIG.TERMINAL_PASSWORD,
			hasE2CTerminalKey: !!TBANK_CONFIG.E2C_TERMINAL_KEY,
			hasE2CTerminalPassword: !!TBANK_CONFIG.E2C_TERMINAL_PASSWORD,
			useE2CTerminal,
			terminalKey: terminalKey?.slice(0, 8) + '...',
			passwordLength: password?.length,
			note: useE2CTerminal 
				? 'Используется E2C терминал (работает для выплат)' 
				: 'Используется основной терминал',
		})

		if (!terminalKey || !password) {
			return NextResponse.json(
				{ 
					error: 'Терминал не настроен',
					details: 'Настройте TBANK_TERMINAL_KEY и TBANK_TERMINAL_PASSWORD (или используйте E2C терминал)',
				},
				{ status: 503 }
			)
		}

		const client = new TBankClient(terminalKey, password)

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

		// ErrorCode "0" - успех, "99" или "7" - клиент уже существует (это тоже ОК)
		// Ошибка 7: "Неверный статус покупателя. Покупатель с таким ключом уже существует"
		// Это означает, что покупатель уже создан, можно продолжать привязку карты
		const isCustomerExists = addCustomerResult.ErrorCode === '99' || addCustomerResult.ErrorCode === '7'
		
		if (!addCustomerResult.Success && !isCustomerExists) {
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
		
		// Логируем, если покупатель уже существует (это нормально)
		if (isCustomerExists) {
			logger.info('TBank AddCustomer: customer already exists', {
				userId: user.id,
				errorCode: addCustomerResult.ErrorCode,
				message: addCustomerResult.Message,
			})
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
			
			// Специальная обработка ошибки 204 - неверный токен
			// Если использовался E2C терминал, пробуем основной терминал
			if (addCardResult.ErrorCode === '204' && useE2CTerminal && TBANK_CONFIG.TERMINAL_KEY && TBANK_CONFIG.TERMINAL_PASSWORD) {
				console.log('🔄 [ADD-CARD] E2C терминал не работает, пробуем основной терминал...')
				
				const mainClient = new TBankClient(TBANK_CONFIG.TERMINAL_KEY, TBANK_CONFIG.TERMINAL_PASSWORD)
				
				// Сначала создаем/проверяем клиента с основным терминалом
				const mainAddCustomerResult = await mainClient.addCustomer(
					customerKey,
					userData.email || undefined,
					undefined
				)
				
				const mainIsCustomerExists = mainAddCustomerResult.ErrorCode === '99' || mainAddCustomerResult.ErrorCode === '7'
				if (!mainAddCustomerResult.Success && !mainIsCustomerExists) {
					console.error('❌ [ADD-CARD] Основной AddCustomer failed:', mainAddCustomerResult)
				}
				
				// Пробуем AddCard с основным терминалом
				const mainAddCardResult = await mainClient.addCard({
					customerKey,
					checkType: 'NO',
					successURL: `${appUrl}/profile?cardAdded=success`,
					failURL: `${appUrl}/profile?cardAdded=fail`,
				})
				
				console.log('📥 [ADD-CARD] Результат AddCard с основным терминалом:', {
					success: mainAddCardResult.Success,
					errorCode: mainAddCardResult.ErrorCode,
					message: mainAddCardResult.Message,
					hasPaymentURL: !!mainAddCardResult.PaymentURL,
				})
				
				if (mainAddCardResult.Success && mainAddCardResult.PaymentURL) {
					logger.info('TBank AddCard success with main terminal', {
						userId: user.id,
						requestKey: mainAddCardResult.RequestKey,
						paymentURL: mainAddCardResult.PaymentURL,
					})
					
					return NextResponse.json({
						success: true,
						paymentURL: mainAddCardResult.PaymentURL,
						requestKey: mainAddCardResult.RequestKey,
					})
				}
			}
			
			// Если использовался основной терминал, пробуем E2C терминал
			if (addCardResult.ErrorCode === '204' && !useE2CTerminal && TBANK_CONFIG.E2C_TERMINAL_KEY && TBANK_CONFIG.E2C_TERMINAL_PASSWORD) {
				console.log('🔄 [ADD-CARD] Основной терминал не работает, пробуем E2C терминал...')
				
				const e2cClient = new TBankClient(TBANK_CONFIG.E2C_TERMINAL_KEY, TBANK_CONFIG.E2C_TERMINAL_PASSWORD)
				
				// Сначала создаем/проверяем клиента с E2C терминалом
				const e2cAddCustomerResult = await e2cClient.addCustomer(
					customerKey,
					userData.email || undefined,
					undefined
				)
				
				const e2cIsCustomerExists = e2cAddCustomerResult.ErrorCode === '99' || e2cAddCustomerResult.ErrorCode === '7'
				if (!e2cAddCustomerResult.Success && !e2cIsCustomerExists) {
					console.error('❌ [ADD-CARD] E2C AddCustomer failed:', e2cAddCustomerResult)
				}
				
				// Пробуем AddCard с E2C терминалом
				const e2cAddCardResult = await e2cClient.addCard({
					customerKey,
					checkType: 'NO',
					successURL: `${appUrl}/profile?cardAdded=success`,
					failURL: `${appUrl}/profile?cardAdded=fail`,
				})
				
				console.log('📥 [ADD-CARD] Результат AddCard с E2C терминалом:', {
					success: e2cAddCardResult.Success,
					errorCode: e2cAddCardResult.ErrorCode,
					message: e2cAddCardResult.Message,
					hasPaymentURL: !!e2cAddCardResult.PaymentURL,
				})
				
				if (e2cAddCardResult.Success && e2cAddCardResult.PaymentURL) {
					logger.info('TBank AddCard success with E2C terminal', {
						userId: user.id,
						requestKey: e2cAddCardResult.RequestKey,
						paymentURL: e2cAddCardResult.PaymentURL,
					})
					
					return NextResponse.json({
						success: true,
						paymentURL: e2cAddCardResult.PaymentURL,
						requestKey: e2cAddCardResult.RequestKey,
					})
				}
			}
			
			// Если E2C тоже не сработал или не был попробован, возвращаем ошибку
			if (addCardResult.ErrorCode === '204') {
				console.error('❌ [ADD-CARD] Ошибка 204 - неверный токен:', {
					terminalKey: useE2CTerminal ? TBANK_CONFIG.E2C_TERMINAL_KEY : TBANK_CONFIG.TERMINAL_KEY,
					hasPassword: !!password,
					passwordLength: password?.length,
					usedE2C: useE2CTerminal,
					message: 'Проверьте, что пароль соответствует терминалу',
				})
				
				return NextResponse.json(
					{ 
						error: 'Привязка карты временно недоступна',
						details: `❌ Для привязки карт требуется отдельный A2C терминал.\n\n` +
							`Проблема: Метод AddCard требует пароль от терминала A2C (согласно документации Т-Банка).\n\n` +
							`Текущая ситуация:\n` +
							`• Основной терминал ${TBANK_CONFIG.TERMINAL_KEY} - не является A2C терминалом для привязки карт\n` +
							`• E2C терминал ${TBANK_CONFIG.E2C_TERMINAL_KEY} - работает для выплат, но не для привязки карт\n\n` +
							`Решение:\n` +
							`1. Обратитесь в поддержку Т-Банка для получения отдельного A2C терминала для привязки карт\n` +
							`2. Или уточните, является ли ваш основной терминал A2C терминалом\n\n` +
							`Временное решение: Пользователи могут выводить деньги через СБП (это работает).`,
					},
					{ status: 400 }
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

