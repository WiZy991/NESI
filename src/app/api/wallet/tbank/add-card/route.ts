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

		// ВАЖНО: Согласно ответу поддержки Т-Банка:
		// - Терминал для оплат: 1763372956356
		// - Терминал для выплат: 1763372956356E2C
		// - Пароли у обоих терминалов ОДИНАКОВЫЕ
		// - Для AddCard нужно использовать терминал для оплат (основной терминал)
		// - AddCard - это метод интернет-эквайринга, не E2C
		
		// Берем основной терминал и пароль НАПРЯМУЮ из process.env
		let terminalKey = process.env.TBANK_TERMINAL_KEY || ''
		let rawPassword = process.env.TBANK_TERMINAL_PASSWORD || ''
		
		// Если основной терминал не настроен, но есть E2C - используем E2C терминал
		// (но пароль должен быть тот же, что и для основного)
		if (!terminalKey && process.env.TBANK_E2C_TERMINAL_KEY) {
			terminalKey = process.env.TBANK_E2C_TERMINAL_KEY
			// Пароль берем из основного, если есть, иначе из E2C
			rawPassword = rawPassword || process.env.TBANK_E2C_TERMINAL_PASSWORD || ''
		}
		
		// Пробуем декодировать пароль, если он URL-encoded
		// Пароль может содержать % как часть URL-encoding (например, %25 для %)
		let password = rawPassword
		try {
			// Если пароль содержит %, пробуем декодировать
			if (rawPassword && rawPassword.includes('%')) {
				const decoded = decodeURIComponent(rawPassword)
				// Если декодирование изменило пароль - используем декодированный
				if (decoded !== rawPassword) {
					password = decoded
					console.log('🔐 [ADD-CARD] Пароль был URL-decoded:', {
						originalLength: rawPassword.length,
						decodedLength: password.length,
						originalPreview: rawPassword.substring(0, 12) + '...',
						decodedPreview: password.substring(0, 12) + '...',
					})
				} else {
					console.log('🔐 [ADD-CARD] Пароль содержит %, но не является URL-encoded, используем как есть')
				}
			}
		} catch (e) {
			// Если декодирование не удалось - используем пароль как есть
			console.log('🔐 [ADD-CARD] Пароль не был URL-encoded, используем как есть')
		}
		
		if (!terminalKey || !password) {
			return NextResponse.json(
				{ 
					error: 'Терминал не настроен',
					details: 'Настройте TBANK_TERMINAL_KEY и TBANK_TERMINAL_PASSWORD. Пароли для обоих терминалов одинаковые.',
				},
				{ status: 503 }
			)
		}
		
		const useE2CTerminal = terminalKey.includes('E2C')
		
		console.log('🔑 [ADD-CARD] Конфигурация для AddCard:', {
			terminalKey: terminalKey?.slice(0, 8) + '...',
			hasPassword: !!password,
			passwordLength: password?.length,
			passwordPreview: password ? password.substring(0, 8) + '...' : 'нет',
			useE2CTerminal,
			note: 'Для AddCard используем основной терминал (для оплат). Пароли для обоих терминалов одинаковые (согласно поддержке Т-Банка).',
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
		
		// ВАЖНО: NotificationURL обязателен для получения уведомлений о привязке карты
		// Т-Банк отправит POST-запрос на этот URL после успешной привязки карты
		const notificationURL = `${appUrl}/api/wallet/tbank/add-card/callback`
		
		logger.info('TBank AddCard: initiating card binding', { 
			userId: user.id, 
			customerKey,
			notificationURL,
		})

		// Пробуем сначала без проверки (NO), если терминал не поддерживает 3DS
		// NO - без проверок, HOLD - списание 0 руб, 3DS - проверка 3DS
		const addCardResult = await client.addCard({
			customerKey,
			checkType: 'NO', // Без проверки - работает на большинстве терминалов
			successURL: `${appUrl}/profile?cardAdded=success`,
			failURL: `${appUrl}/profile?cardAdded=fail`,
			notificationURL, // URL для получения уведомлений о привязке карты
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
				usedTerminal: terminalKey,
			})
			
			// Специальная обработка ошибки 204 - неверный токен
			// Если декодированный пароль не сработал, пробуем с недекодированным
			if (addCardResult.ErrorCode === '204' && rawPassword !== password) {
				console.log('🔄 [ADD-CARD] Основной терминал с декодированным паролем не сработал, пробуем с недекодированным паролем...')
				
				const mainClientRaw = new TBankClient(terminalKey, rawPassword)
				
				// Пробуем AddCard с недекодированным паролем
				const mainAddCardResultRaw = await mainClientRaw.addCard({
					customerKey,
					checkType: 'NO',
					successURL: `${appUrl}/profile?cardAdded=success`,
					failURL: `${appUrl}/profile?cardAdded=fail`,
					notificationURL: `${appUrl}/api/wallet/tbank/add-card/callback`,
				})
				
				console.log('📥 [ADD-CARD] Результат AddCard с основным терминалом (недекодированный пароль):', {
					success: mainAddCardResultRaw.Success,
					errorCode: mainAddCardResultRaw.ErrorCode,
					message: mainAddCardResultRaw.Message,
					hasPaymentURL: !!mainAddCardResultRaw.PaymentURL,
				})
				
				if (mainAddCardResultRaw.Success && mainAddCardResultRaw.PaymentURL) {
					logger.info('TBank AddCard success with main terminal (raw password)', {
						userId: user.id,
						requestKey: mainAddCardResultRaw.RequestKey,
						paymentURL: mainAddCardResultRaw.PaymentURL,
					})
					
					return NextResponse.json({
						success: true,
						paymentURL: mainAddCardResultRaw.PaymentURL,
						requestKey: mainAddCardResultRaw.RequestKey,
					})
				}
			}
			
			// Согласно поддержке Т-Банка, пароли одинаковые, но если не работает основной терминал,
			// пробуем E2C терминал с тем же паролем
			if (addCardResult.ErrorCode === '204' && !useE2CTerminal && process.env.TBANK_E2C_TERMINAL_KEY) {
				console.log('🔄 [ADD-CARD] Основной терминал вернул ошибку 204, пробуем E2C терминал с тем же паролем...')
				
				const e2cTerminalKey = process.env.TBANK_E2C_TERMINAL_KEY
				// Пароль тот же самый (согласно поддержке Т-Банка)
				// Используем тот же декодированный пароль
				const e2cClient = new TBankClient(e2cTerminalKey, password)
				
				// Сначала пробуем с декодированным паролем
				// Сначала создаем/проверяем клиента
				const e2cAddCustomerResult = await e2cClient.addCustomer(
					customerKey,
					userData.email || undefined,
					undefined
				)
				
				const e2cIsCustomerExists = e2cAddCustomerResult.ErrorCode === '99' || e2cAddCustomerResult.ErrorCode === '7'
				if (!e2cAddCustomerResult.Success && !e2cIsCustomerExists) {
					console.error('❌ [ADD-CARD] E2C AddCustomer failed:', e2cAddCustomerResult)
				}
				
				// Пробуем AddCard с E2C терминалом и декодированным паролем
				const e2cAddCardResult = await e2cClient.addCard({
					customerKey,
					checkType: 'NO',
					successURL: `${appUrl}/profile?cardAdded=success`,
					failURL: `${appUrl}/profile?cardAdded=fail`,
					notificationURL: `${appUrl}/api/wallet/tbank/add-card/callback`,
				})
				
				console.log('📥 [ADD-CARD] Результат AddCard с E2C терминалом (декодированный пароль):', {
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
				
				// Если декодированный пароль не сработал, пробуем с НЕдекодированным паролем
				if (e2cAddCardResult.ErrorCode === '204' && rawPassword !== password) {
					console.log('🔄 [ADD-CARD] E2C терминал с декодированным паролем не сработал, пробуем с недекодированным паролем...')
					
					const e2cClientRaw = new TBankClient(e2cTerminalKey, rawPassword)
					
					// Пробуем AddCard с недекодированным паролем
					const e2cAddCardResultRaw = await e2cClientRaw.addCard({
						customerKey,
						checkType: 'NO',
						successURL: `${appUrl}/profile?cardAdded=success`,
						failURL: `${appUrl}/profile?cardAdded=fail`,
						notificationURL: `${appUrl}/api/wallet/tbank/add-card/callback`,
					})
					
					console.log('📥 [ADD-CARD] Результат AddCard с E2C терминалом (недекодированный пароль):', {
						success: e2cAddCardResultRaw.Success,
						errorCode: e2cAddCardResultRaw.ErrorCode,
						message: e2cAddCardResultRaw.Message,
						hasPaymentURL: !!e2cAddCardResultRaw.PaymentURL,
					})
					
					if (e2cAddCardResultRaw.Success && e2cAddCardResultRaw.PaymentURL) {
						logger.info('TBank AddCard success with E2C terminal (raw password)', {
							userId: user.id,
							requestKey: e2cAddCardResultRaw.RequestKey,
							paymentURL: e2cAddCardResultRaw.PaymentURL,
						})
						
						return NextResponse.json({
							success: true,
							paymentURL: e2cAddCardResultRaw.PaymentURL,
							requestKey: e2cAddCardResultRaw.RequestKey,
						})
					}
				}
			}
			
			// Если ошибка 204 и ничего не помогло
			if (addCardResult.ErrorCode === '204') {
				console.error('❌ [ADD-CARD] Ошибка 204 - неверный токен:', {
					terminalKey: terminalKey?.slice(0, 8) + '...',
					hasPassword: !!password,
					passwordLength: password?.length,
					passwordPreview: password ? password.substring(0, 8) + '...' : 'нет',
					message: 'Проверьте, что пароль правильный. Согласно поддержке Т-Банка, пароли для обоих терминалов одинаковые.',
				})
				
				return NextResponse.json(
					{ 
						error: 'Привязка карты временно недоступна',
						details: `❌ Ошибка 204: Неверный токен.\n\n` +
							`Проблема: Т-Банк вернул ошибку "Неверный токен. Проверьте пару TerminalKey/SecretKey".\n\n` +
							`Использовано:\n` +
							`• Терминал: ${terminalKey?.slice(0, 8)}...\n` +
							`• Пароль: ${password ? 'установлен (' + password.length + ' символов)' : 'не установлен'}\n\n` +
							`Согласно поддержке Т-Банка:\n` +
							`• Терминал для оплат: 1763372956356\n` +
							`• Терминал для выплат: 1763372956356E2C\n` +
							`• Пароли для обоих терминалов ОДИНАКОВЫЕ\n` +
							`• Для AddCard нужно использовать терминал для оплат\n\n` +
							`Решение:\n` +
							`1. Проверьте, что TBANK_TERMINAL_PASSWORD правильный (пароль одинаковый для обоих терминалов)\n` +
							`2. Убедитесь, что пароль не URL-encoded (если содержит %, используйте как есть)\n` +
							`3. Если проблема сохраняется, обратитесь в поддержку Т-Банка (acq_help@tbank.ru)\n\n` +
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

