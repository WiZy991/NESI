import { getLevelFromXP } from './calculate'

/**
 * Рассчитывает комиссию платформы на основе уровня исполнителя
 * @param executorXP - XP исполнителя
 * @returns Процент комиссии (от 0.12 до 0.20)
 */
export async function calculateCommissionRate(executorXP: number): Promise<number> {
  const levelInfo = await getLevelFromXP(executorXP)
  const level = levelInfo.level

  // Уровень 1-2: комиссия 20% (базовая)
  if (level <= 2) {
    return 0.20
  }

  // Начиная с 3 уровня: снижение на 1% за уровень
  // Максимальное снижение до 12% (уровень 10+)
  const reduction = Math.min(level - 2, 8) // Максимум 8% снижения
  const commissionRate = 0.20 - reduction * 0.01

  // Минимум 12%
  return Math.max(commissionRate, 0.12)
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
      icon: '⭐⭐⭐⭐',
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

