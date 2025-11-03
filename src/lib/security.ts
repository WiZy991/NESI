/**
 * Утилиты для безопасности платформы
 */

/**
 * Безопасная установка cookie с правильными флагами
 */
export function setSecureCookie(
  token: string,
  isProduction: boolean = process.env.NODE_ENV === 'production'
) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  }
}

/**
 * Санитизация текста от XSS
 * Удаляет потенциально опасные HTML теги и символы
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  // Удаляем HTML теги
  let sanitized = text.replace(/<[^>]*>/g, '')
  
  // Экранируем опасные символы
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
  
  return sanitized.trim()
}

/**
 * Валидация длины строки для БД
 */
export function validateStringLength(
  text: string,
  maxLength: number,
  fieldName: string
): { valid: boolean; error?: string } {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: `${fieldName} должен быть строкой` }
  }
  
  if (text.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} слишком длинный (максимум ${maxLength} символов)`,
    }
  }
  
  return { valid: true }
}

/**
 * Проверка на path traversal атаки
 */
export function isValidFileName(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') return false
  
  // Запрещаем опасные символы и пути
  const dangerousPatterns = [
    /\.\./,           // .. (path traversal)
    /\//,             // /
    /\\/,             // \
    /^\./,            // начинается с точки (скрытые файлы)
    /[\x00-\x1f]/,    // управляющие символы
    /[<>:"|?*]/,      // запрещенные символы в именах файлов Windows
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(fileName)) return false
  }
  
  return fileName.length > 0 && fileName.length <= 255
}

/**
 * Нормализация имени файла
 */
export function normalizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return 'file'
  
  // Удаляем опасные символы
  let normalized = fileName
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '_')
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim()
  
  // Если после очистки ничего не осталось
  if (!normalized || normalized.length === 0) {
    normalized = 'file'
  }
  
  // Ограничиваем длину
  if (normalized.length > 255) {
    const ext = normalized.substring(normalized.lastIndexOf('.'))
    const name = normalized.substring(0, 250 - ext.length)
    normalized = name + ext
  }
  
  return normalized
}

/**
 * Генерация безопасного CSRF токена
 */
export function generateCSRFToken(): string {
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Валидация email с защитой от инъекций
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  
  // Базовая проверка формата
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return false
  
  // Проверка длины (макс 254 символа по RFC)
  if (email.length > 254) return false
  
  // Проверка на опасные символы
  const dangerousChars = /[<>\"'%;()&+]/
  if (dangerousChars.test(email)) return false
  
  return true
}

/**
 * Очистка объекта от опасных полей
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowedFields: string[]
): Partial<T> {
  const sanitized: Partial<T> = {}
  
  for (const field of allowedFields) {
    if (field in obj && obj[field] !== undefined) {
      sanitized[field as keyof T] = obj[field]
    }
  }
  
  return sanitized
}

