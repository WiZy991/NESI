import { NextResponse } from 'next/server'

/**
 * Health-check endpoint
 * 
 * Цель: Дать серверу простой и быстрый способ понять, что backend жив или завис
 * 
 * Требования:
 * - HTTP 200
 * - JSON { status: "ok" }
 * - Время ответа: < 100 ms
 * - ЗАПРЕЩЕНО: обращения к БД, внешним API, любая тяжёлая логика
 * - Endpoint должен работать даже если всё остальное сломано
 */
export async function GET() {
	return NextResponse.json({ status: 'ok' })
}

