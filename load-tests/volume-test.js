import { check, sleep } from 'k6'
import http from 'k6/http'
import {
	checkCacheHeaders,
	config,
	getAuthHeaders,
	logResponse,
} from './config.js'

export let options = {
	stages: config.load.volume.stages,
	thresholds: {
		http_req_duration: ['p(95)<500'],
		http_req_failed: ['rate<0.02'], // Допускаем до 2% ошибок
		'http_req_duration{name:getTasks}': ['p(95)<300'],
		'http_req_duration{name:getUsers}': ['p(95)<300'],
		'http_req_duration{name:getCategories}': ['p(95)<100'],
		'http_req_duration{name:cached}': ['p(95)<50'],
	},
}

let tokens = []

export function setup() {
	const baseUrl = config.baseUrl

	// Подготавливаем токены для объемного теста
	for (let i = 0; i < 20; i++) {
		const loginResponse = http.post(
			`${baseUrl}/api/auth/login`,
			JSON.stringify({
				email: config.testUsers.customer.email,
				password: config.testUsers.customer.password,
			}),
			{
				headers: { 'Content-Type': 'application/json' },
			}
		)

		if (loginResponse.status === 200) {
			tokens.push(JSON.parse(loginResponse.body).token)
		}
	}

	return { tokens }
}

export default function (data) {
	const baseUrl = config.baseUrl
	const token = data.tokens[Math.floor(Math.random() * data.tokens.length)]

	// Объемный тест - много запросов на чтение
	const operation = Math.random()

	if (operation < 0.4) {
		// 40% - Получение задач
		testGetTasks(baseUrl, token)
	} else if (operation < 0.6) {
		// 20% - Получение пользователей
		testGetUsers(baseUrl, token)
	} else if (operation < 0.8) {
		// 20% - Получение категорий (кешированные)
		testGetCategories(baseUrl)
	} else if (operation < 0.9) {
		// 10% - Получение уведомлений
		testGetNotifications(baseUrl, token)
	} else {
		// 10% - Получение профиля
		testGetProfile(baseUrl, token)
	}

	sleep(0.2) // Небольшая задержка для имитации реального использования
}

function testGetTasks(baseUrl, token) {
	// Тестируем разные страницы и лимиты
	const page = Math.floor(Math.random() * 5) + 1
	const limit = [10, 20, 50][Math.floor(Math.random() * 3)]

	const tasksResponse = http.get(
		`${baseUrl}/api/tasks?page=${page}&limit=${limit}`,
		{
			headers: getAuthHeaders(token),
			tags: { name: 'getTasks' },
		}
	)

	check(tasksResponse, {
		'tasks status is 200': r => r.status === 200,
		'tasks response time < 300ms': r => r.timings.duration < 300,
		'tasks returns pagination': r => {
			try {
				const body = JSON.parse(r.body)
				return !!body.pagination
			} catch {
				return false
			}
		},
	})

	logResponse(tasksResponse, 'Get Tasks')
}

function testGetUsers(baseUrl, token) {
	const page = Math.floor(Math.random() * 3) + 1
	const limit = [10, 20, 50][Math.floor(Math.random() * 3)]

	const usersResponse = http.get(
		`${baseUrl}/api/users?page=${page}&limit=${limit}`,
		{
			headers: getAuthHeaders(token),
			tags: { name: 'getUsers' },
		}
	)

	check(usersResponse, {
		'users status is 200': r => r.status === 200,
		'users response time < 300ms': r => r.timings.duration < 300,
	})

	logResponse(usersResponse, 'Get Users')
}

function testGetCategories(baseUrl) {
	const categoriesResponse = http.get(`${baseUrl}/api/categories`, {
		tags: { name: 'getCategories' },
	})

	check(categoriesResponse, {
		'categories status is 200': r => r.status === 200,
		'categories response time < 100ms': r => r.timings.duration < 100,
		'categories has cache headers': r => {
			const cache = checkCacheHeaders(r)
			return cache.hasCacheControl
		},
	})

	logResponse(categoriesResponse, 'Get Categories')

	// Тестируем кеширование - повторный запрос
	if (Math.random() < 0.5) {
		const cachedResponse = http.get(`${baseUrl}/api/categories`, {
			tags: { name: 'cached' },
		})

		check(cachedResponse, {
			'cached response time < 50ms': r => r.timings.duration < 50,
		})
	}
}

function testGetNotifications(baseUrl, token) {
	const page = Math.floor(Math.random() * 3) + 1
	const limit = [10, 20, 30][Math.floor(Math.random() * 3)]

	const notificationsResponse = http.get(
		`${baseUrl}/api/notifications?page=${page}&limit=${limit}`,
		{
			headers: getAuthHeaders(token),
			tags: { name: 'getNotifications' },
		}
	)

	check(notificationsResponse, {
		'notifications status is 200': r => r.status === 200,
		'notifications response time < 200ms': r => r.timings.duration < 200,
	})

	logResponse(notificationsResponse, 'Get Notifications')
}

function testGetProfile(baseUrl, token) {
	const profileResponse = http.get(`${baseUrl}/api/me`, {
		headers: getAuthHeaders(token),
		tags: { name: 'getProfile' },
	})

	check(profileResponse, {
		'profile status is 200': r => r.status === 200,
		'profile response time < 200ms': r => r.timings.duration < 200,
	})

	logResponse(profileResponse, 'Get Profile')
}

export function handleSummary(data) {
	const errorRate = (
		(data.metrics.http_req_failed.values.count /
			data.metrics.http_reqs.values.count) *
		100
	).toFixed(2)
	const totalRequests = data.metrics.http_reqs.values.count

	return {
		'volume-test-results.json': JSON.stringify(data, null, 2),
		stdout: `
=== Volume Test Results ===
Total Requests: ${totalRequests}
Failed Requests: ${data.metrics.http_req_failed.values.count}
Error Rate: ${errorRate}%
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
Max Response Time: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Volume Performance:
- Max VUs: ${data.metrics.vus_max.values.max}
- Average VUs: ${data.metrics.vus.values.avg.toFixed(2)}
- Requests per second: ${(
			totalRequests /
			(data.metrics.iteration_duration.values.max / 1000)
		).toFixed(2)}

Operation Performance:
- Get Tasks: ${data.metrics[
			'http_req_duration{name:getTasks}'
		].values.avg.toFixed(2)}ms avg, ${data.metrics[
			'http_req_duration{name:getTasks}'
		].values['p(95)'].toFixed(2)}ms p95
- Get Users: ${data.metrics[
			'http_req_duration{name:getUsers}'
		].values.avg.toFixed(2)}ms avg, ${data.metrics[
			'http_req_duration{name:getUsers}'
		].values['p(95)'].toFixed(2)}ms p95
- Get Categories: ${data.metrics[
			'http_req_duration{name:getCategories}'
		].values.avg.toFixed(2)}ms avg, ${data.metrics[
			'http_req_duration{name:getCategories}'
		].values['p(95)'].toFixed(2)}ms p95

Cache Performance:
- Cached Requests: ${data.metrics[
			'http_req_duration{name:cached}'
		].values.avg.toFixed(2)}ms avg

Volume Analysis:
${
	totalRequests > 10000
		? '📊 HIGH VOLUME: ' + totalRequests + ' requests processed'
		: '📈 MODERATE VOLUME: ' + totalRequests + ' requests processed'
}
${
	errorRate < 1
		? '✅ EXCELLENT: Low error rate under high volume'
		: errorRate < 2
		? '✅ GOOD: Acceptable error rate'
		: '⚠️  WARNING: High error rate under volume load'
}
    `,
	}
}







