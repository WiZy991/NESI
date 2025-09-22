import prisma from '@/lib/prisma'

export async function recalculateUserLevel(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { level: true }
  })

  if (!user) return

  // Условия: сколько весов на каждый параметр
  const wCert = 1.5
  const wCompleted = 1
  const wRating = 10
  const wXP = 0.1

  const compositeScore =
    wCert * (await getCertScore(userId)) +
    wCompleted * user.completedTasksCount +
    wRating * user.avgRating +
    wXP * user.xp

  // Найти подходящий уровень
  const levels = await prisma.userLevel.findMany({ orderBy: { minScore: 'asc' } })
  const matched = levels.reverse().find((lvl) => compositeScore >= lvl.minScore)

  if (matched && matched.id !== user.levelId) {
    await prisma.user.update({
      where: { id: userId },
      data: { levelId: matched.id }
    })
  }
}

// Считаем количество пройденных сертификаций
async function getCertScore(userId: string): Promise<number> {
  const passedCerts = await prisma.certificationAttempt.findMany({
    where: { userId, passed: true },
    select: { testId: true },
    distinct: ['testId']
  })
  return passedCerts.length
}
