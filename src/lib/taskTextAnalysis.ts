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
	
	// Импортируем базу знаний
	let taskType: TaskType | null = null
	try {
		const { findTaskType } = require('./taskPriceKnowledge')
		taskType = findTaskType(title, description)
	} catch (err) {
		// Если база знаний недоступна, продолжаем без неё
	}
	
	// Определяем сложность (используем из базы знаний если найдена)
	const complexity = taskType 
		? taskType.complexity 
		: determineComplexity(fullText)
	
	// Определяем объем
	const volume = determineVolume(fullText, description.length)
	
	// Определяем срочность
	const urgency = determineUrgency(fullText)
	
	// Извлекаем технологии
	const technologies = extractTechnologies(fullText)
	
	// Извлекаем ключевые слова
	const keywords = extractKeywords(fullText)
	
	// Оцениваем количество часов (используем из базы знаний если найдена)
	const estimatedHours = taskType
		? taskType.typicalHours
		: estimateHours(complexity, volume, description.length)
	
	return {
		complexity,
		volume,
		urgency,
		technologies,
		keywords,
		estimatedHours,
		taskTypeId: taskType?.id
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
 * Определяет объем работы
 */
function determineVolume(text: string, descriptionLength: number): TaskAnalysis['volume'] {
	// Если описание очень короткое (меньше 50 символов), считаем маленьким объемом
	if (descriptionLength < 50) {
		return 'small'
	}
	
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
	
	// Учитываем длину описания
	if (descriptionLength > 2000 || veryLargeCount > 0) return 'very_large'
	if (descriptionLength > 1000 || largeCount > 0) return 'large'
	if (descriptionLength > 300 || mediumCount > 0) return 'medium'
	return 'small'
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
 * Оценивает количество часов на выполнение
 */
function estimateHours(
	complexity: TaskAnalysis['complexity'],
	volume: TaskAnalysis['volume'],
	descriptionLength: number
): number {
	const complexityMultiplier = {
		simple: 1,
		medium: 2,
		complex: 4,
		very_complex: 8
	}
	
	const volumeMultiplier = {
		small: 1,
		medium: 2,
		large: 4,
		very_large: 8
	}
	
	// Для очень коротких задач используем минимальную базу
	const baseHours = descriptionLength < 50 
		? 1 
		: Math.max(2, Math.floor(descriptionLength / 100))
	
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

