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
 * Расширенная версия с большим количеством типов задач и ключевых слов
 */
export const TASK_PRICE_KNOWLEDGE: TaskType[] = [
	// ========== ПРОСТЫЕ ЗАДАЧИ - UI ЭЛЕМЕНТЫ ==========
	{
		id: 'button-fix',
		name: 'Исправление кнопки',
		keywords: [
			'кнопка', 'button', 'исправить кнопку', 'поправить кнопку', 'кнопка не работает', 
			'кнопка сломалась', 'кнопка не нажимается', 'кнопка не кликается', 'починить кнопку',
			'кнопка не реагирует', 'исправить button', 'fix button', 'кнопка баг', 'кнопка ошибка'
		],
		typicalPriceRange: { min: 1000, max: 5000, average: 3000 },
		complexity: 'simple',
		typicalHours: 1,
		description: 'Исправление одной кнопки на сайте'
	},
	{
		id: 'button-style',
		name: 'Стилизация кнопки',
		keywords: [
			'стилизовать кнопку', 'переделать кнопку', 'дизайн кнопки', 'красивая кнопка', 
			'кнопка css', 'оформить кнопку', 'сделать кнопку', 'стиль кнопки', 'дизайн button',
			'красивая button', 'стилизация button', 'переделать button', 'новый дизайн кнопки'
		],
		typicalPriceRange: { min: 2000, max: 8000, average: 5000 },
		complexity: 'simple',
		typicalHours: 2,
		description: 'Изменение внешнего вида кнопки'
	},
	{
		id: 'form-fix',
		name: 'Исправление формы',
		keywords: [
			'форма', 'form', 'исправить форму', 'форма не работает', 'форма отправки', 
			'форма не отправляется', 'форма баг', 'форма ошибка', 'починить форму', 
			'форма не валидируется', 'валидация формы', 'form validation', 'form fix',
			'исправить form', 'форма не отправляет', 'форма сломалась', 'форма не отправляет данные'
		],
		typicalPriceRange: { min: 3000, max: 15000, average: 8000 },
		complexity: 'medium',
		typicalHours: 4,
		description: 'Исправление формы обратной связи или регистрации'
	},
	{
		id: 'form-create',
		name: 'Создание формы',
		keywords: [
			'создать форму', 'сделать форму', 'форма обратной связи', 'форма регистрации',
			'форма заказа', 'форма подписки', 'форма обратной связи', 'contact form',
			'registration form', 'order form', 'создать form', 'сделать form', 'новая форма',
			'форма с валидацией', 'форма с полями', 'форма отправки', 'форма заявки'
		],
		typicalPriceRange: { min: 5000, max: 25000, average: 12000 },
		complexity: 'medium',
		typicalHours: 6,
		description: 'Создание новой формы с валидацией'
	},
	{
		id: 'link-fix',
		name: 'Исправление ссылки',
		keywords: [
			'ссылка', 'link', 'ссылка не работает', 'битая ссылка', 'исправить ссылку',
			'ссылка 404', 'ссылка не открывается', 'broken link', 'fix link', 'починить ссылку',
			'ссылка сломалась', 'ссылка ошибка', 'ссылка не кликается', 'исправить link'
		],
		typicalPriceRange: { min: 500, max: 2000, average: 1000 },
		complexity: 'simple',
		typicalHours: 0.5,
		description: 'Исправление одной ссылки'
	},
	{
		id: 'menu-fix',
		name: 'Исправление меню',
		keywords: [
			'меню', 'menu', 'меню не работает', 'меню не открывается', 'исправить меню',
			'навигация', 'navigation', 'навигация не работает', 'меню баг', 'menu fix',
			'исправить navigation', 'меню сломалось', 'меню ошибка', 'починить меню',
			'меню не кликается', 'меню не раскрывается', 'dropdown menu', 'выпадающее меню'
		],
		typicalPriceRange: { min: 2000, max: 10000, average: 5000 },
		complexity: 'simple',
		typicalHours: 2,
		description: 'Исправление меню навигации'
	},
	{
		id: 'image-fix',
		name: 'Исправление изображения',
		keywords: [
			'изображение', 'картинка', 'image', 'картинка не загружается', 'изображение не показывается',
			'картинка не отображается', 'image не работает', 'исправить image', 'починить картинку',
			'изображение сломано', 'картинка ошибка', 'image fix', 'исправить изображение'
		],
		typicalPriceRange: { min: 1000, max: 5000, average: 2500 },
		complexity: 'simple',
		typicalHours: 1,
		description: 'Исправление проблемы с изображением'
	},
	{
		id: 'modal-window',
		name: 'Модальное окно',
		keywords: [
			'модальное окно', 'modal', 'popup', 'всплывающее окно', 'диалоговое окно',
			'создать modal', 'сделать popup', 'модалка', 'modal window', 'popup window',
			'всплывающее', 'диалог', 'dialog', 'создать модальное окно', 'сделать модальное окно'
		],
		typicalPriceRange: { min: 3000, max: 15000, average: 8000 },
		complexity: 'medium',
		typicalHours: 4,
		description: 'Создание модального окна'
	},
	{
		id: 'slider-carousel',
		name: 'Слайдер/Карусель',
		keywords: [
			'слайдер', 'карусель', 'slider', 'carousel', 'слайды', 'slideshow',
			'создать слайдер', 'сделать карусель', 'слайдер изображений', 'image slider',
			'карусель товаров', 'product carousel', 'слайдер на сайте', 'карусель на сайте'
		],
		typicalPriceRange: { min: 5000, max: 30000, average: 15000 },
		complexity: 'medium',
		typicalHours: 8,
		description: 'Создание слайдера или карусели'
	},
	{
		id: 'search-function',
		name: 'Функция поиска',
		keywords: [
			'поиск', 'search', 'поиск по сайту', 'search function', 'поиск товаров',
			'поиск по каталогу', 'catalog search', 'создать поиск', 'сделать поиск',
			'поисковая строка', 'search bar', 'поиск на сайте', 'функция поиска'
		],
		typicalPriceRange: { min: 10000, max: 50000, average: 25000 },
		complexity: 'medium',
		typicalHours: 12,
		description: 'Реализация функции поиска'
	},
	
	// ========== СРЕДНИЕ ЗАДАЧИ - КОМПОНЕНТЫ И СТРАНИЦЫ ==========
	{
		id: 'landing-page',
		name: 'Лендинг',
		keywords: [
			'лендинг', 'landing', 'одностраничный сайт', 'посадочная страница', 'landing page',
			'лендинг пейдж', 'одностраничник', 'landing page', 'создать лендинг', 'сделать лендинг',
			'лендинг для', 'landing для', 'посадочная', 'одностраничный', 'single page',
			'лендинг страница', 'landing сайт', 'лендинг под ключ'
		],
		typicalPriceRange: { min: 15000, max: 80000, average: 40000 },
		complexity: 'medium',
		typicalHours: 40,
		description: 'Одностраничный сайт-лендинг'
	},
	{
		id: 'multi-page-site',
		name: 'Многостраничный сайт',
		keywords: [
			'многостраничный', 'несколько страниц', 'сайт 5 страниц', 'сайт 10 страниц', 
			'корпоративный сайт', 'корпоративный', 'corporate site', 'несколько страниц сайт',
			'сайт с несколькими страницами', 'многостраничный сайт', 'multi page site',
			'сайт 3 страницы', 'сайт 4 страницы', 'сайт 6 страниц', 'сайт 7 страниц',
			'сайт 8 страниц', 'сайт 9 страниц', 'сайт 15 страниц', 'сайт 20 страниц'
		],
		typicalPriceRange: { min: 50000, max: 300000, average: 150000 },
		complexity: 'complex',
		typicalHours: 120,
		description: 'Сайт с несколькими страницами'
	},
	{
		id: 'admin-panel',
		name: 'Админ-панель',
		keywords: [
			'админка', 'админ панель', 'admin panel', 'панель управления', 'административная панель',
			'админка для', 'admin для', 'панель админа', 'админ панель для', 'admin panel для',
			'создать админку', 'сделать админ панель', 'админка сайта', 'admin panel сайта',
			'панель управления сайтом', 'админка для сайта', 'административная панель для'
		],
		typicalPriceRange: { min: 80000, max: 500000, average: 250000 },
		complexity: 'complex',
		typicalHours: 200,
		description: 'Панель администратора с управлением контентом'
	},
	{
		id: 'catalog',
		name: 'Каталог товаров',
		keywords: [
			'каталог', 'catalog', 'каталог товаров', 'список товаров', 'товары',
			'каталог продукции', 'product catalog', 'каталог для', 'catalog для',
			'создать каталог', 'сделать каталог', 'каталог с фильтрами', 'catalog with filters',
			'каталог товаров с фильтрами', 'каталог с поиском', 'catalog with search'
		],
		typicalPriceRange: { min: 60000, max: 400000, average: 200000 },
		complexity: 'complex',
		typicalHours: 150,
		description: 'Каталог с товарами и фильтрами'
	},
	{
		id: 'blog',
		name: 'Блог',
		keywords: [
			'блог', 'blog', 'создать блог', 'сделать блог', 'блог для сайта',
			'blog для', 'блог система', 'blog system', 'блог платформа', 'blog platform',
			'блог с админкой', 'blog with admin', 'блог для', 'система блога'
		],
		typicalPriceRange: { min: 40000, max: 200000, average: 100000 },
		complexity: 'medium',
		typicalHours: 60,
		description: 'Система блога с админ-панелью'
	},
	{
		id: 'portfolio-site',
		name: 'Сайт-портфолио',
		keywords: [
			'портфолио', 'portfolio', 'сайт портфолио', 'portfolio site', 'портфолио сайт',
			'создать портфолио', 'сделать портфолио', 'портфолио для', 'portfolio для',
			'сайт визитка', 'визитка', 'личный сайт', 'personal site', 'сайт о себе'
		],
		typicalPriceRange: { min: 20000, max: 100000, average: 50000 },
		complexity: 'medium',
		typicalHours: 30,
		description: 'Сайт-портфолио для демонстрации работ'
	},
	{
		id: 'news-site',
		name: 'Новостной сайт',
		keywords: [
			'новостной сайт', 'news site', 'новости', 'news', 'новостной портал',
			'news portal', 'создать новостной', 'сделать новостной', 'новостной для',
			'сайт новостей', 'портал новостей', 'новостная лента', 'news feed'
		],
		typicalPriceRange: { min: 60000, max: 300000, average: 150000 },
		complexity: 'complex',
		typicalHours: 100,
		description: 'Новостной сайт с системой публикации'
	},
	
	// ========== СЛОЖНЫЕ ЗАДАЧИ - СИСТЕМЫ ==========
	{
		id: 'marketplace',
		name: 'Маркетплейс',
		keywords: [
			'маркетплейс', 'marketplace', 'как wildberries', 'как вб', 'как амазон', 
			'площадка продаж', 'marketplace для', 'создать маркетплейс', 'сделать маркетплейс',
			'площадка для продаж', 'торговая площадка', 'trading platform', 'маркетплейс под ключ',
			'как amazon', 'как ozon', 'как яндекс маркет', 'как мегамаркет', 'площадка продавцов'
		],
		typicalPriceRange: { min: 2000000, max: 10000000, average: 5000000 },
		complexity: 'very_complex',
		typicalHours: 2000,
		description: 'Полноценный маркетплейс уровня Wildberries'
	},
	{
		id: 'crm-system',
		name: 'CRM система',
		keywords: [
			'crm', 'crm система', 'система управления', 'crm для', 'управление клиентами',
			'crm система для', 'создать crm', 'сделать crm', 'crm под ключ', 'crm platform',
			'система crm', 'crm для бизнеса', 'crm для компании', 'управление клиентами система',
			'crm для продаж', 'crm для менеджеров', 'crm для отдела продаж'
		],
		typicalPriceRange: { min: 500000, max: 5000000, average: 2000000 },
		complexity: 'very_complex',
		typicalHours: 1000,
		description: 'CRM система для управления клиентами'
	},
	{
		id: 'ecommerce',
		name: 'Интернет-магазин',
		keywords: [
			'интернет магазин', 'магазин', 'ecommerce', 'онлайн магазин', 'shop', 'store',
			'интернет магазин для', 'создать магазин', 'сделать магазин', 'магазин под ключ',
			'online store', 'ecommerce site', 'интернет магазин с', 'магазин с корзиной',
			'магазин с оплатой', 'магазин с доставкой', 'интернет магазин товаров',
			'онлайн магазин товаров', 'магазин для продажи', 'магазин для бизнеса'
		],
		typicalPriceRange: { min: 150000, max: 2000000, average: 800000 },
		complexity: 'complex',
		typicalHours: 400,
		description: 'Интернет-магазин с корзиной и оплатой'
	},
	{
		id: 'mobile-app',
		name: 'Мобильное приложение',
		keywords: [
			'мобильное приложение', 'app', 'ios приложение', 'android приложение', 
			'приложение для телефона', 'mobile app', 'создать приложение', 'сделать приложение',
			'приложение для ios', 'приложение для android', 'ios app', 'android app',
			'мобильное приложение для', 'app для', 'приложение под ключ', 'mobile application',
			'приложение для смартфона', 'приложение для телефона', 'приложение для iphone'
		],
		typicalPriceRange: { min: 200000, max: 3000000, average: 1000000 },
		complexity: 'very_complex',
		typicalHours: 600,
		description: 'Мобильное приложение для iOS/Android'
	},
	{
		id: 'social-network',
		name: 'Социальная сеть',
		keywords: [
			'социальная сеть', 'social network', 'соцсеть', 'social media', 'создать соцсеть',
			'сделать соцсеть', 'социальная сеть для', 'social network для', 'соцсеть под ключ',
			'платформа для общения', 'социальная платформа', 'social platform', 'соц сеть'
		],
		typicalPriceRange: { min: 1000000, max: 8000000, average: 3000000 },
		complexity: 'very_complex',
		typicalHours: 1500,
		description: 'Социальная сеть с функциями общения'
	},
	{
		id: 'booking-system',
		name: 'Система бронирования',
		keywords: [
			'бронирование', 'booking', 'система бронирования', 'booking system', 'бронирование онлайн',
			'онлайн бронирование', 'создать бронирование', 'сделать бронирование', 'бронирование для',
			'booking для', 'система записи', 'онлайн запись', 'online booking', 'бронирование мест',
			'бронирование столиков', 'бронирование номеров', 'бронирование билетов'
		],
		typicalPriceRange: { min: 100000, max: 800000, average: 400000 },
		complexity: 'complex',
		typicalHours: 200,
		description: 'Система онлайн-бронирования'
	},
	{
		id: 'learning-platform',
		name: 'Образовательная платформа',
		keywords: [
			'обучение онлайн', 'online learning', 'образовательная платформа', 'learning platform',
			'платформа для обучения', 'система обучения', 'learning system', 'создать платформу обучения',
			'сделать платформу обучения', 'онлайн школа', 'online school', 'курсы онлайн',
			'online courses', 'платформа курсов', 'course platform', 'система курсов'
		],
		typicalPriceRange: { min: 300000, max: 2000000, average: 1000000 },
		complexity: 'very_complex',
		typicalHours: 500,
		description: 'Платформа для онлайн-обучения'
	},
	
	// ========== СПЕЦИФИЧНЫЕ ТЕХНИЧЕСКИЕ ЗАДАЧИ ==========
	{
		id: 'api-integration',
		name: 'Интеграция API',
		keywords: [
			'интеграция api', 'api интеграция', 'подключить api', 'интеграция с', 'api',
			'api для', 'подключить к api', 'интеграция с api', 'api подключение', 'api integration',
			'создать api', 'сделать api', 'api сервис', 'api service', 'rest api', 'graphql api',
			'интеграция с сервисом', 'подключение к сервису', 'api подключение к', 'интеграция api с'
		],
		typicalPriceRange: { min: 20000, max: 200000, average: 80000 },
		complexity: 'medium',
		typicalHours: 40,
		description: 'Интеграция с внешним API'
	},
	{
		id: 'payment-integration',
		name: 'Интеграция платежей',
		keywords: [
			'платежи', 'оплата', 'интеграция платежей', 'юкасса', 'stripe', 'paypal',
			'интеграция оплаты', 'payment integration', 'подключить оплату', 'оплата онлайн',
			'online payment', 'платежная система', 'payment system', 'интеграция с юкассой',
			'интеграция со stripe', 'интеграция с paypal', 'подключить юкассу', 'подключить stripe',
			'оплата картой', 'card payment', 'оплата через', 'payment через', 'интеграция платежной системы'
		],
		typicalPriceRange: { min: 30000, max: 150000, average: 70000 },
		complexity: 'medium',
		typicalHours: 30,
		description: 'Интеграция платежной системы'
	},
	{
		id: 'database-migration',
		name: 'Миграция базы данных',
		keywords: [
			'миграция базы', 'миграция бд', 'database migration', 'перенос данных', 'миграция данных',
			'миграция базы данных', 'перенос базы', 'database transfer', 'миграция с', 'миграция на',
			'перенос данных с', 'перенос данных на', 'миграция данных', 'data migration',
			'перенос бд', 'миграция бд с', 'миграция бд на', 'database migration с'
		],
		typicalPriceRange: { min: 50000, max: 500000, average: 200000 },
		complexity: 'complex',
		typicalHours: 100,
		description: 'Миграция базы данных на новую структуру'
	},
	{
		id: 'bug-fix',
		name: 'Исправление бага',
		keywords: [
			'баг', 'bug', 'исправить баг', 'ошибка', 'не работает', 'сломано',
			'исправить ошибку', 'починить', 'fix bug', 'bug fix', 'исправить проблему',
			'проблема с', 'не работает', 'сломано', 'ошибка в', 'баг в', 'bug в',
			'исправить', 'починить', 'fix', 'решить проблему', 'устранить ошибку', 'устранить баг'
		],
		typicalPriceRange: { min: 2000, max: 30000, average: 10000 },
		complexity: 'medium',
		typicalHours: 4,
		description: 'Исправление одной ошибки'
	},
	{
		id: 'refactoring',
		name: 'Рефакторинг кода',
		keywords: [
			'рефакторинг', 'refactoring', 'переписать код', 'улучшить код', 'оптимизация кода',
			'рефакторинг кода', 'code refactoring', 'улучшить', 'оптимизировать код', 'code optimization',
			'переписать', 'refactor', 'рефакторинг для', 'улучшить производительность', 'performance optimization',
			'оптимизация производительности', 'улучшить структуру', 'code structure', 'реструктуризация кода'
		],
		typicalPriceRange: { min: 30000, max: 300000, average: 120000 },
		complexity: 'complex',
		typicalHours: 80,
		description: 'Рефакторинг существующего кода'
	},
	{
		id: 'design-to-code',
		name: 'Верстка по дизайну',
		keywords: [
			'верстка', 'верстать', 'сверстать', 'из дизайна', 'figma to code', 'psd to html',
			'верстка из figma', 'верстка из psd', 'верстка из дизайна', 'html верстка', 'css верстка',
			'верстка макета', 'верстка страницы', 'layout', 'верстка сайта', 'site layout',
			'html css верстка', 'responsive layout', 'адаптивная верстка', 'верстка адаптивная',
			'верстка под мобильные', 'mobile layout', 'верстка для мобильных'
		],
		typicalPriceRange: { min: 10000, max: 100000, average: 40000 },
		complexity: 'medium',
		typicalHours: 20,
		description: 'Верстка страницы по готовому дизайну'
	},
	{
		id: 'seo-optimization',
		name: 'SEO оптимизация',
		keywords: [
			'seo', 'оптимизация seo', 'seo продвижение', 'поисковая оптимизация', 'seo оптимизация',
			'seo для сайта', 'seo для', 'продвижение сайта', 'seo продвижение сайта', 'seo optimization',
			'оптимизация для поисковиков', 'поисковая оптимизация сайта', 'seo настройка', 'seo setup',
			'seo аудит', 'seo audit', 'улучшить seo', 'поднять в поиске', 'продвинуть сайт'
		],
		typicalPriceRange: { min: 15000, max: 150000, average: 60000 },
		complexity: 'medium',
		typicalHours: 30,
		description: 'SEO оптимизация сайта'
	},
	{
		id: 'speed-optimization',
		name: 'Оптимизация скорости',
		keywords: [
			'скорость сайта', 'оптимизация скорости', 'быстрый сайт', 'ускорить сайт', 'performance',
			'оптимизация производительности', 'performance optimization', 'ускорить загрузку', 'быстрая загрузка',
			'оптимизация загрузки', 'loading optimization', 'улучшить скорость', 'improve performance',
			'оптимизация сайта', 'site optimization', 'ускорить работу', 'быстрая работа сайта',
			'оптимизация кода', 'code optimization', 'уменьшить время загрузки', 'reduce loading time'
		],
		typicalPriceRange: { min: 20000, max: 200000, average: 80000 },
		complexity: 'medium',
		typicalHours: 40,
		description: 'Оптимизация скорости загрузки сайта'
	},
	{
		id: 'authentication',
		name: 'Система авторизации',
		keywords: [
			'авторизация', 'авторизация пользователей', 'авторизация на сайте', 'authentication', 'login',
			'регистрация', 'registration', 'вход', 'login system', 'система входа', 'система регистрации',
			'создать авторизацию', 'сделать авторизацию', 'авторизация для', 'authentication для',
			'система авторизации', 'auth system', 'вход на сайт', 'регистрация на сайте',
			'авторизация через', 'oauth', 'social login', 'вход через соцсети', 'регистрация через'
		],
		typicalPriceRange: { min: 15000, max: 80000, average: 40000 },
		complexity: 'medium',
		typicalHours: 20,
		description: 'Система авторизации и регистрации пользователей'
	},
	{
		id: 'email-system',
		name: 'Email система',
		keywords: [
			'email', 'почта', 'отправка email', 'email отправка', 'email система', 'email system',
			'рассылка email', 'email рассылка', 'email notification', 'уведомления email',
			'отправка писем', 'sending emails', 'email для', 'почтовая система', 'mail system',
			'интеграция email', 'email integration', 'подключить email', 'настроить email'
		],
		typicalPriceRange: { min: 10000, max: 60000, average: 30000 },
		complexity: 'medium',
		typicalHours: 15,
		description: 'Система отправки email-уведомлений'
	},
	{
		id: 'file-upload',
		name: 'Загрузка файлов',
		keywords: [
			'загрузка файлов', 'file upload', 'upload files', 'загрузить файлы', 'загрузка на сервер',
			'upload на сервер', 'file upload system', 'система загрузки', 'upload system',
			'загрузка изображений', 'image upload', 'загрузка документов', 'document upload',
			'загрузка для', 'upload для', 'создать загрузку', 'сделать загрузку файлов'
		],
		typicalPriceRange: { min: 8000, max: 50000, average: 25000 },
		complexity: 'medium',
		typicalHours: 12,
		description: 'Система загрузки файлов на сервер'
	},
	{
		id: 'chat-system',
		name: 'Чат система',
		keywords: [
			'чат', 'chat', 'чат система', 'chat system', 'онлайн чат', 'online chat',
			'создать чат', 'сделать чат', 'чат для сайта', 'chat для сайта', 'чат на сайте',
			'система сообщений', 'messaging system', 'чат между пользователями', 'user chat',
			'чат в реальном времени', 'real time chat', 'live chat', 'чат поддержки', 'support chat'
		],
		typicalPriceRange: { min: 30000, max: 150000, average: 80000 },
		complexity: 'complex',
		typicalHours: 50,
		description: 'Система чата в реальном времени'
	},
	{
		id: 'notification-system',
		name: 'Система уведомлений',
		keywords: [
			'уведомления', 'notifications', 'система уведомлений', 'notification system',
			'push уведомления', 'push notifications', 'уведомления для', 'notifications для',
			'создать уведомления', 'сделать уведомления', 'система оповещений', 'alert system',
			'уведомления пользователям', 'user notifications', 'уведомления на сайте', 'site notifications'
		],
		typicalPriceRange: { min: 15000, max: 80000, average: 40000 },
		complexity: 'medium',
		typicalHours: 20,
		description: 'Система уведомлений для пользователей'
	},
	{
		id: 'analytics-integration',
		name: 'Интеграция аналитики',
		keywords: [
			'аналитика', 'analytics', 'google analytics', 'яндекс метрика', 'yandex metrika',
			'интеграция аналитики', 'analytics integration', 'подключить аналитику', 'настроить аналитику',
			'аналитика для', 'analytics для', 'статистика сайта', 'site statistics', 'site analytics',
			'подключить метрику', 'подключить google analytics', 'настроить метрику'
		],
		typicalPriceRange: { min: 5000, max: 30000, average: 15000 },
		complexity: 'simple',
		typicalHours: 4,
		description: 'Интеграция систем аналитики'
	},
	{
		id: 'backup-system',
		name: 'Система резервного копирования',
		keywords: [
			'бэкап', 'backup', 'резервное копирование', 'backup system', 'система бэкапа',
			'создать бэкап', 'сделать бэкап', 'автоматический бэкап', 'automatic backup',
			'бэкап данных', 'data backup', 'резервная копия', 'backup для', 'бэкап для'
		],
		typicalPriceRange: { min: 20000, max: 100000, average: 50000 },
		complexity: 'medium',
		typicalHours: 25,
		description: 'Система автоматического резервного копирования'
	},
	{
		id: 'security-audit',
		name: 'Аудит безопасности',
		keywords: [
			'безопасность', 'security', 'аудит безопасности', 'security audit', 'проверка безопасности',
			'безопасность сайта', 'site security', 'защита сайта', 'site protection', 'security для',
			'проверить безопасность', 'check security', 'улучшить безопасность', 'improve security',
			'защита от взлома', 'hack protection', 'безопасность данных', 'data security'
		],
		typicalPriceRange: { min: 25000, max: 150000, average: 70000 },
		complexity: 'complex',
		typicalHours: 35,
		description: 'Проверка и улучшение безопасности'
	},
	{
		id: 'testing',
		name: 'Тестирование',
		keywords: [
			'тестирование', 'testing', 'тесты', 'tests', 'написать тесты', 'write tests',
			'unit тесты', 'unit tests', 'интеграционные тесты', 'integration tests', 'тестирование для',
			'testing для', 'создать тесты', 'сделать тесты', 'покрытие тестами', 'test coverage',
			'автоматические тесты', 'automated tests', 'qa тестирование', 'qa testing'
		],
		typicalPriceRange: { min: 20000, max: 120000, average: 60000 },
		complexity: 'medium',
		typicalHours: 30,
		description: 'Написание и настройка тестов'
	},
	{
		id: 'deployment',
		name: 'Деплой и настройка сервера',
		keywords: [
			'деплой', 'deployment', 'развертывание', 'deploy', 'настроить сервер', 'server setup',
			'развернуть сайт', 'deploy site', 'настройка сервера', 'server configuration',
			'деплой на', 'deploy на', 'развертывание на', 'настроить хостинг', 'hosting setup',
			'настроить vps', 'vps setup', 'настроить облако', 'cloud setup', 'docker', 'kubernetes'
		],
		typicalPriceRange: { min: 15000, max: 100000, average: 50000 },
		complexity: 'medium',
		typicalHours: 25,
		description: 'Развертывание и настройка на сервере'
	},
	
	// ========== ДИЗАЙН ЗАДАЧИ ==========
	{
		id: 'logo-design',
		name: 'Дизайн логотипа',
		keywords: [
			'логотип', 'logo', 'дизайн логотипа', 'logo design', 'создать логотип', 'сделать логотип',
			'логотип для', 'logo для', 'разработать логотип', 'design logo', 'логотип компании',
			'company logo', 'логотип бренда', 'brand logo', 'новый логотип', 'логотип с нуля'
		],
		typicalPriceRange: { min: 5000, max: 50000, average: 20000 },
		complexity: 'medium',
		typicalHours: 10,
		description: 'Создание дизайна логотипа'
	},
	{
		id: 'website-design',
		name: 'Дизайн сайта',
		keywords: [
			'дизайн сайта', 'website design', 'дизайн для сайта', 'design для сайта', 'создать дизайн',
			'сделать дизайн', 'дизайн макета', 'layout design', 'дизайн страницы', 'page design',
			'ui дизайн', 'ui design', 'ux дизайн', 'ux design', 'дизайн интерфейса', 'interface design',
			'дизайн под ключ', 'design под ключ', 'веб дизайн', 'web design'
		],
		typicalPriceRange: { min: 20000, max: 200000, average: 80000 },
		complexity: 'complex',
		typicalHours: 60,
		description: 'Создание дизайна для сайта'
	},
	{
		id: 'mobile-design',
		name: 'Дизайн мобильного приложения',
		keywords: [
			'дизайн приложения', 'app design', 'дизайн мобильного', 'mobile design', 'дизайн для app',
			'design для app', 'ui приложения', 'app ui', 'дизайн интерфейса приложения', 'app interface design',
			'мобильный дизайн', 'mobile app design', 'дизайн для ios', 'ios design', 'дизайн для android',
			'android design', 'дизайн мобильного приложения'
		],
		typicalPriceRange: { min: 30000, max: 250000, average: 120000 },
		complexity: 'complex',
		typicalHours: 80,
		description: 'Дизайн интерфейса мобильного приложения'
	},
	
	// ========== КОНТЕНТ ЗАДАЧИ ==========
	{
		id: 'content-writing',
		name: 'Написание текстов',
		keywords: [
			'тексты', 'написать текст', 'текст для', 'копирайтинг', 'copywriting', 'написание текстов',
			'текст на сайт', 'text для сайта', 'контент для сайта', 'content для сайта', 'статьи',
			'articles', 'написать статью', 'write article', 'тексты для', 'контент для',
			'написание контента', 'content writing', 'текстовый контент', 'text content'
		],
		typicalPriceRange: { min: 1000, max: 10000, average: 4000 },
		complexity: 'simple',
		typicalHours: 2,
		description: 'Написание текстового контента'
	},
	{
		id: 'translation',
		name: 'Перевод',
		keywords: [
			'перевод', 'translation', 'перевести', 'translate', 'перевод текста', 'text translation',
			'перевод для', 'translation для', 'перевести на', 'translate на', 'перевод с',
			'translate с', 'перевод сайта', 'site translation', 'перевод контента', 'content translation',
			'локализация', 'localization', 'перевод на английский', 'translate to english'
		],
		typicalPriceRange: { min: 500, max: 5000, average: 2000 },
		complexity: 'simple',
		typicalHours: 1,
		description: 'Перевод текста или контента'
	},
	
	// ========== МАРКЕТИНГ ЗАДАЧИ ==========
	{
		id: 'smm',
		name: 'SMM продвижение',
		keywords: [
			'smm', 'smm продвижение', 'smm для', 'продвижение в соцсетях', 'social media marketing',
			'продвижение соцсетей', 'social media promotion', 'smm стратегия', 'smm strategy',
			'продвижение в инстаграм', 'instagram promotion', 'продвижение в вк', 'vk promotion',
			'продвижение в телеграм', 'telegram promotion', 'контент для соцсетей', 'social media content'
		],
		typicalPriceRange: { min: 10000, max: 100000, average: 40000 },
		complexity: 'medium',
		typicalHours: 20,
		description: 'Продвижение в социальных сетях'
	},
	{
		id: 'advertising',
		name: 'Настройка рекламы',
		keywords: [
			'реклама', 'advertising', 'настроить рекламу', 'setup advertising', 'реклама для',
			'advertising для', 'яндекс директ', 'yandex direct', 'google ads', 'настроить директ',
			'setup direct', 'контекстная реклама', 'contextual advertising', 'рекламная кампания',
			'advertising campaign', 'настроить рекламную кампанию', 'setup ad campaign'
		],
		typicalPriceRange: { min: 15000, max: 120000, average: 60000 },
		complexity: 'medium',
		typicalHours: 25,
		description: 'Настройка рекламных кампаний'
	}
]

/**
 * Находит наиболее подходящий тип задачи на основе текста
 * Улучшенный алгоритм с более гибким сопоставлением
 */
export function findTaskType(title: string, description: string): TaskType | null {
	const fullText = `${title} ${description}`.toLowerCase()
	const titleLower = title.toLowerCase()
	const descriptionLower = description.toLowerCase()
	
	// Нормализуем текст: убираем лишние пробелы, приводим к нижнему регистру
	const normalizedFullText = fullText
		.replace(/[^\w\sа-яё]/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	
	let bestMatch: TaskType | null = null
	let bestScore = 0
	
	for (const taskType of TASK_PRICE_KNOWLEDGE) {
		let score = 0
		let matchedKeywords: string[] = []
		
		// Проверяем каждое ключевое слово
		for (const keyword of taskType.keywords) {
			const keywordLower = keyword.toLowerCase()
			const normalizedKeyword = keywordLower.replace(/[^\w\sа-яё]/gi, ' ').trim()
			
			// Точное совпадение слова (с границами слов)
			const exactMatchRegex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
			const exactMatch = exactMatchRegex.test(normalizedFullText)
			
			// Частичное совпадение (слово содержится в тексте)
			const partialMatch = normalizedFullText.includes(normalizedKeyword)
			
			if (exactMatch || partialMatch) {
				// Базовые очки за совпадение
				let keywordScore = normalizedKeyword.length
				
				// Точное совпадение дает больше очков
				if (exactMatch) {
					keywordScore *= 2
				}
				
				// Если ключевое слово найдено в заголовке - значительно больше очков
				if (titleLower.includes(keywordLower)) {
					keywordScore *= 3
				}
				
				// Если ключевое слово найдено в начале заголовка - еще больше очков
				if (titleLower.startsWith(keywordLower) || titleLower.indexOf(keywordLower) < 20) {
					keywordScore *= 1.5
				}
				
				// Длинные ключевые фразы (более 10 символов) дают больше очков
				if (normalizedKeyword.length > 10) {
					keywordScore *= 1.5
				}
				
				// Множественные совпадения одного типа задачи увеличивают уверенность
				if (matchedKeywords.length > 0) {
					keywordScore *= 1.2
				}
				
				score += keywordScore
				matchedKeywords.push(keyword)
			}
		}
		
		// Бонус за количество совпавших ключевых слов
		if (matchedKeywords.length > 1) {
			score *= 1.3
		}
		if (matchedKeywords.length > 3) {
			score *= 1.5
		}
		if (matchedKeywords.length > 5) {
			score *= 1.7
		}
		
		// Учитываем сложность задачи - более специфичные задачи (very_complex) требуют больше совпадений
		if (taskType.complexity === 'very_complex' && matchedKeywords.length < 2) {
			score *= 0.5 // Понижаем оценку если мало совпадений для сложных задач
		}
		
		if (score > bestScore) {
			bestScore = score
			bestMatch = taskType
		}
	}
	
	// Динамический порог в зависимости от длины текста
	// Для коротких текстов (меньше 50 символов) нужен меньший порог
	// Для длинных текстов (больше 500 символов) нужен больший порог
	const textLength = fullText.length
	let threshold = 5
	
	if (textLength < 50) {
		threshold = 3 // Для очень коротких текстов
	} else if (textLength < 200) {
		threshold = 5 // Для средних текстов
	} else if (textLength < 500) {
		threshold = 8 // Для длинных текстов
	} else {
		threshold = 12 // Для очень длинных текстов
	}
	
	// Возвращаем только если набрано достаточно очков
	return bestScore >= threshold ? bestMatch : null
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

