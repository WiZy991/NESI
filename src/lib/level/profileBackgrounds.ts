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
    description: 'Классический темный фон с легким мерцанием',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    unlockLevel: 1,
  },
  {
    id: 'dark-blue',
    name: 'Закат',
    description: 'Теплый закатный градиент с мягкими переливами',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 25%, #6366f1 50%, #8b5cf6 75%, #a78bfa 100%)',
    unlockLevel: 1,
  },
  
  // Уровень 2 - зеленые фоны
  {
    id: 'emerald',
    name: 'Изумрудный',
    description: 'Яркий зеленый градиент с анимированными каплями',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 25%, #059669 50%, #10b981 75%, #34d399 100%)',
    unlockLevel: 2,
  },
  {
    id: 'forest',
    name: 'Лесной',
    description: 'Природный зеленый градиент с природными элементами',
    gradient: 'linear-gradient(135deg, #14532d 0%, #166534 25%, #15803d 50%, #16a34a 75%, #22c55e 100%)',
    unlockLevel: 2,
  },
  
  // Уровень 3 - синие фоны
  {
    id: 'ocean',
    name: 'Океан',
    description: 'Глубокий синий океан с анимированными волнами',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #075985 25%, #0369a1 50%, #0284c7 75%, #0ea5e9 100%)',
    unlockLevel: 3,
  },
  {
    id: 'sky',
    name: 'Небо',
    description: 'Светло-синий небосвод с плывущими облаками',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 25%, #3b82f6 50%, #60a5fa 75%, #93c5fd 100%)',
    unlockLevel: 3,
  },
  {
    id: 'nebula',
    name: 'Туманность',
    description: 'Космический синий с вращающимися частицами',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4f46e5 50%, #6366f1 75%, #818cf8 100%)',
    unlockLevel: 3,
  },
  
  // Уровень 4 - фиолетовые фоны
  {
    id: 'purple-dream',
    name: 'Фиолетовая мечта',
    description: 'Глубокий фиолетовый с магическими частицами',
    gradient: 'linear-gradient(135deg, #581c87 0%, #6b21a8 25%, #7c3aed 50%, #8b5cf6 75%, #a78bfa 100%)',
    unlockLevel: 4,
  },
  {
    id: 'violet',
    name: 'Фиалковый',
    description: 'Нежный фиолетовый с плавными переливами',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 25%, #6d28d9 50%, #7c3aed 75%, #8b5cf6 100%)',
    unlockLevel: 4,
  },
  {
    id: 'cosmic',
    name: 'Космический',
    description: 'Космический фиолетовый со звездами и туманностью',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4f46e5 50%, #7c3aed 75%, #a78bfa 100%)',
    unlockLevel: 4,
  },
  
  // Уровень 5 - золотые фоны (премиум)
  {
    id: 'golden',
    name: 'Золотой',
    description: 'Роскошный золотой с блестящими частицами и сиянием',
    gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 25%, #ca8a04 50%, #eab308 75%, #fbbf24 100%)',
    unlockLevel: 5,
    isPremium: true,
  },
  {
    id: 'sunset',
    name: 'Закат',
    description: 'Теплый закатный с светящимися лучами и пульсирующим солнцем',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 25%, #ea580c 50%, #f97316 75%, #fb923c 100%)',
    unlockLevel: 5,
    isPremium: true,
  },
  {
    id: 'royal',
    name: 'Королевский',
    description: 'Королевский градиент с мерцающими звездами и сиянием',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 25%, #6366f1 50%, #818cf8 75%, #c7d2fe 100%)',
    unlockLevel: 5,
    isPremium: true,
  },
  
  // Уровень 6+ - легендарные фоны (премиум)
  {
    id: 'legendary',
    name: 'Легендарный',
    description: 'Эксклюзивный легендарный фон с золотыми частицами и мощной аурой',
    gradient: 'linear-gradient(135deg, #1c1917 0%, #78350f 20%, #a16207 40%, #f59e0b 60%, #fbbf24 80%, #fde047 100%)',
    unlockLevel: 6,
    isPremium: true,
  },
  {
    id: 'rainbow',
    name: 'Радужный',
    description: 'Яркий радужный градиент с переливающимися частицами всех цветов',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ea580c 16%, #f59e0b 33%, #eab308 50%, #84cc16 66%, #22c55e 83%, #10b981 100%)',
    unlockLevel: 6,
    isPremium: true,
  },
  {
    id: 'galaxy',
    name: 'Галактика',
    description: 'Космическая галактика с множеством звезд и движущейся туманностью',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 20%, #312e81 40%, #6366f1 60%, #8b5cf6 80%, #c084fc 100%)',
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

