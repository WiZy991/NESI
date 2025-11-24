import { validateTBankConfig } from '@/lib/tbank'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/tbank/status
 * Проверяет статус конфигурации Т-Банка
 */
export async function GET(req: NextRequest) {
	const config = validateTBankConfig()

	return NextResponse.json({
		configured: config.valid,
		missing: config.missing,
		mode: process.env.TBANK_MODE || 'test',
		baseUrl:
			process.env.TBANK_MODE === 'production'
				? 'https://securepay.tinkoff.ru'
				: 'https://rest-api-test.tinkoff.ru',
	})
}
