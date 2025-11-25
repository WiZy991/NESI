import { logActivity, validateWithdrawal } from '@/lib/antifraud'
import { getUserFromRequest } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
	formatMoney,
	hasEnoughBalance,
	isPositiveAmount,
	parseUserInput,
	toNumber,
} from '@/lib/money'
import prisma from '@/lib/prisma'
import { confirmWithdrawal, createWithdrawal } from '@/lib/tbank'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Обработка OPTIONS запроса для CORS
 */
export async function OPTIONS(req: NextRequest) {
	return new NextResponse(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	})
}

/**
 * API для создания выплаты (вывода средств) через Т-Банк
 */
export async function POST(req: NextRequest) {
	try {
		// Логируем метод запроса для отладки
		console.log('📥 [CREATE-WITHDRAWAL] Запрос:', {
			method: req.method,
			url: req.url,
		})

		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { amount, cardId, phone, sbpMemberId, dealId, cardNumber, cardExpiry, cardCvv, cardHolderName, paymentRecipientId } = await req.json()

		// Парсим и валидируем сумму
		const parsedAmount = parseUserInput(amount)
		if (!parsedAmount || !isPositiveAmount(parsedAmount)) {
			return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
		}

		const amountNumber = toNumber(parsedAmount)

		// Минимальная сумма вывода - 1 рубль
		if (amountNumber < 1) {
			return NextResponse.json(
				{ error: 'Минимальная сумма вывода: 1 ₽' },
				{ status: 400 }
			)
		}

		// 🛡️ Anti-fraud проверки перед выводом
		const validationResult = await validateWithdrawal(user.id, amountNumber)

		if (!validationResult.allowed) {
			await logActivity(user.id, 'withdraw_blocked', req, {
				amount: amountNumber,
				reason: validationResult.error,
			})

			return NextResponse.json(
				{ error: validationResult.error },
				{ status: 400 }
			)
		}

		// Проверка баланса
		const fresh = await prisma.user.findUnique({
			where: { id: user.id },
			select: { balance: true, frozenBalance: true },
		})

		if (
			!fresh ||
			!hasEnoughBalance(fresh.balance, fresh.frozenBalance, parsedAmount)
		) {
			const available = fresh
				? toNumber(fresh.balance) - toNumber(fresh.frozenBalance)
				: 0
			return NextResponse.json(
				{
					error: 'Недостаточно средств',
					details: `Доступно: ${formatMoney(
						available
					)}, требуется: ${formatMoney(parsedAmount)}`,
				},
				{ status: 400 }
			)
		}

		// Проверяем наличие способа выплаты
		// Для карты: cardId ИЛИ (cardNumber + cardExpiry + cardCvv + cardHolderName)
		// Для СБП: phone + sbpMemberId
		const hasCardId = !!cardId
		const hasCardData = !!(cardNumber && cardExpiry && cardCvv && cardHolderName)
		const hasSbpData = !!(phone && sbpMemberId)
		
		if (!hasCardId && !hasCardData && !hasSbpData) {
			return NextResponse.json(
				{
					error:
						'Не указан способ выплаты. Укажите:\n' +
						'• Для карты: cardId или данные карты (номер, срок, CVV, имя)\n' +
						'• Для СБП: phone и sbpMemberId',
				},
				{ status: 400 }
			)
		}

		// Создаем уникальный ID заказа
		const orderId = `withdraw_${user.id}_${Date.now()}`

		// Для выплат в рамках мультирасчетов DealId ОБЯЗАТЕЛЕН
		// Используем последний DealId из транзакций пополнения
		let finalDealId = dealId

		if (!finalDealId) {
			// Шаг 1: Ищем последнюю транзакцию пополнения с DealId и PaymentId (Т-Банк)
			const lastDepositTx = await prisma.transaction.findFirst({
				where: {
					userId: user.id,
					type: 'deposit',
					dealId: { not: null },
					paymentId: { not: null }, // Только транзакции Т-Банка
				},
				orderBy: { createdAt: 'desc' },
				select: {
					id: true,
					dealId: true,
					paymentId: true,
					amount: true,
					createdAt: true,
				},
			})

			if (lastDepositTx?.dealId) {
				finalDealId = String(lastDepositTx.dealId)
				console.log(
					'✅ [CREATE-WITHDRAWAL] Найден DealId из последней транзакции:',
					finalDealId
				)
			}

			// Шаг 2: Если не нашли, ищем ЛЮБУЮ транзакцию пополнения с DealId и PaymentId (Т-Банк)
			if (!finalDealId) {
				const anyDepositTx = await prisma.transaction.findFirst({
					where: {
						userId: user.id,
						type: 'deposit',
						dealId: { not: null },
						paymentId: { not: null }, // Только транзакции Т-Банка
					},
					orderBy: { createdAt: 'asc' }, // Берем самую старую
					select: { dealId: true },
				})

				if (anyDepositTx?.dealId) {
					finalDealId = String(anyDepositTx.dealId)
					console.log(
						'✅ [CREATE-WITHDRAWAL] Найден DealId из любой транзакции пополнения:',
						finalDealId
					)
				}
			}

			// Шаг 3: Если DealId все еще не найден, пытаемся получить его из всех транзакций через API
			if (!finalDealId) {
				// Получаем все транзакции пополнения с PaymentId, но без DealId
				// Используем более простую проверку
				const allDepositTxs = await prisma.transaction.findMany({
					where: {
						userId: user.id,
						type: 'deposit',
						paymentId: { not: null },
					},
					orderBy: { createdAt: 'desc' },
					select: { paymentId: true, dealId: true },
					take: 5, // Проверяем последние 5 транзакций
				})
				
				// Фильтруем только те, у которых нет DealId
				const allDepositTxsWithoutDealId = allDepositTxs.filter(tx => !tx.dealId)

				// Перебираем все транзакции и пытаемся получить DealId через API
				for (const tx of allDepositTxsWithoutDealId) {
					if (finalDealId) break // Если нашли DealId, прекращаем поиск
					
					if (!tx.paymentId) continue

					try {
						const { checkPaymentStatus } = await import('@/lib/tbank')
						console.log(
							'🔍 [CREATE-WITHDRAWAL] Пытаемся получить DealId из API для PaymentId:',
							tx.paymentId
						)
						const paymentStatus = await checkPaymentStatus(tx.paymentId)

						if (paymentStatus.Success) {
							const apiDealId =
								paymentStatus.SpAccumulationId || paymentStatus.DealId
							
							if (apiDealId) {
								finalDealId = String(apiDealId)
								
								// Обновляем ВСЕ транзакции пользователя с этим PaymentId
								await prisma.transaction.updateMany({
									where: {
										userId: user.id,
										paymentId: tx.paymentId,
									},
									data: { dealId: finalDealId },
								})
								console.log(
									'✅ [CREATE-WITHDRAWAL] DealId получен из API и сохранен:',
									finalDealId
								)
								break // Нашли DealId, прекращаем поиск
							}
						}
					} catch (error) {
						console.error(
							'❌ [CREATE-WITHDRAWAL] Ошибка получения DealId из API для PaymentId:',
							tx.paymentId,
							error
						)
						// Продолжаем поиск в следующей транзакции
					}
				}

				// Шаг 4: Если DealId все еще не найден, вызываем API для обновления всех DealId
				if (!finalDealId) {
					try {
						console.log(
							'🔄 [CREATE-WITHDRAWAL] Пытаемся обновить все DealId через API...'
						)
						const updateResponse = await fetch(
							`${
								process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
							}/api/wallet/tbank/update-deal-ids`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									Authorization: req.headers.get('authorization') || '',
								},
							}
						)

						if (updateResponse.ok) {
							const updateData = await updateResponse.json()
							console.log(
								'📊 [CREATE-WITHDRAWAL] Результат обновления DealId:',
								updateData
							)

							// Пытаемся найти DealId снова (только Т-Банк транзакции)
							const retryDepositTx = await prisma.transaction.findFirst({
								where: {
									userId: user.id,
									type: 'deposit',
									dealId: { not: null },
									paymentId: { not: null }, // Только транзакции Т-Банка
								},
								orderBy: { createdAt: 'desc' },
								select: { dealId: true },
							})

							if (retryDepositTx?.dealId) {
								finalDealId = String(retryDepositTx.dealId)
								console.log(
									'✅ [CREATE-WITHDRAWAL] DealId найден после обновления:',
									finalDealId
								)
							}
						}
					} catch (updateError) {
						console.error(
							'❌ [CREATE-WITHDRAWAL] Ошибка при обновлении DealId:',
							updateError
						)
					}
				}
			}

			// Если DealId все еще не найден, возвращаем ошибку
			if (!finalDealId) {
				// Получаем только транзакции Т-Банка (с PaymentId) для диагностики
				const tbankDepositTxs = await prisma.transaction.findMany({
					where: {
						userId: user.id,
						type: 'deposit',
						paymentId: { not: null }, // Только транзакции Т-Банка
					},
					orderBy: { createdAt: 'desc' },
					select: {
						id: true,
						dealId: true,
						paymentId: true,
						createdAt: true,
					},
				})

				// Получаем все транзакции для общей статистики
				const allDepositTxs = await prisma.transaction.findMany({
					where: {
						userId: user.id,
						type: 'deposit',
					},
					orderBy: { createdAt: 'desc' },
					select: {
						id: true,
						dealId: true,
						paymentId: true,
						createdAt: true,
					},
					take: 1,
				})

				// Детальная диагностика для пользователя
				const diagnosticInfo = {
					hasDeposits: allDepositTxs.length > 0,
					hasTBankDeposits: tbankDepositTxs.length > 0,
					tbankDepositsWithDealId: tbankDepositTxs.filter(tx => tx.dealId).length,
					lastDeposit: allDepositTxs[0]
						? {
								hasDealId: !!allDepositTxs[0].dealId,
								hasPaymentId: !!allDepositTxs[0].paymentId,
								createdAt: allDepositTxs[0].createdAt,
						  }
						: null,
				}

				console.error(
					'❌ [CREATE-WITHDRAWAL] DealId не найден после всех попыток. Диагностика:',
					diagnosticInfo
				)

				let errorMessage = 'Не найден DealId для выплаты.\n\n'

				// Если нет транзакций Т-Банка вообще
				if (!diagnosticInfo.hasTBankDeposits) {
					errorMessage += '❌ У вас нет транзакций пополнения через Т-Банк.\n'
					errorMessage +=
						'→ Вывод средств возможен только после пополнения баланса через Т-Банк.\n'
					errorMessage +=
						'→ Старые пополнения (без PaymentId) не могут быть использованы для выплат.\n\n'
					errorMessage += '→ Решение:\n'
					errorMessage +=
						'  • Пополните баланс через Т-Банк (кнопка "Пополнить")\n'
					errorMessage +=
						'  • После оплаты подождите 1-2 минуты (придет вебхук с DealId)\n'
					errorMessage += '  • Затем попробуйте вывести средства снова\n'
				} else if (diagnosticInfo.tbankDepositsWithDealId === 0) {
					errorMessage += '❌ В ваших транзакциях пополнения через Т-Банк нет DealId.\n'
					errorMessage += '→ Возможные причины:\n'
					errorMessage +=
						'  1. Вебхук от Т-Банка еще не обработан (подождите 1-2 минуты)\n'
					errorMessage +=
						'  2. Вебхук не настроен в личном кабинете Т-Банка\n'
					errorMessage += '  3. Сделка не была создана при пополнении\n\n'
					errorMessage += '→ Решения:\n'
					errorMessage +=
						'  • Подождите несколько минут и попробуйте снова\n'
					errorMessage +=
						'  • Используйте кнопку "Обновить DealId" (если есть)\n'
					errorMessage += '  • Пополните баланс заново через Т-Банк\n'
				} else {
					errorMessage +=
						'❌ Не удалось найти DealId в последней транзакции.\n'
					errorMessage +=
						'→ Попробуйте обновить DealId или пополните баланс заново.\n'
				}

				return NextResponse.json(
					{
						error: errorMessage,
						diagnostic: diagnosticInfo,
					},
					{ status: 400 }
				)
			}
		}

		// НЕ проверяем баланс сделки в нашей БД - Т-Банк сам проверит баланс
		// Если баланс недостаточен, Т-Банк вернет ошибку wrong.payout.amount
		// Мы обработаем эту ошибку и покажем понятное сообщение пользователю

		// Определяем способ выплаты и формируем PaymentRecipientId
		let finalCardId: string | undefined = undefined
		let finalPaymentRecipientId: string
		
		if (hasCardId) {
			// Если указан CardId (привязанная карта)
			finalCardId = cardId
			// PaymentRecipientId для карты - телефон или последние 4 цифры карты
			finalPaymentRecipientId = paymentRecipientId || user.phone || user.id.slice(-4)
		} else if (hasCardData) {
			// Если указаны данные карты, CardId не используется
			// PaymentRecipientId - последние 4 цифры карты или телефон
			const cleanCardNumber = cardNumber.replace(/\D/g, '')
			finalPaymentRecipientId = paymentRecipientId || cleanCardNumber.slice(-4) || user.phone || user.id.slice(-4)
		} else {
			// Для СБП - используем телефон
			const userPhone = phone || user.phone || ''
			const cleanPhone = userPhone.replace(/\D/g, '')
			
			// Формируем корректный PaymentRecipientId в формате 7XXXXXXXXXX (11 цифр, БЕЗ +)
			// Согласно документации A2C_V2 стр. 15-16: "PaymentRecipientId": "79066589133"
			if (cleanPhone.length >= 11 && cleanPhone.startsWith('7')) {
				finalPaymentRecipientId = cleanPhone.slice(0, 11)
			} else if (cleanPhone.length >= 10) {
				finalPaymentRecipientId = `7${cleanPhone.slice(-10)}`
			} else {
				// Если номер недостаточно длинный, используем user.id как fallback
				finalPaymentRecipientId = `7${user.id
					.replace(/\D/g, '')
					.slice(0, 10)
					.padEnd(10, '0')}`
			}
		}

		console.log('💸 [CREATE-WITHDRAWAL] Параметры выплаты:', {
			userId: user.id,
			amount: amountNumber,
			orderId,
			dealId: finalDealId || 'не указан',
			paymentRecipientId: finalPaymentRecipientId,
			cardId: finalCardId || cardId || 'не указан',
			hasCardData: hasCardData,
			hasCardId: hasCardId,
			phone: phone || 'не указан',
			sbpMemberId: sbpMemberId || 'не указан',
			method: hasCardId || hasCardData ? 'card' : hasSbpData ? 'sbp' : 'unknown',
		})

		// НЕ проверяем доступность СБП через GetSbpMembers - это может мешать
		// Полагаемся на проверку самого e2c/v2/Init при попытке выплаты
		// Если СБП недоступен, Т-Банк вернет ошибку, и мы её обработаем

		// Проверяем, что finalDealId определен
		if (!finalDealId) {
			return NextResponse.json(
				{
					error: 'DealId не найден. Сначала пополните баланс через Т-Банк.',
				},
				{ status: 400 }
			)
		}

		// Создаем выплату в Т-Банке
		let withdrawal
		try {
			// Для СБП Phone должен быть 11 цифр, начинаться с 7
			// Согласно документации: "Формат: 11 цифр. Пример: 70123456789"
			let phoneForSbp: string | undefined = undefined
			if (phone) {
				// Убираем все нецифровые символы
				const cleanPhone = phone.replace(/\D/g, '')
				
				// Если номер начинается с 8, заменяем на 7
				let phoneWith7 = cleanPhone.startsWith('8') 
					? '7' + cleanPhone.slice(1) 
					: cleanPhone
				
				// Если номер не начинается с 7, добавляем 7 в начало
				if (!phoneWith7.startsWith('7')) {
					phoneWith7 = '7' + phoneWith7
				}
				
				// Берем последние 11 цифр (на случай, если номер длиннее)
				phoneWith7 = phoneWith7.slice(-11)
				
				// Проверяем, что получилось 11 цифр и начинается с 7
				if (phoneWith7.length === 11 && phoneWith7.startsWith('7')) {
					phoneForSbp = phoneWith7
				} else {
					console.error('❌ [CREATE-WITHDRAWAL] Некорректный формат телефона:', {
						original: phone,
						cleaned: cleanPhone,
						formatted: phoneWith7,
						length: phoneWith7.length,
						note: 'Телефон должен быть 11 цифр, начинаться с 7. Пример: 79123456789',
					})
					return NextResponse.json(
						{
							error: `Некорректный формат телефона. Телефон должен быть 11 цифр, начинаться с 7. Пример: 79123456789. Получено: ${phone}`,
						},
						{ status: 400 }
					)
				}
			}

			// Формируем CardData для выплаты на карту, если указаны данные карты
			let cardDataString: string | undefined = undefined
			if (hasCardData && !hasCardId) {
				// Для выплаты на карту через CardData нужны данные карты
				// Согласно документации (стр. 666): CardData должен быть в формате "ключ=значение" (разделитель ";"),
				// зашифрован через RSA и закодирован в Base64
				// Пример из документации (стр. 676): PAN=4300000000000777;ExpDate=0523;CardHolder=IVAN PETROV;CVV=
				// ВАЖНО: CVV может быть пустым для выплат (не требуется для привязки)
				const cleanCardNumber = cardNumber.replace(/\D/g, '')
				const [expMonth, expYear] = cardExpiry.split('/')
				const expDate = expYear ? `${expMonth}${expYear}` : expMonth // MMYY
				
				// Формат CardData: "PAN=...;ExpDate=...;CardHolder=...;CVV=..."
				// Согласно примеру из документации, CVV может быть пустым
				// ВАЖНО: CardData должен быть зашифрован через RSA и закодирован в Base64
				// Без шифрования Т-Банк не примет данные - нужен открытый ключ от Т-Банка
				const cardDataPlain = `PAN=${cleanCardNumber};ExpDate=${expDate};CardHolder=${cardHolderName};CVV=${cardCvv || ''}`
				
				// Проверяем наличие RSA ключа для шифрования
				const rsaPublicKey = process.env.TBANK_RSA_PUBLIC_KEY
				if (!rsaPublicKey) {
					// БЕЗ RSA ключа CardData НЕЛЬЗЯ передавать - Т-Банк его не примет
					// Возвращаем понятную ошибку пользователю
					console.error('❌ [CREATE-WITHDRAWAL] TBANK_RSA_PUBLIC_KEY не настроен - CardData не может быть передан')
					return NextResponse.json(
						{
							error:
								'❌ Для выплаты на карту через CardData требуется RSA ключ.\n\n' +
								'Проблема: Без RSA ключа Т-Банк не принимает данные карты.\n\n' +
								'Решение:\n' +
								'• Обратитесь в поддержку Т-Банка (acq_help@tbank.ru) для получения RSA ключа\n' +
								'• Или используйте вывод через СБП (если доступен)\n' +
								'• Или привяжите карту через метод AddCard (если доступен), затем используйте CardId\n\n' +
								'Важно: Без RSA ключа выплаты на карту через CardData невозможны.',
						},
						{ status: 400 }
					)
				}
				
				// RSA ключ есть - передаем CardData для шифрования в lib/tbank.ts
				cardDataString = cardDataPlain
				
				console.log('💳 [CREATE-WITHDRAWAL] Сформированы данные карты:', {
					cardNumberLength: cleanCardNumber.length,
					hasExpiry: !!cardExpiry,
					hasCvv: !!cardCvv,
					hasHolderName: !!cardHolderName,
					format: 'PAN=...;ExpDate=...;CardHolder=...;CVV=...',
					cardDataPreview: cardDataPlain.substring(0, 50) + '...',
					note: 'CardData будет зашифрован через RSA в lib/tbank.ts',
				})
			}

			withdrawal = await createWithdrawal({
				amount: amountNumber,
				orderId,
				dealId: finalDealId,
				paymentRecipientId: finalPaymentRecipientId,
				// Передаем cardId только если он есть (привязанная карта)
				...(finalCardId ? { cardId: finalCardId } : {}),
				// Передаем cardData только если есть данные карты (незашифрованные данные)
				...(cardDataString ? { cardData: cardDataString } : {}),
				// Передаем phone и sbpMemberId только для СБП выплат
				...(phoneForSbp && sbpMemberId
					? { phone: phoneForSbp, sbpMemberId }
					: {}),
				// НЕ используем FinalPayout для частичных выплат
				// FinalPayout: true требует, чтобы сумма ТОЧНО совпадала с балансом сделки
				// Для частичных выплат используем FinalPayout: false (не передаем параметр)
			})

			console.log('✅ [CREATE-WITHDRAWAL] Выплата создана:', {
				paymentId: withdrawal.PaymentId,
				success: withdrawal.Success,
				errorCode: withdrawal.ErrorCode,
				message: withdrawal.Message,
			})

			// Проверяем успешность создания выплаты
			if (!withdrawal.Success) {
				const errorMessage =
					withdrawal.Message ||
					`Ошибка создания выплаты: ${
						withdrawal.ErrorCode || 'неизвестная ошибка'
					}`
				console.error(
					'❌ [CREATE-WITHDRAWAL] Т-Банк вернул ошибку:',
					errorMessage
				)
				throw new Error(errorMessage)
			}

			if (!withdrawal.PaymentId) {
				throw new Error('Т-Банк не вернул PaymentId для выплаты')
			}
		} catch (error: any) {
			console.error('❌ [CREATE-WITHDRAWAL] Ошибка создания выплаты:', error)
			logger.error('Ошибка создания выплаты в Т-Банке', error, {
				userId: user.id,
				amount: amountNumber,
			})
			
			// Возвращаем ошибку как ответ, а не выбрасываем её снова
			const errorMessage = error?.message || error?.toString() || 'Ошибка создания выплаты'
			return NextResponse.json(
				{
					error: errorMessage,
				},
				{ status: 500 }
			)
		}

		// Подтверждаем выплату ТОЛЬКО для выплат на карту
		// Для выплат по СБП метод Payment НЕ требуется (выплата происходит в рамках Init)
		if (withdrawal?.PaymentId && !phone && !sbpMemberId) {
			// Выплата на карту - требуется подтверждение через Payment
			try {
				await confirmWithdrawal(withdrawal.PaymentId)
				console.log(
					'✅ [CREATE-WITHDRAWAL] Выплата на карту подтверждена:',
					withdrawal.PaymentId
				)
			} catch (error: any) {
				console.error(
					'❌ [CREATE-WITHDRAWAL] Ошибка подтверждения выплаты на карту:',
					error
				)
				logger.error('Ошибка подтверждения выплаты на карту', error, {
					userId: user.id,
					paymentId: withdrawal.PaymentId,
				})
				// Не прерываем выполнение, так как выплата уже создана
			}
		} else if (phone && sbpMemberId && withdrawal?.PaymentId) {
			// Выплата по СБП - Payment не требуется
			console.log(
				'✅ [CREATE-WITHDRAWAL] Выплата по СБП создана, Payment не требуется:',
				withdrawal.PaymentId
			)
		}

		// Проверяем, что withdrawal определен и есть PaymentId
		if (!withdrawal || !withdrawal.PaymentId) {
			console.error('❌ [CREATE-WITHDRAWAL] withdrawal или PaymentId отсутствует')
			return NextResponse.json(
				{
					error: 'Ошибка создания выплаты: не получен PaymentId от Т-Банка',
				},
				{ status: 500 }
			)
		}

		// Списываем средства с баланса пользователя
		const amountDecimal = new Prisma.Decimal(amountNumber)

		const updated = await prisma.user.update({
			where: { id: user.id },
			data: {
				balance: { decrement: amountDecimal },
				transactions: {
					create: {
						amount: new Prisma.Decimal(-amountNumber),
						type: 'withdraw',
						reason: `Вывод средств через Т-Банк (PaymentId: ${withdrawal.PaymentId})`,
						dealId: finalDealId,
						paymentId: withdrawal.PaymentId || null,
						status: 'completed',
					},
				},
			},
			select: { balance: true },
		})

		// Логируем успешный вывод
		await logActivity(user.id, 'withdraw_success', req, {
			amount: amountNumber,
			newBalance: toNumber(updated.balance),
			paymentId: withdrawal.PaymentId,
		})

		logger.info('Создана выплата Т-Банк', {
			userId: user.id,
			paymentId: withdrawal.PaymentId,
			amount: amountNumber,
			orderId,
		})

		return NextResponse.json({
			success: true,
			paymentId: withdrawal.PaymentId,
			balance: toNumber(updated.balance),
		})
	} catch (error: any) {
		console.error('❌ [CREATE-WITHDRAWAL] Критическая ошибка:', {
			message: error?.message,
			stack: error?.stack,
			name: error?.name,
			error: String(error),
		})

		let userId: string | undefined
		try {
			userId = (await getUserFromRequest(req))?.id
		} catch (authError) {
			// Игнорируем ошибки аутентификации при логировании
		}

		logger.error('Ошибка создания выплаты T-Bank', error, {
			userId,
		})

		// Безопасное извлечение сообщения об ошибке
		const errorMessage =
			error?.message || error?.toString() || 'Ошибка создания выплаты'

		return NextResponse.json(
			{
				error: errorMessage,
				details:
					process.env.NODE_ENV === 'development' ? error?.stack : undefined,
			},
			{ status: 500 }
		)
	}
}
