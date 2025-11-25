import { getUserFromRequest } from '@/lib/auth'
import { TBankPayoutClient } from '@/lib/tbank/client'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Получение списка банков СБП для выбора при выводе средств
 * GET /api/wallet/tbank/get-sbp-banks
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Получаем список банков СБП через Т-Банк API
		const payoutClient = new TBankPayoutClient()
		const result = await payoutClient.getSbpMembers()

		if (!result.Success) {
			logger.warn('Ошибка получения списка банков СБП', {
				errorCode: result.ErrorCode,
				message: result.Message,
			})

			// Возвращаем популярные банки в качестве fallback
			const popularBanks = [
				{ MemberId: '100000000004', MemberName: 'Sberbank', MemberNameRus: 'Сбербанк' },
				{ MemberId: '100000000111', MemberName: 'Tinkoff', MemberNameRus: 'Т-Банк' },
				{ MemberId: '100000000007', MemberName: 'VTB', MemberNameRus: 'ВТБ' },
				{ MemberId: '100000000013', MemberName: 'Alfa-Bank', MemberNameRus: 'Альфа-Банк' },
				{ MemberId: '100000000015', MemberName: 'Raiffeisenbank', MemberNameRus: 'Райффайзенбанк' },
			]

			return NextResponse.json({
				success: false,
				errorCode: result.ErrorCode,
				message: result.Message || 'Не удалось получить список банков',
				banks: popularBanks,
				note: 'Возвращен список популярных банков. Выберите банк вручную.',
			})
		}

		// Сортируем банки по названию для удобства
		const sortedBanks = (result.Members || []).sort((a, b) => {
			const nameA = a.MemberNameRus || a.MemberName || ''
			const nameB = b.MemberNameRus || b.MemberName || ''
			return nameA.localeCompare(nameB, 'ru')
		})

		// Выделяем популярные банки в начало списка
		const popularBankIds = ['100000000004', '100000000111', '100000000007', '100000000013', '100000000015']
		const popularBanks = sortedBanks.filter(bank => 
			popularBankIds.includes(bank.MemberId)
		)
		const otherBanks = sortedBanks.filter(bank => 
			!popularBankIds.includes(bank.MemberId)
		)

		const finalBanks = [...popularBanks, ...otherBanks]

		console.log('✅ [GET-SBP-BANKS] Список банков получен:', {
			total: finalBanks.length,
			popular: popularBanks.length,
			others: otherBanks.length,
		})

		return NextResponse.json({
			success: true,
			banks: finalBanks,
			total: finalBanks.length,
		})
	} catch (error: any) {
		console.error('❌ [GET-SBP-BANKS] Ошибка получения списка банков:', error)
		logger.error('Ошибка получения списка банков СБП', error)

		// Возвращаем популярные банки в качестве fallback
		const popularBanks = [
			{ MemberId: '100000000004', MemberName: 'Sberbank', MemberNameRus: 'Сбербанк' },
			{ MemberId: '100000000111', MemberName: 'Tinkoff', MemberNameRus: 'Т-Банк' },
			{ MemberId: '100000000007', MemberName: 'VTB', MemberNameRus: 'ВТБ' },
			{ MemberId: '100000000013', MemberName: 'Alfa-Bank', MemberNameRus: 'Альфа-Банк' },
			{ MemberId: '100000000015', MemberName: 'Raiffeisenbank', MemberNameRus: 'Райффайзенбанк' },
		]

		return NextResponse.json({
			success: false,
			error: error?.message || 'Ошибка получения списка банков',
			banks: popularBanks,
			note: 'Возвращен список популярных банков. Выберите банк вручную.',
		})
	}
}
