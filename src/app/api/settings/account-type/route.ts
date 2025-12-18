/**
 * API для смены типа аккаунта
 * 
 * POST /api/settings/account-type
 * 
 * Логика:
 * - INDIVIDUAL → может стать SELF_EMPLOYED, SOLE_PROPRIETOR, COMPANY
 * - SELF_EMPLOYED → может стать SOLE_PROPRIETOR, COMPANY
 * - SOLE_PROPRIETOR → может стать COMPANY
 * - COMPANY → нельзя сменить (конечный статус)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Допустимые переходы между типами аккаунтов
const ALLOWED_UPGRADES: Record<string, string[]> = {
  INDIVIDUAL: ['SELF_EMPLOYED', 'SOLE_PROPRIETOR', 'COMPANY'],
  SELF_EMPLOYED: ['SOLE_PROPRIETOR', 'COMPANY'],
  SOLE_PROPRIETOR: ['COMPANY'],
  COMPANY: [], // Нельзя сменить
}

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
    if (!ALLOWED_UPGRADES[newType] && newType !== 'COMPANY') {
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

    // Проверяем, разрешён ли переход
    const allowedUpgrades = ALLOWED_UPGRADES[currentType] || []
    
    if (!allowedUpgrades.includes(newType)) {
      // Если пытаются понизить или остаться на том же уровне
      if (currentType === newType) {
        return NextResponse.json(
          { error: 'Вы уже используете этот тип аккаунта' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Невозможно сменить тип аккаунта с "${ACCOUNT_TYPE_LABELS[currentType]}" на "${ACCOUNT_TYPE_LABELS[newType]}". Доступны только: ${allowedUpgrades.map(t => ACCOUNT_TYPE_LABELS[t]).join(', ') || 'нет доступных вариантов'}`
        },
        { status: 400 }
      )
    }

    // Обновляем тип аккаунта
    // При смене типа очищаем старые данные компании (они могут быть неактуальны)
    const updateData: any = {
      accountType: newType,
    }

    // Если переходим на ИП или ООО, очищаем старые данные компании
    // (пользователь должен заполнить их заново)
    if (newType === 'SOLE_PROPRIETOR' || newType === 'COMPANY') {
      // Не очищаем данные, если они уже были заполнены для этого типа
      // Просто меняем тип
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

