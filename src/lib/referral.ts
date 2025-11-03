import prisma from './prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Генерирует уникальный реферальный код для пользователя
 */
export async function generateReferralCode(userId: string): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  let isUnique = false

  while (!isUnique) {
    // Генерируем код из 8 символов
    code = ''
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    // Проверяем уникальность
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
    })

    if (!existing) {
      isUnique = true
    }
  }

  // Сохраняем код
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code },
  })

  return code
}

/**
 * Проверяет, можно ли начислить реферальный бонус
 * Бонус начисляется за первые 5 завершенных задач реферала
 */
export async function canEarnReferralBonus(
  referralId: string
): Promise<boolean> {
  const bonusCount = await prisma.referralBonus.count({
    where: { referralId },
  })

  return bonusCount < 5
}

/**
 * Начисляет реферальный бонус (5% от суммы задачи)
 */
export async function grantReferralBonus(
  referralId: string,
  taskId: string,
  taskPrice: Decimal
): Promise<void> {
  // Проверяем, есть ли у реферала реферер
  const referral = await prisma.user.findUnique({
    where: { id: referralId },
    select: { referredById: true },
  })

  if (!referral?.referredById) {
    return // Нет реферера
  }

  const referrerId = referral.referredById

  // Проверяем, можно ли начислить бонус
  const canEarn = await canEarnReferralBonus(referralId)
  if (!canEarn) {
    return // Уже начислено 5 бонусов
  }

  // Проверяем, не начислен ли уже бонус за эту задачу
  const existingBonus = await prisma.referralBonus.findFirst({
    where: {
      referrerId,
      referralId,
      taskId,
    },
  })

  if (existingBonus) {
    return // Бонус уже начислен
  }

  // Рассчитываем бонус (5% от суммы задачи)
  const bonusAmount = new Decimal(taskPrice).mul(0.05)

  // Создаем запись о бонусе
  await prisma.referralBonus.create({
    data: {
      referrerId,
      referralId,
      taskId,
      amount: bonusAmount,
    },
  })

  // Начисляем бонус на баланс реферера
  await prisma.user.update({
    where: { id: referrerId },
    data: {
      balance: {
        increment: bonusAmount,
      },
    },
  })

  // Создаем транзакцию
  await prisma.transaction.create({
    data: {
      userId: referrerId,
      amount: bonusAmount,
      type: 'referral_bonus',
      reason: `Реферальный бонус за задачу (реферал: ${referralId})`,
      status: 'completed',
    },
  })

  // Отправляем уведомление рефереру
  await prisma.notification.create({
    data: {
      userId: referrerId,
      type: 'referral_bonus',
      message: `Вы получили ${bonusAmount}₽ реферального бонуса!`,
      link: '/profile',
    },
  })
}

/**
 * Получает статистику реферальной системы для пользователя
 */
export async function getReferralStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      referrals: {
        select: {
          id: true,
          email: true,
          fullName: true,
          createdAt: true,
          completedTasksCount: true,
        },
      },
      referralBonusesEarned: {
        select: {
          amount: true,
          createdAt: true,
          referralId: true,
          task: {
            select: {
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!user) {
    throw new Error('Пользователь не найден')
  }

  // Генерируем реферальный код, если его нет
  let referralCode = user.referralCode
  if (!referralCode) {
    referralCode = await generateReferralCode(userId)
  }

  // Подсчитываем общую сумму бонусов
  const totalEarned = user.referralBonusesEarned.reduce((sum, bonus) => {
    return sum + Number(bonus.amount)
  }, 0)

  return {
    referralCode,
    referralCount: user.referrals.length,
    totalEarned,
    referrals: user.referrals,
    bonuses: user.referralBonusesEarned,
  }
}

