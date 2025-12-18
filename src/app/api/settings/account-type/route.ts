/**
 * API для смены типа аккаунта
 * 
 * POST /api/settings/account-type
 * 
 * Разрешены любые переходы между типами аккаунтов
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Все доступные типы аккаунтов
const VALID_ACCOUNT_TYPES = ['INDIVIDUAL', 'SELF_EMPLOYED', 'SOLE_PROPRIETOR', 'COMPANY']

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Физическое лицо',
  SELF_EMPLOYED: 'Самозанятый',
  SOLE_PROPRIETOR: 'ИП',
  COMPANY: 'ООО / Юр. лицо',
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()
    const { accountType: newType } = body

    if (!newType) {
      return NextResponse.json(
        { error: 'Не указан новый тип аккаунта' },
        { status: 400 }
      )
    }

    // Проверяем, что новый тип валидный
    if (!VALID_ACCOUNT_TYPES.includes(newType)) {
      return NextResponse.json(
        { error: 'Некорректный тип аккаунта' },
        { status: 400 }
      )
    }

    // Получаем текущий тип аккаунта пользователя
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountType: true },
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    const currentType = currentUser.accountType || 'INDIVIDUAL'

    // Проверяем, что новый тип отличается от текущего
    if (currentType === newType) {
      return NextResponse.json(
        { error: 'Вы уже используете этот тип аккаунта' },
        { status: 400 }
      )
    }

    // Обновляем тип аккаунта
    const updateData: any = {
      accountType: newType,
    }

    // Если переходим на физ. лицо или самозанятого - очищаем данные компании
    if (newType === 'INDIVIDUAL' || newType === 'SELF_EMPLOYED') {
      updateData.companyName = null
      updateData.inn = null
      updateData.kpp = null
      updateData.ogrn = null
      updateData.legalAddress = null
      updateData.tbankPartnerId = null
      updateData.bankAccount = null
      updateData.bankBik = null
      updateData.bankName = null
    }
    // Если переходим с ООО на ИП - очищаем КПП (у ИП нет КПП)
    if (currentType === 'COMPANY' && newType === 'SOLE_PROPRIETOR') {
      updateData.kpp = null
    }
    // Если переходим с ИП на ООО - КПП нужно будет заполнить заново
    if (currentType === 'SOLE_PROPRIETOR' && newType === 'COMPANY') {
      // КПП остаётся null, пользователь заполнит при необходимости
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    })

    logger.info('Тип аккаунта изменён', {
      userId: user.id,
      from: currentType,
      to: newType,
    })

    return NextResponse.json({
      success: true,
      accountType: newType,
      message: `Тип аккаунта успешно изменён на "${ACCOUNT_TYPE_LABELS[newType]}"`,
    })

  } catch (error) {
    logger.error('Ошибка смены типа аккаунта', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Ошибка при смене типа аккаунта' },
      { status: 500 }
    )
  }
}

