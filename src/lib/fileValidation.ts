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

// Разрешенные MIME типы (расширенный список для всех подкатегорий)
const ALLOWED_MIME_TYPES = new Set([
  // Изображения
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/vnd.adobe.photoshop',
  // Видео
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/mpeg',
  // Аудио
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/aac',
  'audio/x-m4a',
  // Документы
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  // Архивы
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-rar',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-gzip',
  // Текстовые файлы
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'text/xml',
  'application/json',
  'application/xml',
  'text/csv',
  'text/yaml',
  'application/x-yaml',
  // Код
  'text/x-python',
  'text/x-java',
  'text/x-c++',
  'text/x-c',
  'text/x-php',
  'text/x-ruby',
  'text/x-go',
  'application/javascript',
  'application/typescript',
  'application/x-sh',
  // Дизайн-файлы
  'application/postscript',
  'application/x-illustrator',
  'application/vnd.adobe.illustrator',
  // Другие (разрешаем для файлов без специфического MIME типа, но с известным расширением)
  'application/octet-stream',
])

// Разрешенные расширения (расширенный список для всех подкатегорий)
const ALLOWED_EXTENSIONS = new Set([
  // Изображения
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'bmp',
  'tiff',
  'ico',
  'psd',
  'ai',
  'eps',
  // Видео
  'mp4',
  'webm',
  'mov',
  'avi',
  'wmv',
  'flv',
  'mpeg',
  'mpg',
  // Аудио
  'ogg',
  'mp3',
  'wav',
  'flac',
  'aac',
  'm4a',
  // Документы
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  // Архивы
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'bz2',
  // Текстовые файлы
  'txt',
  'md',
  'html',
  'htm',
  'css',
  'js',
  'xml',
  'json',
  'csv',
  'yaml',
  'yml',
  'ini',
  'log',
  // Код
  'py',
  'java',
  'cpp',
  'c',
  'cc',
  'cxx',
  'h',
  'hpp',
  'php',
  'rb',
  'go',
  'rs',
  'swift',
  'kt',
  'ts',
  'tsx',
  'jsx',
  'vue',
  'svelte',
  'scss',
  'sass',
  'less',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ps1',
  'bat',
  'cmd',
  // Дизайн-файлы
  'fig',
  'sketch',
  'xd',
  // 3D модели
  'obj',
  'fbx',
  '3ds',
  'blend',
  'stl',
  'dae',
  // Другие
  'lock',
  'env',
  'gitignore',
  'dockerfile',
  'makefile',
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

  // Разрешаем файлы с известным расширением, даже если MIME тип application/octet-stream
  const isKnownExtension = ext && ALLOWED_EXTENSIONS.has(ext)
  const isAllowedMimeType = ALLOWED_MIME_TYPES.has(mimeType)
  
  if (!isAllowedMimeType && !(isKnownExtension && mimeType === 'application/octet-stream')) {
    return {
      valid: false,
      error: `Недопустимый тип файла: ${rawMimeType}. Разрешенные типы: изображения, видео, аудио, документы, архивы, код, дизайн-файлы`,
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

  // Разрешаем файлы с известным расширением, даже если MIME тип application/octet-stream
  const isKnownExtension = ext && ALLOWED_EXTENSIONS.has(ext)
  const isAllowedMimeType = ALLOWED_MIME_TYPES.has(normalizedMimeType)
  
  if (!isAllowedMimeType && !(isKnownExtension && normalizedMimeType === 'application/octet-stream')) {
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
