/**
 * API для подтверждения существования компании через ИНН (Этап 1)
 * POST /api/company/verify-inn
 * 
 * Проверяет ИНН через ФНС и сохраняет факт существования компании
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем, что пользователь - исполнитель
    if (user.role !== 'executor') {
      return NextResponse.json(
        { error: 'Только исполнители могут подтверждать компании' },
        { status: 403 }
      )
    }

    // Проверяем, что статус - ИП или ООО
    if (user.accountType !== 'SOLE_PROPRIETOR' && user.accountType !== 'COMPANY') {
      return NextResponse.json(
        { error: 'Подтверждение компании доступно только для ИП и ООО' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { inn } = body

    if (!inn || typeof inn !== 'string') {
      return NextResponse.json(
        { error: 'ИНН обязателен' },
        { status: 400 }
      )
    }

    const cleanInn = inn.replace(/\D/g, '')
    const expectedLength = user.accountType === 'COMPANY' ? 10 : 12

    if (cleanInn.length !== expectedLength) {
      return NextResponse.json(
        { error: `ИНН должен содержать ${expectedLength} цифр` },
        { status: 400 }
      )
    }

    // Проверяем ИНН через ФНС
    const innLookupResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/inn/lookup?inn=${cleanInn}`,
      {
        headers: {
          'Authorization': `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '')}`,
        },
      }
    )

    if (!innLookupResponse.ok) {
      const errorData = await innLookupResponse.json()
      return NextResponse.json(
        { error: errorData.error || 'Ошибка при проверке ИНН' },
        { status: 500 }
      )
    }

    const innData = await innLookupResponse.json()

    if (!innData.found || !innData.success) {
      return NextResponse.json(
        { error: innData.message || 'Компания с таким ИНН не найдена' },
        { status: 404 }
      )
    }

    // Проверяем, что тип компании соответствует выбранному статусу
    const expectedType = user.accountType === 'COMPANY' ? 'COMPANY' : 'IP'
    if (innData.type !== expectedType) {
      return NextResponse.json(
        { error: `Тип компании не соответствует выбранному статусу. Ожидается: ${expectedType === 'COMPANY' ? 'ООО' : 'ИП'}` },
        { status: 400 }
      )
    }

    // Проверяем, что компания активна
    if (innData.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Компания не имеет действующего статуса' },
        { status: 400 }
      )
    }

    // Создаем или обновляем запись подтверждения
    const verification = await prisma.companyVerification.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        inn: cleanInn,
        companyName: innData.name || innData.fullName,
        companyType: innData.type,
        innVerified: true,
        innVerifiedAt: new Date(),
      },
      update: {
        inn: cleanInn,
        companyName: innData.name || innData.fullName,
        companyType: innData.type,
        innVerified: true,
        innVerifiedAt: new Date(),
      },
    })

    logger.info('Company INN verified', {
      userId: user.id,
      inn: cleanInn,
      companyName: verification.companyName,
    })

    return NextResponse.json({
      success: true,
      message: 'Существование компании подтверждено',
      verification: {
        innVerified: verification.innVerified,
        innVerifiedAt: verification.innVerifiedAt,
        companyName: verification.companyName,
      },
    })
  } catch (error) {
    logger.error('Company INN verification error', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при подтверждении компании' },
      { status: 500 }
    )
  }
}

