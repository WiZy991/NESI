/**
 * Утилиты для проверки доступа к групповым функциям
 */

import prisma from '@/lib/prisma'

export interface CompanyVerificationStatus {
  innVerified: boolean
  emailVerified: boolean
  canUseGroupFeatures: boolean
}

/**
 * Проверяет, может ли пользователь использовать групповые функции
 * Групповые функции доступны ТОЛЬКО при одновременном выполнении условий:
 * 1. Пользователь находится в роли исполнителя
 * 2. Статус исполнителя — ИП или ООО
 * 3. Подтверждено существование компании (ИНН)
 * 4. Подтверждена связь пользователя с компанией (корпоративная почта)
 */
export async function canUseGroupFeatures(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      accountType: true,
      companyVerification: {
        select: {
          innVerified: true,
          corporateEmailVerified: true,
        },
      },
    },
  })

  if (!user) {
    return false
  }

  // Проверка 1: Роль исполнителя
  if (user.role !== 'executor') {
    return false
  }

  // Проверка 2: Статус ИП или ООО
  if (user.accountType !== 'SOLE_PROPRIETOR' && user.accountType !== 'COMPANY') {
    return false
  }

  // Проверка 3 и 4: Подтверждение компании
  if (!user.companyVerification) {
    return false
  }

  if (!user.companyVerification.innVerified) {
    return false
  }

  if (!user.companyVerification.corporateEmailVerified) {
    return false
  }

  return true
}

/**
 * Получает статус подтверждения компании для пользователя
 */
export async function getCompanyVerificationStatus(
  userId: string
): Promise<CompanyVerificationStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      accountType: true,
      companyVerification: {
        select: {
          innVerified: true,
          corporateEmailVerified: true,
        },
      },
    },
  })

  if (!user || user.role !== 'executor') {
    return null
  }

  if (user.accountType !== 'SOLE_PROPRIETOR' && user.accountType !== 'COMPANY') {
    return null
  }

  const verification = user.companyVerification

  return {
    innVerified: verification?.innVerified || false,
    emailVerified: verification?.corporateEmailVerified || false,
    canUseGroupFeatures:
      (verification?.innVerified || false) &&
      (verification?.corporateEmailVerified || false),
  }
}

