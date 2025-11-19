/**
 * Анализ текста задачи для определения сложности, объема и других параметров
 */

import type { TaskType } from './taskPriceKnowledge'

export interface TaskAnalysis {
	complexity: 'simple' | 'medium' | 'complex' | 'very_complex'
	volume: 'small' | 'medium' | 'large' | 'very_large'
	urgency: 'normal' | 'urgent' | 'very_urgent'
	technologies: string[]
	keywords: string[]
	estimatedHours: number
	taskTypeId?: string // ID типа задачи из базы знаний
	quantitativeData?: QuantitativeData // Извлеченные количественные данные
}

/**
 * Количественные данные, извлеченные из текста задачи
 */
export interface QuantitativeData {
	pages?: number // Количество страниц
	modules?: number // Количество модулей
	functions?: number // Количество функций
	components?: number // Количество компонентов
	items?: number // Количество элементов/товаров
	hours?: number // Упомянутые часы
	days?: number // Упомянутые дни
	weeks?: number // Упомянутые недели
	months?: number // Упомянутые месяцы
}

/**
 * Ключевые слова для определения сложности
 * Расширенный список для более точного определения
 */
const COMPLEXITY_KEYWORDS = {
	simple: [
		'просто', 'легко', 'быстро', 'несложно', 'базовый', 'стандартный',
		'шаблон', 'готовый', 'копировать', 'настроить', 'установить',
		'простая задача', 'легкая задача', 'быстрая задача', 'небольшая задача',
		'минимальная', 'базовая', 'элементарная', 'тривиальная', 'простой',
		'легкий', 'быстрый', 'небольшой', 'минимальный', 'элементарный',
		'за час', 'за пару часов', 'быстро сделать', 'легко сделать',
		'простое', 'легкое', 'быстрое', 'небольшое', 'минимальное'
	],
	medium: [
		'средний', 'обычный', 'стандартный', 'типовой', 'модификация',
		'доработка', 'исправление', 'обновление', 'интеграция',
		'средняя задача', 'обычная задача', 'стандартная задача', 'типовая задача',
		'модификация', 'доработка', 'исправление', 'обновление',
		'средняя сложность', 'обычная сложность', 'стандартная сложность',
		'несколько дней', 'неделя', 'за неделю', 'несколько недель',
		'среднее', 'обычное', 'стандартное', 'типовое', 'модифицировать',
		'доработать', 'исправить', 'обновить', 'интегрировать'
	],
	complex: [
		'сложный', 'трудный', 'с нуля', 'разработка', 'создание',
		'архитектура', 'оптимизация', 'рефакторинг', 'миграция',
		'кастомный', 'уникальный', 'индивидуальный', 'специфичный',
		'сложная задача', 'трудная задача', 'разработка с нуля', 'создание с нуля',
		'архитектура', 'оптимизация', 'рефакторинг', 'миграция',
		'кастомный', 'уникальный', 'индивидуальный', 'специфичный',
		'месяц', 'несколько месяцев', 'долгосрочный', 'долгосрочная',
		'сложное', 'трудное', 'разработать', 'создать', 'архитектурный',
		'оптимизировать', 'рефакторить', 'мигрировать', 'кастомизировать',
		'уникальное', 'индивидуальное', 'специфичное', 'нестандартное'
	],
	very_complex: [
		'очень сложный', 'высокая сложность', 'enterprise', 'масштабируемый',
		'микросервисы', 'распределенная система', 'высокая нагрузка',
		'безопасность', 'критичный', 'production', 'enterprise-grade',
		'маркетплейс', 'marketplace', 'платформа', 'платформа уровня',
		'как wildberries', 'как вб', 'как амазон', 'как amazon',
		'полноценный', 'с нуля', 'создать с нуля', 'разработать с нуля',
		'система', 'комплексная система', 'интеграция', 'множество',
		'высоконагруженный', 'высоконагруженная', 'миллионы пользователей',
		'очень сложная', 'высокая сложность', 'enterprise уровень', 'enterprise grade',
		'микросервисная архитектура', 'распределенная система', 'высокая нагрузка',
		'критическая система', 'production ready', 'enterprise решение',
		'полноценная платформа', 'комплексная платформа', 'масштабная система',
		'высоконагруженная система', 'миллионы пользователей', 'тысячи пользователей',
		'несколько месяцев', 'полгода', 'год', 'долгосрочный проект',
		'очень сложное', 'enterprise', 'микросервисы', 'распределенная',
		'высоконагруженная', 'критическая', 'production', 'комплексная',
		'масштабная', 'полноценная', 'система', 'платформа', 'решение'
	]
}

/**
 * Ключевые слова для определения объема
 * Расширенный список для более точного определения
 */
const VOLUME_KEYWORDS = {
	small: [
		'одна страница', 'один элемент', 'одна функция', 'маленький',
		'небольшой', 'минимальный', 'быстро', 'несколько часов',
		'одна кнопка', 'один компонент', 'одна форма', 'один модуль',
		'маленькая задача', 'небольшая задача', 'минимальная задача',
		'за час', 'за пару часов', 'за несколько часов', 'быстро',
		'маленькое', 'небольшое', 'минимальное', 'один', 'одна',
		'простая страница', 'один файл', 'одна часть', 'один блок'
	],
	medium: [
		'несколько страниц', 'несколько функций', 'средний объем',
		'несколько дней', 'неделя', 'частично',
		'несколько компонентов', 'несколько модулей', 'несколько элементов',
		'средняя задача', 'обычная задача', 'стандартная задача',
		'несколько страниц', '2-3 страницы', '3-5 страниц', '5-10 страниц',
		'неделя', 'за неделю', 'несколько дней', '3-5 дней', '5-7 дней',
		'среднее', 'несколько', 'частично', 'некоторые', 'ряд'
	],
	large: [
		'много', 'несколько модулей', 'полный', 'комплексный',
		'несколько недель', 'месяц', 'большой проект',
		'много страниц', 'много функций', 'много модулей', 'много компонентов',
		'большая задача', 'крупная задача', 'масштабная задача',
		'несколько недель', '2-3 недели', '3-4 недели', 'месяц', 'за месяц',
		'полный', 'комплексный', 'большой', 'крупный', 'масштабный',
		'много', 'множество', 'несколько', 'ряд', 'комплекс'
	],
	very_large: [
		'очень большой', 'полноценный', 'enterprise', 'многостраничный',
		'система', 'платформа', 'долгосрочный', 'несколько месяцев',
		'маркетплейс', 'marketplace', 'как wildberries', 'как вб',
		'комплексный проект', 'масштабный проект', 'большой проект',
		'множество функций', 'много модулей', 'много страниц',
		'очень большая задача', 'полноценная система', 'enterprise решение',
		'многостраничный сайт', 'десятки страниц', 'сотни страниц',
		'несколько месяцев', '2-3 месяца', '3-6 месяцев', 'полгода', 'год',
		'долгосрочный проект', 'долгосрочная разработка',
		'полноценная платформа', 'комплексная система', 'масштабная система',
		'множество модулей', 'множество функций', 'множество страниц',
		'десятки модулей', 'десятки функций', 'сотни страниц',
		'очень большое', 'полноценное', 'enterprise', 'многостраничное',
		'система', 'платформа', 'долгосрочное', 'комплексное', 'масштабное',
		'множество', 'десятки', 'сотни', 'много', 'полный', 'комплекс'
	]
}

/**
 * Ключевые слова для определения срочности
 */
const URGENCY_KEYWORDS = {
	normal: [],
	urgent: [
		'срочно', 'быстро', 'как можно скорее', 'в ближайшее время',
		'нужно быстро', 'поскорее', 'в приоритете'
	],
	very_urgent: [
		'очень срочно', 'критично', 'сегодня', 'завтра', 'немедленно',
		'asap', 'as soon as possible', 'вчера', 'горящий'
	]
}

/**
 * Популярные технологии для поиска
 */
const TECHNOLOGY_KEYWORDS = [
	'react', 'vue', 'angular', 'next.js', 'nuxt', 'svelte',
	'node.js', 'express', 'nestjs', 'django', 'flask', 'laravel',
	'php', 'python', 'javascript', 'typescript', 'java', 'c#', 'c++',
	'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
	'aws', 'azure', 'gcp', 'docker', 'kubernetes',
	'html', 'css', 'scss', 'sass', 'tailwind', 'bootstrap',
	'figma', 'adobe', 'photoshop', 'illustrator',
	'wordpress', 'shopify', 'magento', 'woocommerce'
]

/**
 * Анализирует текст задачи и возвращает параметры
 */
export function analyzeTaskText(title: string, description: string): TaskAnalysis {
	const fullText = `${title} ${description}`.toLowerCase()
	const originalText = `${title} ${description}`
	
	// Импортируем базу знаний
	let taskType: TaskType | null = null
	try {
		const { findTaskType } = require('./taskPriceKnowledge')
		taskType = findTaskType(title, description)
	} catch (err) {
		// Если база знаний недоступна, продолжаем без неё
	}
	
	// Извлекаем количественные данные ПЕРВЫМ ДЕЛОМ
	const quantitativeData = extractQuantitativeData(originalText)
	
	// Определяем сложность (используем из базы знаний если найдена)
	const complexity = taskType 
		? taskType.complexity 
		: determineComplexity(fullText)
	
	// Определяем объем (теперь с учетом количественных данных и базы знаний)
	const volume = determineVolume(fullText, description.length, quantitativeData, taskType)
	
	// Определяем срочность
	const urgency = determineUrgency(fullText)
	
	// Извлекаем технологии
	const technologies = extractTechnologies(fullText)
	
	// Извлекаем ключевые слова
	const keywords = extractKeywords(fullText)
	
	// Оцениваем количество часов (с учетом количественных данных и базы знаний)
	const estimatedHours = estimateHours(
		complexity, 
		volume, 
		description.length, 
		quantitativeData, 
		taskType
	)
	
	return {
		complexity,
		volume,
		urgency,
		technologies,
		keywords,
		estimatedHours,
		taskTypeId: taskType?.id,
		quantitativeData
	}
}

/**
 * Определяет сложность задачи
 */
function determineComplexity(text: string): TaskAnalysis['complexity'] {
	// Если текст очень короткий (меньше 50 символов), считаем простым
	if (text.length < 50) {
		return 'simple'
	}
	
	let veryComplexCount = 0
	let complexCount = 0
	let mediumCount = 0
	let simpleCount = 0
	
	COMPLEXITY_KEYWORDS.very_complex.forEach(keyword => {
		if (text.includes(keyword)) veryComplexCount++
	})
	
	COMPLEXITY_KEYWORDS.complex.forEach(keyword => {
		if (text.includes(keyword)) complexCount++
	})
	
	COMPLEXITY_KEYWORDS.medium.forEach(keyword => {
		if (text.includes(keyword)) mediumCount++
	})
	
	COMPLEXITY_KEYWORDS.simple.forEach(keyword => {
		if (text.includes(keyword)) simpleCount++
	})
	
	if (veryComplexCount > 0) return 'very_complex'
	if (complexCount > 1 || (complexCount > 0 && text.length > 1000)) return 'complex'
	// Если текст очень длинный (> 2000 символов), вероятно сложная задача
	if (text.length > 2000) return 'complex'
	if (mediumCount > 0 || text.length > 500) return 'medium'
	return 'simple'
}

/**
 * Извлекает количественные данные из текста
 */
function extractQuantitativeData(text: string): QuantitativeData {
	const data: QuantitativeData = {}
	const lowerText = text.toLowerCase()
	
	// Паттерны для извлечения чисел с единицами измерения
	const patterns = {
		// Страницы: "3 страницы", "три страницы", "5 страниц"
		pages: [
			/(\d+)\s*(?:страниц|страницы|страница|page|pages)/i,
			/(?:один|одна|одну|одной|одним)\s*(?:страниц|страницы|страница|page)/i,
			/(?:две|двух|двумя)\s*(?:страниц|страницы|страница|page)/i,
			/(?:три|трех|тремя)\s*(?:страниц|страницы|страница|page)/i,
			/(?:четыре|четырех|четырьмя)\s*(?:страниц|страницы|страница|page)/i,
			/(?:пять|пяти|пятью)\s*(?:страниц|страницы|страница|page)/i,
			/(?:шесть|шести|шестью)\s*(?:страниц|страницы|страница|page)/i,
			/(?:семь|семи|семью)\s*(?:страниц|страницы|страница|page)/i,
			/(?:восемь|восьми|восемью)\s*(?:страниц|страницы|страница|page)/i,
			/(?:девять|девяти|девятью)\s*(?:страниц|страницы|страница|page)/i,
			/(?:десять|десяти|десятью)\s*(?:страниц|страницы|страница|page)/i,
		],
		// Модули: "5 модулей", "три модуля"
		modules: [
			/(\d+)\s*(?:модул|модуля|модулей|module|modules)/i,
			/(?:один|одна|одну|одной|одним)\s*(?:модул|модуля|модулей|module)/i,
			/(?:два|две|двух|двумя)\s*(?:модул|модуля|модулей|module)/i,
			/(?:три|трех|тремя)\s*(?:модул|модуля|модулей|module)/i,
		],
		// Функции: "10 функций", "пять функций"
		functions: [
			/(\d+)\s*(?:функц|функции|функций|function|functions)/i,
			/(?:один|одна|одну|одной|одним)\s*(?:функц|функции|функций|function)/i,
			/(?:две|двух|двумя)\s*(?:функц|функции|функций|function)/i,
			/(?:три|трех|тремя)\s*(?:функц|функции|функций|function)/i,
		],
		// Компоненты: "3 компонента", "два компонента"
		components: [
			/(\d+)\s*(?:компонент|компонента|компонентов|component|components)/i,
			/(?:один|одна|одну|одной|одним)\s*(?:компонент|компонента|компонентов|component)/i,
			/(?:два|две|двух|двумя)\s*(?:компонент|компонента|компонентов|component)/i,
		],
		// Элементы/товары: "100 товаров", "50 элементов"
		items: [
			/(\d+)\s*(?:товар|товара|товаров|элемент|элемента|элементов|item|items)/i,
		],
		// Время: "5 часов", "3 дня", "2 недели", "1 месяц"
		hours: [
			/(\d+)\s*(?:час|часа|часов|hour|hours|ч\.|ч)/i,
			/(?:один|одна|одну|одной|одним)\s*(?:час|часа|часов|hour)/i,
			/(?:два|две|двух|двумя)\s*(?:час|часа|часов|hour)/i,
		],
		days: [
			/(\d+)\s*(?:день|дня|дней|day|days|дн\.|дн)/i,
			/(?:один|одна|одну|одной|одним)\s*(?:день|дня|дней|day)/i,
			/(?:два|две|двух|двумя)\s*(?:день|дня|дней|day)/i,
		],
		weeks: [
			/(\d+)\s*(?:недел|недели|недель|week|weeks|нед\.|нед)/i,
			/(?:одна|одну|одной|одним)\s*(?:недел|недели|недель|week)/i,
			/(?:две|двух|двумя)\s*(?:недел|недели|недель|week)/i,
		],
		months: [
			/(\d+)\s*(?:месяц|месяца|месяцев|month|months|мес\.|мес)/i,
			/(?:один|одна|одну|одной|одним)\s*(?:месяц|месяца|месяцев|month)/i,
		],
	}
	
	// Числа словами
	const numberWords: Record<string, number> = {
		'один': 1, 'одна': 1, 'одну': 1, 'одной': 1, 'одним': 1,
		'два': 2, 'две': 2, 'двух': 2, 'двумя': 2,
		'три': 3, 'трех': 3, 'тремя': 3,
		'четыре': 4, 'четырех': 4, 'четырьмя': 4,
		'пять': 5, 'пяти': 5, 'пятью': 5,
		'шесть': 6, 'шести': 6, 'шестью': 6,
		'семь': 7, 'семи': 7, 'семью': 7,
		'восемь': 8, 'восьми': 8, 'восемью': 8,
		'девять': 9, 'девяти': 9, 'девятью': 9,
		'десять': 10, 'десяти': 10, 'десятью': 10,
	}
	
	// Извлекаем страницы
	for (const pattern of patterns.pages) {
		const match = text.match(pattern)
		if (match) {
			if (match[1]) {
				data.pages = parseInt(match[1], 10)
			} else {
				// Ищем число словами в совпадении
				const matchText = match[0].toLowerCase()
				for (const [word, num] of Object.entries(numberWords)) {
					if (matchText.includes(word)) {
						data.pages = num
						break
					}
				}
			}
			if (data.pages) break
		}
	}
	
	// Дополнительная проверка для чисел словами (если не нашли через паттерны)
	if (!data.pages) {
		for (const [word, num] of Object.entries(numberWords)) {
			if (lowerText.includes(word + ' страниц') || 
			    lowerText.includes(word + ' страницы') || 
			    lowerText.includes(word + ' страница')) {
				data.pages = num
				break
			}
		}
	}
	
	// Извлекаем модули
	for (const pattern of patterns.modules) {
		const match = text.match(pattern)
		if (match) {
			if (match[1]) {
				data.modules = parseInt(match[1], 10)
			} else {
				const matchText = match[0].toLowerCase()
				for (const [word, num] of Object.entries(numberWords)) {
					if (matchText.includes(word)) {
						data.modules = num
						break
					}
				}
			}
			if (data.modules) break
		}
	}
	
	// Дополнительная проверка для чисел словами
	if (!data.modules) {
		for (const [word, num] of Object.entries(numberWords)) {
			if (lowerText.includes(word + ' модул') || lowerText.includes(word + ' module')) {
				data.modules = num
				break
			}
		}
	}
	
	// Извлекаем функции
	for (const pattern of patterns.functions) {
		const match = text.match(pattern)
		if (match && match[1]) {
			data.functions = parseInt(match[1], 10)
			break
		}
	}
	
	// Извлекаем компоненты
	for (const pattern of patterns.components) {
		const match = text.match(pattern)
		if (match && match[1]) {
			data.components = parseInt(match[1], 10)
			break
		}
	}
	
	// Извлекаем элементы/товары
	for (const pattern of patterns.items) {
		const match = text.match(pattern)
		if (match && match[1]) {
			data.items = parseInt(match[1], 10)
			break
		}
	}
	
	// Извлекаем время
	for (const pattern of patterns.hours) {
		const match = text.match(pattern)
		if (match && match[1]) {
			data.hours = parseInt(match[1], 10)
			break
		}
	}
	
	for (const pattern of patterns.days) {
		const match = text.match(pattern)
		if (match && match[1]) {
			data.days = parseInt(match[1], 10)
			break
		}
	}
	
	for (const pattern of patterns.weeks) {
		const match = text.match(pattern)
		if (match && match[1]) {
			data.weeks = parseInt(match[1], 10)
			break
		}
	}
	
	for (const pattern of patterns.months) {
		const match = text.match(pattern)
		if (match && match[1]) {
			data.months = parseInt(match[1], 10)
			break
		}
	}
	
	return data
}

/**
 * Определяет объем работы с учетом количественных данных и базы знаний
 */
function determineVolume(
	text: string, 
	descriptionLength: number,
	quantitativeData?: QuantitativeData,
	taskType?: TaskType | null
): TaskAnalysis['volume'] {
	// ПРИОРИТЕТ 1: Используем количественные данные
	if (quantitativeData) {
		// Страницы
		if (quantitativeData.pages !== undefined) {
			if (quantitativeData.pages >= 20) return 'very_large'
			if (quantitativeData.pages >= 10) return 'large'
			if (quantitativeData.pages >= 3) return 'medium'
			if (quantitativeData.pages >= 1) return 'small'
		}
		
		// Модули
		if (quantitativeData.modules !== undefined) {
			if (quantitativeData.modules >= 10) return 'very_large'
			if (quantitativeData.modules >= 5) return 'large'
			if (quantitativeData.modules >= 2) return 'medium'
			if (quantitativeData.modules >= 1) return 'small'
		}
		
		// Функции
		if (quantitativeData.functions !== undefined) {
			if (quantitativeData.functions >= 20) return 'very_large'
			if (quantitativeData.functions >= 10) return 'large'
			if (quantitativeData.functions >= 3) return 'medium'
			if (quantitativeData.functions >= 1) return 'small'
		}
		
		// Компоненты
		if (quantitativeData.components !== undefined) {
			if (quantitativeData.components >= 15) return 'very_large'
			if (quantitativeData.components >= 7) return 'large'
			if (quantitativeData.components >= 3) return 'medium'
			if (quantitativeData.components >= 1) return 'small'
		}
		
		// Время (если указано явно)
		if (quantitativeData.months && quantitativeData.months >= 1) return 'very_large'
		if (quantitativeData.weeks && quantitativeData.weeks >= 4) return 'very_large'
		if (quantitativeData.weeks && quantitativeData.weeks >= 2) return 'large'
		if (quantitativeData.days && quantitativeData.days >= 14) return 'large'
		if (quantitativeData.days && quantitativeData.days >= 7) return 'medium'
	}
	
	// ПРИОРИТЕТ 2: Используем базу знаний
	if (taskType) {
		// Используем типичный объем из базы знаний как подсказку
		const typicalHours = taskType.typicalHours
		if (typicalHours >= 500) return 'very_large'
		if (typicalHours >= 100) return 'large'
		if (typicalHours >= 20) return 'medium'
		if (typicalHours >= 1) return 'small'
	}
	
	// ПРИОРИТЕТ 3: Анализ ключевых слов
	let veryLargeCount = 0
	let largeCount = 0
	let mediumCount = 0
	let smallCount = 0
	
	VOLUME_KEYWORDS.very_large.forEach(keyword => {
		if (text.includes(keyword)) veryLargeCount++
	})
	
	VOLUME_KEYWORDS.large.forEach(keyword => {
		if (text.includes(keyword)) largeCount++
	})
	
	VOLUME_KEYWORDS.medium.forEach(keyword => {
		if (text.includes(keyword)) mediumCount++
	})
	
	VOLUME_KEYWORDS.small.forEach(keyword => {
		if (text.includes(keyword)) smallCount++
	})
	
	// Учитываем ключевые слова с приоритетом
	if (veryLargeCount > 0) return 'very_large'
	if (largeCount > 0) return 'large'
	if (mediumCount > 0) return 'medium'
	if (smallCount > 0) return 'small'
	
	// ПРИОРИТЕТ 4: Длина описания (только как последний резерв)
	// Убрали жесткий порог 50 символов - теперь это только подсказка
	if (descriptionLength > 2000) return 'very_large'
	if (descriptionLength > 1000) return 'large'
	if (descriptionLength > 300) return 'medium'
	
	// По умолчанию - средний объем (не маленький!)
	return 'medium'
}

/**
 * Определяет срочность
 */
function determineUrgency(text: string): TaskAnalysis['urgency'] {
	let veryUrgentCount = 0
	let urgentCount = 0
	
	URGENCY_KEYWORDS.very_urgent.forEach(keyword => {
		if (text.includes(keyword)) veryUrgentCount++
	})
	
	URGENCY_KEYWORDS.urgent.forEach(keyword => {
		if (text.includes(keyword)) urgentCount++
	})
	
	if (veryUrgentCount > 0) return 'very_urgent'
	if (urgentCount > 0) return 'urgent'
	return 'normal'
}

/**
 * Извлекает упомянутые технологии
 */
function extractTechnologies(text: string): string[] {
	const found: string[] = []
	
	TECHNOLOGY_KEYWORDS.forEach(tech => {
		const regex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
		if (regex.test(text)) {
			found.push(tech)
		}
	})
	
	return [...new Set(found)] // Убираем дубликаты
}

/**
 * Извлекает ключевые слова из текста
 */
function extractKeywords(text: string): string[] {
	// Простая экстракция: слова длиннее 4 символов, встречающиеся несколько раз
	const words = text.split(/\s+/).filter(w => w.length > 4)
	const wordCount: Record<string, number> = {}
	
	words.forEach(word => {
		const normalized = word.toLowerCase().replace(/[^\w]/g, '')
		if (normalized.length > 4) {
			wordCount[normalized] = (wordCount[normalized] || 0) + 1
		}
	})
	
	return Object.entries(wordCount)
		.filter(([_, count]) => count > 1)
		.sort(([_, a], [__, b]) => b - a)
		.slice(0, 10)
		.map(([word]) => word)
}

/**
 * Оценивает количество часов на выполнение с учетом количественных данных
 */
function estimateHours(
	complexity: TaskAnalysis['complexity'],
	volume: TaskAnalysis['volume'],
	descriptionLength: number,
	quantitativeData?: QuantitativeData,
	taskType?: TaskType | null
): number {
	// ПРИОРИТЕТ 1: Если есть явно указанное время - используем его
	if (quantitativeData) {
		if (quantitativeData.hours) {
			return quantitativeData.hours
		}
		if (quantitativeData.days) {
			return quantitativeData.days * 8 // 8 часов в день
		}
		if (quantitativeData.weeks) {
			return quantitativeData.weeks * 40 // 40 часов в неделю
		}
		if (quantitativeData.months) {
			return quantitativeData.months * 160 // 160 часов в месяц
		}
		
		// ПРИОРИТЕТ 2: Используем количественные данные для расчета
		if (quantitativeData.pages !== undefined) {
			// Для верстки: примерно 2-4 часа на страницу в зависимости от сложности
			const hoursPerPage = complexity === 'simple' ? 2 : complexity === 'medium' ? 3 : 4
			return Math.max(1, quantitativeData.pages * hoursPerPage)
		}
		
		if (quantitativeData.modules !== undefined) {
			// Для модулей: примерно 8-16 часов на модуль
			const hoursPerModule = complexity === 'simple' ? 8 : complexity === 'medium' ? 12 : 16
			return Math.max(1, quantitativeData.modules * hoursPerModule)
		}
		
		if (quantitativeData.functions !== undefined) {
			// Для функций: примерно 2-6 часов на функцию
			const hoursPerFunction = complexity === 'simple' ? 2 : complexity === 'medium' ? 4 : 6
			return Math.max(1, quantitativeData.functions * hoursPerFunction)
		}
		
		if (quantitativeData.components !== undefined) {
			// Для компонентов: примерно 1-3 часа на компонент
			const hoursPerComponent = complexity === 'simple' ? 1 : complexity === 'medium' ? 2 : 3
			return Math.max(1, quantitativeData.components * hoursPerComponent)
		}
	}
	
	// ПРИОРИТЕТ 3: Используем базу знаний
	if (taskType && taskType.typicalHours) {
		return taskType.typicalHours
	}
	
	// ПРИОРИТЕТ 4: Расчет на основе сложности и объема
	const complexityMultiplier = {
		simple: 1,
		medium: 2,
		complex: 4,
		very_complex: 8
	}
	
	const volumeMultiplier = {
		small: 1,
		medium: 2.5,
		large: 5,
		very_large: 10
	}
	
	// Базовая оценка (убрали жесткий порог 50 символов)
	const baseHours = Math.max(1, Math.floor(descriptionLength / 80))
	
	return Math.round(
		baseHours * complexityMultiplier[complexity] * volumeMultiplier[volume]
	)
}

/**
 * Переводит сложность на русский
 */
export function translateComplexity(complexity: TaskAnalysis['complexity']): string {
	const translations: Record<TaskAnalysis['complexity'], string> = {
		simple: 'Простая',
		medium: 'Средняя',
		complex: 'Сложная',
		very_complex: 'Очень сложная'
	}
	return translations[complexity]
}

/**
 * Переводит объем на русский
 */
export function translateVolume(volume: TaskAnalysis['volume']): string {
	const translations: Record<TaskAnalysis['volume'], string> = {
		small: 'Маленький',
		medium: 'Средний',
		large: 'Большой',
		very_large: 'Очень большой'
	}
	return translations[volume]
}

/**
 * Вычисляет схожесть между двумя задачами на основе анализа
 */
export function calculateSimilarity(
	analysis1: TaskAnalysis,
	analysis2: TaskAnalysis
): number {
	let score = 0
	let maxScore = 0
	
	// Сложность (вес: 20%)
	maxScore += 20
	if (analysis1.complexity === analysis2.complexity) {
		score += 20
	} else {
		const complexityOrder = ['simple', 'medium', 'complex', 'very_complex']
		const diff = Math.abs(
			complexityOrder.indexOf(analysis1.complexity) -
			complexityOrder.indexOf(analysis2.complexity)
		)
		score += Math.max(0, 20 - diff * 10)
	}
	
	// Объем (вес: 20%)
	maxScore += 20
	if (analysis1.volume === analysis2.volume) {
		score += 20
	} else {
		const volumeOrder = ['small', 'medium', 'large', 'very_large']
		const diff = Math.abs(
			volumeOrder.indexOf(analysis1.volume) -
			volumeOrder.indexOf(analysis2.volume)
		)
		score += Math.max(0, 20 - diff * 10)
	}
	
	// Технологии (вес: 30%)
	maxScore += 30
	if (analysis1.technologies.length > 0 && analysis2.technologies.length > 0) {
		const commonTechs = analysis1.technologies.filter(t =>
			analysis2.technologies.includes(t)
		)
		const techScore = (commonTechs.length / Math.max(
			analysis1.technologies.length,
			analysis2.technologies.length
		)) * 30
		score += techScore
	}
	
	// Ключевые слова (вес: 20%)
	maxScore += 20
	if (analysis1.keywords.length > 0 && analysis2.keywords.length > 0) {
		const commonKeywords = analysis1.keywords.filter(k =>
			analysis2.keywords.includes(k)
		)
		const keywordScore = (commonKeywords.length / Math.max(
			analysis1.keywords.length,
			analysis2.keywords.length
		)) * 20
		score += keywordScore
	}
	
	// Оценка часов (вес: 10%)
	maxScore += 10
	const hoursDiff = Math.abs(analysis1.estimatedHours - analysis2.estimatedHours)
	const avgHours = (analysis1.estimatedHours + analysis2.estimatedHours) / 2
	if (avgHours > 0) {
		const hoursScore = Math.max(0, 10 * (1 - hoursDiff / avgHours))
		score += hoursScore
	}
	
	return maxScore > 0 ? (score / maxScore) * 100 : 0
}

