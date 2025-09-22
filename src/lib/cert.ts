import prisma from '@/lib/prisma'

export const CERT_ATTEMPTS_PER_24H = 3

export async function canStartAttempt(userId: string, testId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const count = await prisma.certificationAttempt.count({
    where: { userId, testId, startedAt: { gte: since } }
  })
  return { allowed: count < CERT_ATTEMPTS_PER_24H, used: count }
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return [...arr]
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}
