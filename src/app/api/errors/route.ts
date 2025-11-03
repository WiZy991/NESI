// API endpoint для логирования клиентских ошибок
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const errorData = await req.json()

    // Логируем только важные ошибки
    const isImportantError =
      errorData.message?.includes('NetworkError') ||
      errorData.message?.includes('Failed to fetch') ||
      errorData.stack ||
      errorData.componentStack

    if (isImportantError) {
      // В продакшене можно сохранять в базу данных или отправлять в Sentry
      console.error('🚨 Client Error:', {
        message: errorData.message,
        stack: errorData.stack,
        componentStack: errorData.componentStack,
        context: errorData.context,
        userAgent: errorData.userAgent,
        timestamp: errorData.timestamp || new Date().toISOString(),
        url: errorData.url || 'unknown',
      })

      // Опционально: сохранять критические ошибки в БД
      // await prisma.errorLog.create({
      //   data: {
      //     message: errorData.message,
      //     stack: errorData.stack,
      //     context: errorData.context,
      //     userAgent: errorData.userAgent,
      //   },
      // })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Игнорируем ошибки при логировании ошибок
    console.error('Error logging failed:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

