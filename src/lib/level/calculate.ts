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
      // Ограничиваем максимальный уровень до 6
      const levelNumber = parseInt(lvl.slug) || 1
      if (levelNumber > 6) {
        break
      }
      if (xp >= lvl.minScore) {
        currentLevel = lvl
      } else {
        break
      }
    }
    
    // Проверяем, что уровень не превышает 6
    const finalLevel = parseInt(currentLevel.slug) || 1
    if (finalLevel > 6) {
      // Находим уровень 6 в БД
      const level6 = dbLevels.find(lvl => parseInt(lvl.slug) === 6)
      if (level6) {
        currentLevel = level6
      } else {
        // Если уровня 6 нет в БД, используем последний доступный уровень <= 6
        const maxLevel = dbLevels
          .filter(lvl => parseInt(lvl.slug) <= 6)
          .sort((a, b) => parseInt(b.slug) - parseInt(a.slug))[0]
        if (maxLevel) {
          currentLevel = maxLevel
        }
      }
    }
    
    return {
      level: Math.min(6, parseInt(currentLevel.slug) || 1),
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
 * Максимальный уровень - 6
 */
function getDefaultLevel(xp: number): LevelInfo {
  const defaultLevels = [
    { level: 1, requiredXP: 0, name: 'Новичок', description: 'Начало пути' },
    { level: 2, requiredXP: 100, name: 'Ученик', description: 'Первые шаги' },
    { level: 3, requiredXP: 300, name: 'Специалист', description: 'Опытный исполнитель' },
    { level: 4, requiredXP: 700, name: 'Профессионал', description: 'Высокий уровень' },
    { level: 5, requiredXP: 1500, name: 'Мастер', description: 'Эксперт в своем деле' },
    { level: 6, requiredXP: 2100, name: 'Легенда', description: 'Вершина мастерства' }
  ]
  
  let currentLevel = defaultLevels[0]
  for (const lvl of defaultLevels) {
    if (xp >= lvl.requiredXP) {
      currentLevel = lvl
    } else {
      break
    }
  }
  
  // Ограничиваем максимальный уровень до 6
  const finalLevel = Math.min(6, currentLevel.level)
  const finalLevelData = defaultLevels.find(lvl => lvl.level === finalLevel) || defaultLevels[defaultLevels.length - 1]
  
  return {
    level: finalLevelData.level,
    name: finalLevelData.name,
    description: finalLevelData.description,
    minScore: finalLevelData.requiredXP,
    slug: finalLevelData.level.toString()
  }
}

/**
 * Получает следующий уровень для пользователя
 * Возвращает null, если достигнут максимальный уровень (6)
 */
export async function getNextLevel(currentXP: number): Promise<LevelInfo | null> {
  // Сначала получаем текущий уровень
  const currentLevelInfo = await getLevelFromXP(currentXP)
  
  // Если уже достигнут максимальный уровень (6), возвращаем null
  if (currentLevelInfo.level >= 6) {
    return null
  }
  
  const dbLevels = await prisma.userLevel.findMany({
    orderBy: { minScore: 'asc' }
  })
  
  if (dbLevels.length > 0) {
    // Фильтруем уровни, которые больше текущего и не превышают 6
    const availableLevels = dbLevels.filter(lvl => {
      const levelNum = parseInt(lvl.slug) || 1
      return levelNum > currentLevelInfo.level && levelNum <= 6 && lvl.minScore > currentXP
    })
    
    const nextLevel = availableLevels[0]
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
    { level: 5, requiredXP: 1500 },
    { level: 6, requiredXP: 2100 }
  ]
  
  // Находим следующий уровень, который больше текущего и не превышает 6
  const next = defaultLevels.find(lvl => 
    lvl.level > currentLevelInfo.level && 
    lvl.level <= 6 && 
    lvl.requiredXP > currentXP
  )
  
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

