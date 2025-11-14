/**
 * Система фонов профиля с разблокировкой по уровням
 */

export type ProfileBackground = {
  id: string
  name: string
  description: string
  gradient: string // CSS gradient
  unlockLevel: number // Минимальный уровень для разблокировки
  isPremium?: boolean // Премиум фон (только для высоких уровней)
}

export const PROFILE_BACKGROUNDS: ProfileBackground[] = [
  // Уровень 1 - базовые фоны (доступны всем)
  {
    id: 'default',
    name: 'По умолчанию',
    description: 'Классический темный фон',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    unlockLevel: 1,
  },
  {
    id: 'dark-blue',
    name: 'Темно-синий',
    description: 'Глубокий синий оттенок',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
    unlockLevel: 1,
  },
  
  // Уровень 2 - зеленые фоны
  {
    id: 'emerald',
    name: 'Изумрудный',
    description: 'Зеленый градиент',
    gradient: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
    unlockLevel: 2,
  },
  {
    id: 'forest',
    name: 'Лесной',
    description: 'Природный зеленый',
    gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
    unlockLevel: 2,
  },
  
  // Уровень 3 - синие фоны
  {
    id: 'ocean',
    name: 'Океан',
    description: 'Глубокий синий океан',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
    unlockLevel: 3,
  },
  {
    id: 'sky',
    name: 'Небо',
    description: 'Светло-синий небосвод',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    unlockLevel: 3,
  },
  {
    id: 'nebula',
    name: 'Туманность',
    description: 'Космический синий',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
    unlockLevel: 3,
  },
  
  // Уровень 4 - фиолетовые фоны
  {
    id: 'purple-dream',
    name: 'Фиолетовая мечта',
    description: 'Глубокий фиолетовый',
    gradient: 'linear-gradient(135deg, #581c87 0%, #7c3aed 100%)',
    unlockLevel: 4,
  },
  {
    id: 'violet',
    name: 'Фиалковый',
    description: 'Нежный фиолетовый',
    gradient: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)',
    unlockLevel: 4,
  },
  {
    id: 'cosmic',
    name: 'Космический',
    description: 'Космический фиолетовый',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a78bfa 100%)',
    unlockLevel: 4,
  },
  
  // Уровень 5 - золотые фоны (премиум)
  {
    id: 'golden',
    name: 'Золотой',
    description: 'Роскошный золотой',
    gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 50%, #ca8a04 100%)',
    unlockLevel: 5,
    isPremium: true,
  },
  {
    id: 'sunset',
    name: 'Закат',
    description: 'Теплый закатный',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #f59e0b 100%)',
    unlockLevel: 5,
    isPremium: true,
  },
  {
    id: 'royal',
    name: 'Королевский',
    description: 'Королевский градиент',
    gradient: 'linear-gradient(135deg, #451a03 0%, #92400e 50%, #d97706 100%)',
    unlockLevel: 5,
    isPremium: true,
  },
  
  // Уровень 6+ - легендарные фоны (премиум)
  {
    id: 'legendary',
    name: 'Легендарный',
    description: 'Эксклюзивный легендарный фон',
    gradient: 'linear-gradient(135deg, #1c1917 0%, #78350f 25%, #a16207 50%, #f59e0b 75%, #fbbf24 100%)',
    unlockLevel: 6,
    isPremium: true,
  },
  {
    id: 'rainbow',
    name: 'Радужный',
    description: 'Яркий радужный градиент',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 20%, #f59e0b 40%, #eab308 60%, #84cc16 80%, #22c55e 100%)',
    unlockLevel: 6,
    isPremium: true,
  },
  {
    id: 'galaxy',
    name: 'Галактика',
    description: 'Космическая галактика',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #312e81 50%, #6366f1 75%, #a78bfa 100%)',
    unlockLevel: 6,
    isPremium: true,
  },
]

/**
 * Получает доступные фоны для уровня пользователя
 */
export function getAvailableBackgrounds(level: number): ProfileBackground[] {
  return PROFILE_BACKGROUNDS.filter(bg => bg.unlockLevel <= level)
}

/**
 * Получает фон по ID
 */
export function getBackgroundById(id: string): ProfileBackground | undefined {
  return PROFILE_BACKGROUNDS.find(bg => bg.id === id)
}

/**
 * Проверяет, разблокирован ли фон для уровня
 */
export function isBackgroundUnlocked(backgroundId: string, level: number): boolean {
  const background = getBackgroundById(backgroundId)
  if (!background) return false
  return background.unlockLevel <= level
}

