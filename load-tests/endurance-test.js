import { check, sleep } from 'k6'
import http from 'k6/http'
import { config, getAuthHeaders, logResponse } from './config.js'

export let options = {
	stages: config.load.endurance.stages,
	thresholds: {
		http_req_duration: ['p(95)<1000'],
		http_req_failed: ['rate<0.01'], // Очень низкий порог ошибок для выносливости
		'http_req_duration{name:login}': ['p(95)<1500'],
		'http_req_duration{name:getTasks}': ['p(95)<500'],
		'http_req_duration{name:getUsers}': ['p(95)<500'],
	},
}

let tokens = []
let tokenRefreshTime = 0

export function setup() {
	const baseUrl = config.baseUrl

	// Подготавливаем токены для теста на выносливость
	for (let i = 0; i < 5; i++) {
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
	const currentTime = Date.now()

	// Обновляем токены каждые 5 минут
	if (currentTime - tokenRefreshTime > 300000) {
		data.tokens = refreshTokens(baseUrl)
		tokenRefreshTime = currentTime
	}

	const token = data.tokens[Math.floor(Math.random() * data.tokens.length)]

	// Тест на выносливость - стабильная нагрузка
	const operation = Math.random()

	if (operation < 0.3) {
		// 30% - Получение задач
		testGetTasks(baseUrl, token)
	} else if (operation < 0.5) {
		// 20% - Получение пользователей
		testGetUsers(baseUrl, token)
	} else if (operation < 0.7) {
		// 20% - Получение категорий
		testGetCategories(baseUrl)
	} else if (operation < 0.85) {
		// 15% - Получение уведомлений
		testGetNotifications(baseUrl, token)
	} else if (operation < 0.95) {
		// 10% - Получение профиля
		testGetProfile(baseUrl, token)
	} else {
		// 5% - Логин (для проверки стабильности)
		testLogin(baseUrl)
	}

	sleep(1) // Стандартная задержка для имитации реального использования
}

function refreshTokens(baseUrl) {
	const newTokens = []

	for (let i = 0; i < 5; i++) {
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
			newTokens.push(JSON.parse(loginResponse.body).token)
		}
	}

	return newTokens
}

function testLogin(baseUrl) {
	const loginResponse = http.post(
		`${baseUrl}/api/auth/login`,
		JSON.stringify({
			email: config.testUsers.customer.email,
			password: config.testUsers.customer.password,
		}),
		{
			headers: { 'Content-Type': 'application/json' },
			tags: { name: 'login' },
		}
	)

	check(loginResponse, {
		'login status is 200': r => r.status === 200,
		'login response time < 1500ms': r => r.timings.duration < 1500,
		'login returns token': r => {
			try {
				const body = JSON.parse(r.body)
				return !!body.token
			} catch {
				return false
			}
		},
	})

	logResponse(loginResponse, 'Login')
}

function testGetTasks(baseUrl, token) {
	const page = Math.floor(Math.random() * 3) + 1
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
		'tasks response time < 500ms': r => r.timings.duration < 500,
		'tasks returns data': r => {
			try {
				const body = JSON.parse(r.body)
				return !!body.tasks
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
		'users response time < 500ms': r => r.timings.duration < 500,
	})

	logResponse(usersResponse, 'Get Users')
}

function testGetCategories(baseUrl) {
	const categoriesResponse = http.get(`${baseUrl}/api/categories`, {
		tags: { name: 'getCategories' },
	})

	check(categoriesResponse, {
		'categories status is 200': r => r.status === 200,
		'categories response time < 200ms': r => r.timings.duration < 200,
	})

	logResponse(categoriesResponse, 'Get Categories')
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
		'notifications response time < 300ms': r => r.timings.duration < 300,
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
		'profile response time < 300ms': r => r.timings.duration < 300,
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
	const testDuration = data.metrics.iteration_duration.values.max / 1000 / 60 // в минутах

	return {
		'endurance-test-results.json': JSON.stringify(data, null, 2),
		stdout: `
=== Endurance Test Results ===
Test Duration: ${testDuration.toFixed(2)} minutes
Total Requests: ${totalRequests}
Failed Requests: ${data.metrics.http_req_failed.values.count}
Error Rate: ${errorRate}%
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
Max Response Time: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Endurance Performance:
- Max VUs: ${data.metrics.vus_max.values.max}
- Average VUs: ${data.metrics.vus.values.avg.toFixed(2)}
- Requests per minute: ${(totalRequests / testDuration).toFixed(2)}

Operation Performance:
- Login: ${data.metrics['http_req_duration{name:login}'].values.avg.toFixed(
			2
		)}ms avg, ${data.metrics['http_req_duration{name:login}'].values[
			'p(95)'
		].toFixed(2)}ms p95
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

Endurance Analysis:
${
	testDuration >= 30
		? '🏆 EXCELLENT: System maintained stability for ' +
		  testDuration.toFixed(2) +
		  ' minutes'
		: '⏱️  SHORT TEST: Test ran for ' + testDuration.toFixed(2) + ' minutes'
}
${
	errorRate < 0.5
		? '✅ EXCELLENT: Very low error rate over time'
		: errorRate < 1
		? '✅ GOOD: Low error rate over time'
		: '⚠️  WARNING: Error rate increased over time'
}
${
	data.metrics.http_req_duration.values.avg < 500
		? '✅ EXCELLENT: Consistent response times'
		: '⚠️  WARNING: Response times degraded over time'
}
    `,
	}
}





