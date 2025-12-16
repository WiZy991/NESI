import { getLevelFromXP } from './calculate'
import prisma from '@/lib/prisma'

/**
 * Рассчитывает комиссию платформы на основе уровня исполнителя и количества выполненных задач
 * 
 * НОВАЯ СИСТЕМА КОМИССИЙ:
 * - Первые 3 завершённые задачи: 0% (бесплатно для исполнителя)
 * - После 3 задач комиссия зависит от уровня:
 *   - Уровень 1-2: 10%
 *   - Уровень 3: 9% (-1%)
 *   - Уровень 4: 8% (-2%)
 *   - Уровень 5: 7% (-3%)
 *   - Уровень 6+: 6% (-4%)
 * 
 * @param executorXP - XP исполнителя
 * @param executorId - ID исполнителя (опционально, для проверки бесплатных задач)
 * @returns Процент комиссии (от 0 до 0.10)
 */
export async function calculateCommissionRate(executorXP: number, executorId?: string): Promise<number> {
  // Проверяем, есть ли у исполнителя бесплатные задачи (первые 3)
  if (executorId) {
    const executor = await prisma.user.findUnique({
      where: { id: executorId },
      select: { completedTasksCount: true }
    })
    
    // Если исполнитель выполнил менее 3 задач - комиссия 0%
    // (текущая задача ещё не учтена, поэтому проверяем < 3)
    if (executor && executor.completedTasksCount < 3) {
      return 0
    }
  }

  const levelInfo = await getLevelFromXP(executorXP)
  const level = levelInfo.level

  // Уровень 1-2: комиссия 10% (базовая)
  if (level <= 2) {
    return 0.10
  }

  // Начиная с 3 уровня: снижение на 1% за уровень
  // Уровень 3: 9%, Уровень 4: 8%, Уровень 5: 7%, Уровень 6+: 6%
  const reduction = Math.min(level - 2, 4) // Максимум 4% снижения (до 6%)
  const commissionRate = 0.10 - reduction * 0.01

  // Минимум 6%
  return Math.max(commissionRate, 0.06)
}

/**
 * Получает лимит одновременных задач для уровня
 * @param level - Уровень пользователя
 * @returns Максимальное количество задач одновременно
 */
export function getMaxTasksForLevel(level: number): number {
  if (level >= 6) return 10 // Максимум
  if (level === 5) return 8
  if (level === 4) return 5
  if (level === 3) return 3
  if (level === 2) return 2
  return 1 // Уровень 1
}

/**
 * Получает визуальные стили для уровня
 */
export function getLevelVisuals(level: number): {
  borderColor: string
  borderClass: string
  icon: string
  name: string
} {
  if (level >= 6) {
    return {
      borderColor: 'from-yellow-400 via-amber-500 to-orange-500',
      borderClass: 'border-yellow-400/50',
      icon: '👑',
      name: 'Легенда'
    }
  }
  if (level === 5) {
    return {
      borderColor: 'from-yellow-300 to-yellow-600',
      borderClass: 'border-yellow-400/50',
      icon: '👑',
      name: 'Мастер'
    }
  }
  if (level === 4) {
    return {
      borderColor: 'from-purple-400 to-purple-600',
      borderClass: 'border-purple-400/50',
      icon: '⭐⭐⭐',
      name: 'Профессионал'
    }
  }
  if (level === 3) {
    return {
      borderColor: 'from-blue-400 to-blue-600',
      borderClass: 'border-blue-400/50',
      icon: '⭐⭐',
      name: 'Специалист'
    }
  }
  if (level === 2) {
    return {
      borderColor: 'from-green-400 to-green-600',
      borderClass: 'border-green-400/50',
      icon: '⭐',
      name: 'Ученик'
    }
  }
  return {
    borderColor: 'from-gray-400 to-gray-600',
    borderClass: 'border-gray-500/50',
    icon: '',
    name: 'Новичок'
  }
}

