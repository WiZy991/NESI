/**
 * Утилиты для создания SEO-friendly slug'ов
 * Требования: только латиница, нижний регистр, дефис между словами
 */

// Таблица транслитерации русского алфавита
const TRANSLIT_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'Zh',
  З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O',
  П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'Ts',
  Ч: 'Ch', Ш: 'Sh', Щ: 'Sch', Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu',
  Я: 'Ya'
}

/**
 * Транслитерирует русский текст в латиницу
 */
function transliterate(text: string): string {
  return text
    .split('')
    .map(char => TRANSLIT_MAP[char] || char)
    .join('')
}

/**
 * Создает SEO-friendly slug из текста
 * 
 * @param text - Исходный текст (может быть на русском или английском)
 * @returns Slug в формате: только латиница, нижний регистр, дефис между словами
 * 
 * @example
 * slugify("Веб-разработка") // "veb-razrabotka"
 * slugify("Frontend Developer") // "frontend-developer"
 * slugify("JavaScript & TypeScript") // "javascript-typescript"
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // 1. Транслитерация русского текста
  let slug = transliterate(text.trim())

  // 2. Преобразование в нижний регистр
  slug = slug.toLowerCase()

  // 3. Замена пробелов и специальных символов на дефисы
  slug = slug.replace(/[\s_]+/g, '-') // пробелы и подчеркивания
  slug = slug.replace(/[^\w\-а-яё]+/gi, '-') // все не-буквы/цифры/дефисы

  // 4. Удаление множественных дефисов
  slug = slug.replace(/-+/g, '-')

  // 5. Удаление дефисов в начале и конце
  slug = slug.replace(/^-+|-+$/g, '')

  // 6. Если получилась пустая строка, создаем fallback
  if (!slug) {
    slug = 'untitled'
  }

  // 7. Ограничение длины (максимум 100 символов)
  if (slug.length > 100) {
    slug = slug.substring(0, 100).replace(/-+$/, '')
  }

  return slug
}

/**
 * Создает уникальный slug, добавляя суффикс если нужно
 * 
 * @param baseText - Базовый текст для slug
 * @param existingSlugs - Массив существующих slug'ов для проверки уникальности
 * @returns Уникальный slug
 */
export function createUniqueSlug(
  baseText: string,
  existingSlugs: string[] = []
): string {
  const baseSlug = slugify(baseText)
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }

  // Если slug уже существует, добавляем числовой суффикс
  let counter = 1
  let uniqueSlug = `${baseSlug}-${counter}`
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++
    uniqueSlug = `${baseSlug}-${counter}`
    
    // Защита от бесконечного цикла
    if (counter > 1000) {
      uniqueSlug = `${baseSlug}-${Date.now()}`
      break
    }
  }

  return uniqueSlug
}

/**
 * Валидация slug (проверка соответствия требованиям)
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false
  }

  // Должен содержать только латиницу, цифры и дефисы
  const slugRegex = /^[a-z0-9-]+$/
  
  // Не должен начинаться или заканчиваться дефисом
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false
  }

  // Не должен содержать двойные дефисы
  if (slug.includes('--')) {
    return false
  }

  // Должен соответствовать regex
  return slugRegex.test(slug)
}

