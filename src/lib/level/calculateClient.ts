/**
 * Клиентская версия расчета уровня (без Prisma)
 * Использует дефолтные уровни
 */

export interface LevelInfo {
  level: number
  name: string
  description: string
  minScore: number
  slug: string
}

/**
 * Дефолтные уровни (используется на клиенте)
 */
const DEFAULT_LEVELS = [
  { level: 1, name: 'Новичок', description: 'Только начинаете свой путь', minScore: 0, slug: '1' },
  { level: 2, name: 'Ученик', description: 'Осваиваете основы', minScore: 100, slug: '2' },
  { level: 3, name: 'Практик', description: 'Набираетесь опыта', minScore: 300, slug: '3' },
  { level: 4, name: 'Специалист', description: 'Достигли профессионализма', minScore: 600, slug: '4' },
  { level: 5, name: 'Эксперт', description: 'Мастер своего дела', minScore: 1000, slug: '5' },
  { level: 6, name: 'Легенда', description: 'Вершина мастерства', minScore: 1500, slug: '6' },
]

/**
 * Получает уровень пользователя на основе XP (клиентская версия)
 */
export function getLevelFromXPClient(xp: number): LevelInfo {
  const xpValue = Math.max(0, xp || 0)
  
  // Находим максимальный уровень, который подходит
  let currentLevel = DEFAULT_LEVELS[0]
  for (const lvl of DEFAULT_LEVELS) {
    if (xpValue >= lvl.minScore) {
      currentLevel = lvl
    } else {
      break
    }
  }
  
  return currentLevel
}

