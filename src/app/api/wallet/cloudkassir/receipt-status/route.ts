import { getUserFromRequest } from '@/lib/auth'
import { getCloudKassirConfig, getReceiptStatus } from '@/lib/cloudkassir'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API endpoint для получения статуса чека
 * GET /api/wallet/cloudkassir/receipt-status?receiptId=xxx
 */
export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const { searchParams } = new URL(req.url)
		const receiptId = searchParams.get('receiptId')

		if (!receiptId) {
			return NextResponse.json(
				{ error: 'Не указан ID чека' },
				{ status: 400 }
			)
		}

		const config = getCloudKassirConfig()
		const status = await getReceiptStatus(config, receiptId)

		return NextResponse.json({
			success: status.Success,
			status: status.Model,
			message: status.Message,
			warnings: status.Warnings,
		})
	} catch (error: any) {
		logger.error('Ошибка получения статуса чека CloudKassir', error)

		return NextResponse.json(
			{ error: error.message || 'Ошибка получения статуса чека' },
			{ status: 500 }
		)
	}
}

