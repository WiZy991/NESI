import prisma from '@/lib/prisma'

export interface LevelInfo {
  level: number
  name: string
  description: string
  minScore: number
  slug: string
}

/**
 * Получает уровень пользователя на основе XP
 * Использует UserLevel из БД, если есть, иначе дефолтные значения
 */
export async function getLevelFromXP(xp: number): Promise<LevelInfo> {
  // Пытаемся получить уровни из БД
  const dbLevels = await prisma.userLevel.findMany({
    orderBy: { minScore: 'asc' }
  })
  
  // Если есть уровни в БД, используем их
  if (dbLevels.length > 0) {
    // Находим максимальный уровень, который подходит
    let currentLevel = dbLevels[0]
    for (const lvl of dbLevels) {
      if (xp >= lvl.minScore) {
        currentLevel = lvl
      } else {
        break
      }
    }
    
    return {
      level: parseInt(currentLevel.slug) || 1,
      name: currentLevel.name,
      description: currentLevel.description,
      minScore: currentLevel.minScore,
      slug: currentLevel.slug
    }
  }
  
  // Дефолтные уровни, если в БД нет
  return getDefaultLevel(xp)
}

/**
 * Дефолтные уровни (fallback, если в БД нет уровней)
 */
function getDefaultLevel(xp: number): LevelInfo {
  const defaultLevels = [
    { level: 1, requiredXP: 0, name: 'Новичок', description: 'Начало пути' },
    { level: 2, requiredXP: 100, name: 'Ученик', description: 'Первые шаги' },
    { level: 3, requiredXP: 300, name: 'Специалист', description: 'Опытный исполнитель' },
    { level: 4, requiredXP: 700, name: 'Профессионал', description: 'Высокий уровень' },
    { level: 5, requiredXP: 1500, name: 'Мастер', description: 'Эксперт в своем деле' }
  ]
  
  let currentLevel = defaultLevels[0]
  for (const lvl of defaultLevels) {
    if (xp >= lvl.requiredXP) {
      currentLevel = lvl
    } else {
      break
    }
  }
  
  return {
    level: currentLevel.level,
    name: currentLevel.name,
    description: currentLevel.description,
    minScore: currentLevel.requiredXP,
    slug: currentLevel.level.toString()
  }
}

/**
 * Получает следующий уровень для пользователя
 */
export async function getNextLevel(currentXP: number): Promise<LevelInfo | null> {
  const dbLevels = await prisma.userLevel.findMany({
    orderBy: { minScore: 'asc' }
  })
  
  if (dbLevels.length > 0) {
    const nextLevel = dbLevels.find(lvl => lvl.minScore > currentXP)
    if (nextLevel) {
      return {
        level: parseInt(nextLevel.slug) || 1,
        name: nextLevel.name,
        description: nextLevel.description,
        minScore: nextLevel.minScore,
        slug: nextLevel.slug
      }
    }
    return null
  }
  
  // Дефолтные уровни
  const defaultLevels = [
    { level: 1, requiredXP: 0 },
    { level: 2, requiredXP: 100 },
    { level: 3, requiredXP: 300 },
    { level: 4, requiredXP: 700 },
    { level: 5, requiredXP: 1500 }
  ]
  
  const next = defaultLevels.find(lvl => lvl.requiredXP > currentXP)
  if (next) {
    return {
      level: next.level,
      name: `Уровень ${next.level}`,
      description: '',
      minScore: next.requiredXP,
      slug: next.level.toString()
    }
  }
  
  return null
}

