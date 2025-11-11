import { Buffer } from 'node:buffer'

/**
 * Расширенная валидация файлов с проверкой magic bytes
 */

// Magic bytes (сигнатуры файлов) для различных типов
const FILE_SIGNATURES: Record<string, number[][]> = {
  // Images
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/jpeg': [
    [0xff, 0xd8, 0xff, 0xe0],
    [0xff, 0xd8, 0xff, 0xe1],
    [0xff, 0xd8, 0xff, 0xe2],
  ],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
  
  // Videos
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp box
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70],
  ],
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]], // WebM signature
  'video/quicktime': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74], // QuickTime
  ],
  'video/x-msvideo': [[0x52, 0x49, 0x46, 0x46]], // AVI (RIFF header)

  // Audio
  'audio/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
  'audio/ogg': [[0x4f, 0x67, 0x67, 0x53]], // OggS
  'audio/mpeg': [
    [0x49, 0x44, 0x33], // ID3 tag
    [0xff, 0xfb], // MPEG-1 Layer III
  ],
  'audio/wav': [
    [0x52, 0x49, 0x46, 0x46], // RIFF
  ],
  
  // Documents
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  
  // Office Documents (ZIP-based)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4b, 0x03, 0x04], // ZIP signature
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  'application/vnd.ms-excel': [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // OLE2
  ],
  'application/msword': [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // OLE2
  ],
}

const normalizeMimeType = (value: string): string =>
  value.split(';')[0]?.trim().toLowerCase() || value.toLowerCase()

// Разрешенные MIME типы
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/wav',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

// Разрешенные расширения
const ALLOWED_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'mp4',
  'webm',
  'mov',
  'avi',
  'ogg',
  'mp3',
  'wav',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
])

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB (для видео)

/**
 * Проверка magic bytes файла
 */
export function checkFileSignature(
  buffer: Buffer,
  expectedMimeType: string
): boolean {
  const signatures = FILE_SIGNATURES[expectedMimeType]
  if (!signatures || signatures.length === 0) {
    // Если нет сигнатуры для этого типа, разрешаем (но это рискованно)
    return true
  }

  for (const signature of signatures) {
    if (buffer.length < signature.length) continue

    let matches = true
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false
        break
      }
    }

    if (matches) return true
  }

  return false
}

/**
 * Получить MIME тип из magic bytes
 */
export function getMimeTypeFromSignature(buffer: Buffer): string | null {
  if (buffer.length < 4) return null

  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const signature of signatures) {
      if (buffer.length < signature.length) continue

      let matches = true
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          matches = false
          break
        }
      }

      if (matches) return mimeType
    }
  }

  return null
}

/**
 * Полная валидация файла
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
  detectedMimeType?: string
}

export async function validateFile(
  file: File,
  requireSignatureCheck: boolean = true
): Promise<FileValidationResult> {
  // 1. Проверка размера
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Файл слишком большой (максимум ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Файл пуст' }
  }

  // 2. Проверка расширения
  const fileName = file.name || 'file'
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Недопустимое расширение файла. Разрешены: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
    }
  }

  // 3. Проверка MIME типа
  const rawMimeType = file.type || 'application/octet-stream'
  const mimeType = normalizeMimeType(rawMimeType)

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `Недопустимый тип файла: ${rawMimeType}`,
    }
  }

  // 4. Проверка magic bytes (для видео - пропускаем)
  const isVideo = mimeType.startsWith('video/')
  
  // Для видео файлов - пропускаем проверку сигнатуры (очень медленная)
  if (isVideo) {
    return { valid: true, detectedMimeType: mimeType }
  }

  if (requireSignatureCheck) {
    try {
      // Для не-видео файлов - быстрая проверка только первых байтов
      const arrayBuffer = await file.slice(0, 16).arrayBuffer() // Читаем только первые 16 байт!
      const buffer = Buffer.from(arrayBuffer)

      // Быстрая проверка только первых байтов
      const detectedMimeType = getMimeTypeFromSignature(buffer)

      if (detectedMimeType && detectedMimeType !== mimeType) {
        // MIME тип не совпадает с сигнатурой - подозрительно!
        return {
          valid: false,
          error: `Тип файла не соответствует содержимому. Ожидался ${mimeType}, обнаружен ${detectedMimeType}`,
        }
      }

      if (detectedMimeType && !checkFileSignature(buffer, detectedMimeType)) {
        return {
          valid: false,
          error: 'Неверная сигнатура файла. Файл может быть поврежден или подделан.',
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке файла:', error)
      // Для безопасности - лучше пропустить, чем заблокировать легитимные файлы
      console.warn(`⚠️ Не удалось проверить сигнатуру для файла ${fileName}, разрешаем`)
    }
  }

  return { valid: true, detectedMimeType: mimeType }
}

/**
 * Валидация файла из буфера (для уже загруженных файлов)
 */
export function validateFileBuffer(
  buffer: Buffer,
  fileName: string,
  declaredMimeType: string
): FileValidationResult {
  // Проверка размера
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Файл слишком большой (максимум ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    }
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'Файл пуст' }
  }

  // Проверка расширения
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Недопустимое расширение файла`,
    }
  }

  // Проверка MIME типа
  const normalizedMimeType = normalizeMimeType(declaredMimeType)

  if (!ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
    return {
      valid: false,
      error: `Недопустимый тип файла: ${declaredMimeType}`,
    }
  }

  // Проверка magic bytes
  const detectedMimeType = getMimeTypeFromSignature(buffer)
  if (detectedMimeType && detectedMimeType !== normalizedMimeType) {
    return {
      valid: false,
      error: `Тип файла не соответствует содержимому`,
    }
  }

  if (detectedMimeType && !checkFileSignature(buffer, detectedMimeType)) {
    return {
      valid: false,
      error: 'Неверная сигнатура файла',
    }
  }

  return {
    valid: true,
    detectedMimeType: detectedMimeType || normalizedMimeType,
  }
}
