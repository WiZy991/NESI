/**
 * База знаний о типичных задачах и их рыночных ценах
 * Используется для более точной оценки стоимости задач
 */

export interface TaskType {
	id: string
	name: string
	keywords: string[]
	typicalPriceRange: {
		min: number
		max: number
		average: number
	}
	complexity: 'simple' | 'medium' | 'complex' | 'very_complex'
	typicalHours: number
	description: string
}

/**
 * База знаний о типичных задачах с их ценами
 */
export const TASK_PRICE_KNOWLEDGE: TaskType[] = [
	// Простые задачи - UI элементы
	{
		id: 'button-fix',
		name: 'Исправление кнопки',
		keywords: ['кнопка', 'button', 'исправить кнопку', 'поправить кнопку', 'кнопка не работает', 'кнопка сломалась'],
		typicalPriceRange: { min: 1000, max: 5000, average: 3000 },
		complexity: 'simple',
		typicalHours: 1,
		description: 'Исправление одной кнопки на сайте'
	},
	{
		id: 'button-style',
		name: 'Стилизация кнопки',
		keywords: ['стилизовать кнопку', 'переделать кнопку', 'дизайн кнопки', 'красивая кнопка', 'кнопка css'],
		typicalPriceRange: { min: 2000, max: 8000, average: 5000 },
		complexity: 'simple',
		typicalHours: 2,
		description: 'Изменение внешнего вида кнопки'
	},
	{
		id: 'form-fix',
		name: 'Исправление формы',
		keywords: ['форма', 'form', 'исправить форму', 'форма не работает', 'форма отправки'],
		typicalPriceRange: { min: 3000, max: 15000, average: 8000 },
		complexity: 'medium',
		typicalHours: 4,
		description: 'Исправление формы обратной связи или регистрации'
	},
	{
		id: 'link-fix',
		name: 'Исправление ссылки',
		keywords: ['ссылка', 'link', 'ссылка не работает', 'битая ссылка', 'исправить ссылку'],
		typicalPriceRange: { min: 500, max: 2000, average: 1000 },
		complexity: 'simple',
		typicalHours: 0.5,
		description: 'Исправление одной ссылки'
	},
	
	// Средние задачи - компоненты
	{
		id: 'landing-page',
		name: 'Лендинг',
		keywords: ['лендинг', 'landing', 'одностраничный сайт', 'посадочная страница', 'landing page'],
		typicalPriceRange: { min: 15000, max: 80000, average: 40000 },
		complexity: 'medium',
		typicalHours: 40,
		description: 'Одностраничный сайт-лендинг'
	},
	{
		id: 'multi-page-site',
		name: 'Многостраничный сайт',
		keywords: ['многостраничный', 'несколько страниц', 'сайт 5 страниц', 'сайт 10 страниц', 'корпоративный сайт'],
		typicalPriceRange: { min: 50000, max: 300000, average: 150000 },
		complexity: 'complex',
		typicalHours: 120,
		description: 'Сайт с несколькими страницами'
	},
	{
		id: 'admin-panel',
		name: 'Админ-панель',
		keywords: ['админка', 'админ панель', 'admin panel', 'панель управления', 'административная панель'],
		typicalPriceRange: { min: 80000, max: 500000, average: 250000 },
		complexity: 'complex',
		typicalHours: 200,
		description: 'Панель администратора с управлением контентом'
	},
	{
		id: 'catalog',
		name: 'Каталог товаров',
		keywords: ['каталог', 'catalog', 'каталог товаров', 'список товаров', 'товары'],
		typicalPriceRange: { min: 60000, max: 400000, average: 200000 },
		complexity: 'complex',
		typicalHours: 150,
		description: 'Каталог с товарами и фильтрами'
	},
	
	// Сложные задачи - системы
	{
		id: 'marketplace',
		name: 'Маркетплейс',
		keywords: ['маркетплейс', 'marketplace', 'как wildberries', 'как вб', 'как амазон', 'площадка продаж'],
		typicalPriceRange: { min: 2000000, max: 10000000, average: 5000000 },
		complexity: 'very_complex',
		typicalHours: 2000,
		description: 'Полноценный маркетплейс уровня Wildberries'
	},
	{
		id: 'crm-system',
		name: 'CRM система',
		keywords: ['crm', 'crm система', 'система управления', 'crm для', 'управление клиентами'],
		typicalPriceRange: { min: 500000, max: 5000000, average: 2000000 },
		complexity: 'very_complex',
		typicalHours: 1000,
		description: 'CRM система для управления клиентами'
	},
	{
		id: 'ecommerce',
		name: 'Интернет-магазин',
		keywords: ['интернет магазин', 'магазин', 'ecommerce', 'онлайн магазин', 'shop', 'store'],
		typicalPriceRange: { min: 150000, max: 2000000, average: 800000 },
		complexity: 'complex',
		typicalHours: 400,
		description: 'Интернет-магазин с корзиной и оплатой'
	},
	{
		id: 'mobile-app',
		name: 'Мобильное приложение',
		keywords: ['мобильное приложение', 'app', 'ios приложение', 'android приложение', 'приложение для телефона'],
		typicalPriceRange: { min: 200000, max: 3000000, average: 1000000 },
		complexity: 'very_complex',
		typicalHours: 600,
		description: 'Мобильное приложение для iOS/Android'
	},
	
	// Специфичные задачи
	{
		id: 'api-integration',
		name: 'Интеграция API',
		keywords: ['интеграция api', 'api интеграция', 'подключить api', 'интеграция с', 'api'],
		typicalPriceRange: { min: 20000, max: 200000, average: 80000 },
		complexity: 'medium',
		typicalHours: 40,
		description: 'Интеграция с внешним API'
	},
	{
		id: 'payment-integration',
		name: 'Интеграция платежей',
		keywords: ['платежи', 'оплата', 'интеграция платежей', 'юкасса', 'stripe', 'paypal'],
		typicalPriceRange: { min: 30000, max: 150000, average: 70000 },
		complexity: 'medium',
		typicalHours: 30,
		description: 'Интеграция платежной системы'
	},
	{
		id: 'database-migration',
		name: 'Миграция базы данных',
		keywords: ['миграция базы', 'миграция бд', 'database migration', 'перенос данных', 'миграция данных'],
		typicalPriceRange: { min: 50000, max: 500000, average: 200000 },
		complexity: 'complex',
		typicalHours: 100,
		description: 'Миграция базы данных на новую структуру'
	},
	{
		id: 'bug-fix',
		name: 'Исправление бага',
		keywords: ['баг', 'bug', 'исправить баг', 'ошибка', 'не работает', 'сломано'],
		typicalPriceRange: { min: 2000, max: 30000, average: 10000 },
		complexity: 'medium',
		typicalHours: 4,
		description: 'Исправление одной ошибки'
	},
	{
		id: 'refactoring',
		name: 'Рефакторинг кода',
		keywords: ['рефакторинг', 'refactoring', 'переписать код', 'улучшить код', 'оптимизация кода'],
		typicalPriceRange: { min: 30000, max: 300000, average: 120000 },
		complexity: 'complex',
		typicalHours: 80,
		description: 'Рефакторинг существующего кода'
	},
	{
		id: 'design-to-code',
		name: 'Верстка по дизайну',
		keywords: ['верстка', 'верстать', 'сверстать', 'из дизайна', 'figma to code', 'psd to html'],
		typicalPriceRange: { min: 10000, max: 100000, average: 40000 },
		complexity: 'medium',
		typicalHours: 20,
		description: 'Верстка страницы по готовому дизайну'
	},
	{
		id: 'seo-optimization',
		name: 'SEO оптимизация',
		keywords: ['seo', 'оптимизация seo', 'seo продвижение', 'поисковая оптимизация'],
		typicalPriceRange: { min: 15000, max: 150000, average: 60000 },
		complexity: 'medium',
		typicalHours: 30,
		description: 'SEO оптимизация сайта'
	},
	{
		id: 'speed-optimization',
		name: 'Оптимизация скорости',
		keywords: ['скорость сайта', 'оптимизация скорости', 'быстрый сайт', 'ускорить сайт', 'performance'],
		typicalPriceRange: { min: 20000, max: 200000, average: 80000 },
		complexity: 'medium',
		typicalHours: 40,
		description: 'Оптимизация скорости загрузки сайта'
	}
]

/**
 * Находит наиболее подходящий тип задачи на основе текста
 */
export function findTaskType(title: string, description: string): TaskType | null {
	const fullText = `${title} ${description}`.toLowerCase()
	
	let bestMatch: TaskType | null = null
	let bestScore = 0
	
	for (const taskType of TASK_PRICE_KNOWLEDGE) {
		let score = 0
		
		// Проверяем каждое ключевое слово
		for (const keyword of taskType.keywords) {
			const keywordLower = keyword.toLowerCase()
			if (fullText.includes(keywordLower)) {
				// Более длинные ключевые слова дают больше очков
				score += keyword.length
				
				// Если ключевое слово найдено в заголовке - больше очков
				if (title.toLowerCase().includes(keywordLower)) {
					score += keyword.length * 2
				}
			}
		}
		
		if (score > bestScore) {
			bestScore = score
			bestMatch = taskType
		}
	}
	
	// Возвращаем только если набрано достаточно очков (минимум 5)
	return bestScore >= 5 ? bestMatch : null
}

/**
 * Получает типичную цену для типа задачи
 */
export function getTypicalPrice(taskType: TaskType): number {
	return taskType.typicalPriceRange.average
}

/**
 * Получает диапазон цен для типа задачи
 */
export function getPriceRange(taskType: TaskType): { min: number; max: number } {
	return {
		min: taskType.typicalPriceRange.min,
		max: taskType.typicalPriceRange.max
	}
}

/**
 * Проверяет, соответствует ли цена типичному диапазону
 */
export function isPriceReasonable(price: number, taskType: TaskType): {
	isReasonable: boolean
	deviation: number
	deviationPercent: number
	status: 'very_low' | 'low' | 'reasonable' | 'high' | 'very_high'
} {
	const { min, max, average } = taskType.typicalPriceRange
	
	if (price < min) {
		return {
			isReasonable: true,
			deviation: price - average,
			deviationPercent: ((price - average) / average) * 100,
			status: 'very_low'
		}
	}
	
	if (price > max) {
		const deviationPercent = ((price - max) / max) * 100
		return {
			isReasonable: deviationPercent < 50, // Допускаем отклонение до 50%
			deviation: price - average,
			deviationPercent: ((price - average) / average) * 100,
			status: deviationPercent > 100 ? 'very_high' : 'high'
		}
	}
	
	if (price >= min && price <= max) {
		return {
			isReasonable: true,
			deviation: price - average,
			deviationPercent: ((price - average) / average) * 100,
			status: 'reasonable'
		}
	}
	
	// Если цена между min и average - низкая, но разумная
	if (price >= min && price < average) {
		return {
			isReasonable: true,
			deviation: price - average,
			deviationPercent: ((price - average) / average) * 100,
			status: 'low'
		}
	}
	
	// Если цена между average и max - высокая, но разумная
	return {
		isReasonable: true,
		deviation: price - average,
		deviationPercent: ((price - average) / average) * 100,
		status: 'high'
	}
}

