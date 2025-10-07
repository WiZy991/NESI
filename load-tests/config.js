// Конфигурация для нагрузочных тестов
export const config = {
	// Базовые настройки
	baseUrl: __ENV.BASE_URL || 'http://localhost:3000',

	// Тестовые пользователи
	testUsers: {
		customer: {
			email: __ENV.CUSTOMER_EMAIL || 'customer@test.com',
			password: __ENV.CUSTOMER_PASSWORD || 'password123',
		},
		executor: {
			email: __ENV.EXECUTOR_EMAIL || 'executor@test.com',
			password: __ENV.EXECUTOR_PASSWORD || 'password123',
		},
		admin: {
			email: __ENV.ADMIN_EMAIL || 'admin@test.com',
			password: __ENV.ADMIN_PASSWORD || 'password123',
		},
	},

	// Настройки нагрузки
	load: {
		// Обычная нагрузка
		normal: {
			stages: [
				{ duration: '2m', target: 10 }, // Разогрев
				{ duration: '5m', target: 10 }, // Стабильная нагрузка
				{ duration: '2m', target: 0 }, // Снижение
			],
		},

		// Высокая нагрузка
		high: {
			stages: [
				{ duration: '2m', target: 50 },
				{ duration: '5m', target: 50 },
				{ duration: '2m', target: 0 },
			],
		},

		// Стресс-тест
		stress: {
			stages: [
				{ duration: '2m', target: 10 },
				{ duration: '5m', target: 50 },
				{ duration: '2m', target: 100 },
				{ duration: '5m', target: 100 },
				{ duration: '2m', target: 0 },
			],
		},

		// Спайк-тест
		spike: {
			stages: [
				{ duration: '1m', target: 10 },
				{ duration: '1m', target: 200 }, // Резкий скачок
				{ duration: '1m', target: 10 },
				{ duration: '1m', target: 200 }, // Еще один скачок
				{ duration: '1m', target: 0 },
			],
		},

		// Объемный тест
		volume: {
			stages: [
				{ duration: '2m', target: 100 },
				{ duration: '10m', target: 100 },
				{ duration: '2m', target: 0 },
			],
		},

		// Тест на выносливость
		endurance: {
			stages: [
				{ duration: '2m', target: 20 },
				{ duration: '30m', target: 20 }, // Длительная нагрузка
				{ duration: '2m', target: 0 },
			],
		},
	},

	// Пороги производительности
	thresholds: {
		// HTTP запросы
		http_req_duration: ['p(95)<500'], // 95% запросов должны быть быстрее 500ms
		http_req_failed: ['rate<0.01'], // Менее 1% ошибок

		// API endpoints
		'http_req_duration{name:login}': ['p(95)<1000'],
		'http_req_duration{name:getTasks}': ['p(95)<300'],
		'http_req_duration{name:getUsers}': ['p(95)<300'],
		'http_req_duration{name:getNotifications}': ['p(95)<200'],
		'http_req_duration{name:sendMessage}': ['p(95)<500'],

		// Rate limiting
		'http_req_duration{name:rateLimited}': ['p(95)<100'],

		// Кеширование
		'http_req_duration{name:cached}': ['p(95)<50'],
	},

	// Настройки для разных типов тестов
	options: {
		// Общие настройки
		discardResponseBodies: false,
		insecureSkipTLSVerify: true,

		// Настройки для продакшена
		production: {
			discardResponseBodies: true,
			insecureSkipTLSVerify: false,
		},
	},
}

// Утилиты для работы с токенами
export function getAuthHeaders(token) {
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
	}
}

// Утилиты для логирования
export function logResponse(response, context = '') {
	if (response.status >= 400) {
		console.error(`${context}: ${response.status} - ${response.body}`)
	}
}

// Утилиты для проверки rate limiting
export function checkRateLimit(response) {
	const retryAfter = response.headers['Retry-After']
	const rateLimitRemaining = response.headers['X-RateLimit-Remaining']

	if (response.status === 429) {
		console.warn(
			`Rate limited. Retry after: ${retryAfter}s, Remaining: ${rateLimitRemaining}`
		)
		return true
	}
	return false
}

// Утилиты для проверки кеширования
export function checkCacheHeaders(response) {
	const cacheControl = response.headers['Cache-Control']
	const etag = response.headers['ETag']

	return {
		hasCacheControl: !!cacheControl,
		hasETag: !!etag,
		cacheControl: cacheControl,
	}
}
