/**
 * Утилиты для санитизации пользовательского контента и защиты от XSS
 */

/**
 * Базовая санитизация HTML - удаляет потенциально опасные теги
 */
export function sanitizeHtml(html: string): string {
	if (!html || typeof html !== 'string') {
		return ''
	}

	// Удаляем все теги, оставляя только текст
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
		.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
		.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
		.replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
		.replace(/on\w+="[^"]*"/gi, '') // Удаляем обработчики событий
		.replace(/on\w+='[^']*'/gi, '')
		.replace(/javascript:/gi, '') // Удаляем javascript: протокол
		.replace(/data:text\/html/gi, '') // Блокируем data URI
}

/**
 * Разрешенные HTML теги для форматированного текста
 */
const ALLOWED_TAGS = [
	'p',
	'br',
	'strong',
	'em',
	'u',
	's',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'ul',
	'ol',
	'li',
	'a',
	'blockquote',
	'code',
	'pre',
]

/**
 * Санитизация с сохранением безопасных тегов
 */
export function sanitizeHtmlWithTags(html: string): string {
	if (!html || typeof html !== 'string') {
		return ''
	}

	let sanitized = html

	// Удаляем опасные теги
	sanitized = sanitized
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
		.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
		.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

	// Удаляем обработчики событий
	sanitized = sanitized
		.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
		.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

	// Удаляем javascript: протокол
	sanitized = sanitized.replace(/javascript:/gi, '')

	// Очищаем атрибуты в ссылках, оставляя только href с http/https
	sanitized = sanitized.replace(
		/<a\s+([^>]*)>/gi,
		(match, attrs) => {
			const hrefMatch = attrs.match(/href=["']([^"']*)["']/i)
			if (hrefMatch) {
				const href = hrefMatch[1]
				if (href.startsWith('http://') || href.startsWith('https://')) {
					return `<a href="${href}" target="_blank" rel="noopener noreferrer">`
				}
				return '<a>'
			}
			return '<a>'
		}
	)

	return sanitized
}

/**
 * Экранирование HTML спецсимволов (для plain text)
 */
export function escapeHtml(text: string): string {
	if (!text || typeof text !== 'string') {
		return ''
	}

	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	}

	return text.replace(/[&<>"']/g, char => map[char] || char)
}

/**
 * Очистка текста от потенциально опасных символов
 */
export function sanitizeText(text: string, maxLength?: number): string {
	if (!text || typeof text !== 'string') {
		return ''
	}

	// Убираем управляющие символы (кроме переноса строки и табуляции)
	let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

	// Обрезаем до максимальной длины
	if (maxLength && cleaned.length > maxLength) {
		cleaned = cleaned.substring(0, maxLength)
	}

	return cleaned.trim()
}

/**
 * Валидация и санитизация URL
 */
export function sanitizeUrl(url: string): string | null {
	if (!url || typeof url !== 'string') {
		return null
	}

	const trimmed = url.trim()

	// Разрешаем только http, https, относительные пути
	if (
		trimmed.startsWith('http://') ||
		trimmed.startsWith('https://') ||
		trimmed.startsWith('/') ||
		trimmed.startsWith('#')
	) {
		// Удаляем опасные протоколы
		if (
			trimmed.startsWith('javascript:') ||
			trimmed.startsWith('data:') ||
			trimmed.startsWith('vbscript:')
		) {
			return null
		}

		try {
			// Пытаемся распарсить URL
			if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
				new URL(trimmed)
			}
			return trimmed
		} catch {
			return null
		}
	}

	return null
}

