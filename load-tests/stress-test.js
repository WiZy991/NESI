import { check, sleep } from 'k6'
import http from 'k6/http'
import {
	checkRateLimit,
	config,
	getAuthHeaders,
	logResponse,
} from './config.js'

export let options = {
	stages: config.load.stress.stages,
	thresholds: {
		http_req_duration: ['p(95)<1000'], // Более мягкие пороги для стресс-теста
		http_req_failed: ['rate<0.05'], // Допускаем до 5% ошибок
		'http_req_duration{name:login}': ['p(95)<2000'],
		'http_req_duration{name:getTasks}': ['p(95)<1000'],
	},
}

let tokens = []

export function setup() {
	const baseUrl = config.baseUrl

	// Подготавливаем токены для стресс-теста
	for (let i = 0; i < 10; i++) {
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

	// Случайный выбор операции
	const operation = Math.random()

	if (operation < 0.3) {
		// 30% - Логин
		testLogin(baseUrl)
	} else if (operation < 0.5) {
		// 20% - Получение задач
		testGetTasks(baseUrl, token)
	} else if (operation < 0.7) {
		// 20% - Получение пользователей
		testGetUsers(baseUrl, token)
	} else if (operation < 0.85) {
		// 15% - Получение уведомлений
		testGetNotifications(baseUrl, token)
	} else if (operation < 0.95) {
		// 10% - Получение категорий
		testGetCategories(baseUrl)
	} else {
		// 5% - Создание задачи
		testCreateTask(baseUrl, token)
	}

	sleep(0.1) // Минимальная задержка для максимальной нагрузки
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
		'login status is 200 or 429': r => r.status === 200 || r.status === 429,
		'login response time < 2000ms': r => r.timings.duration < 2000,
	})

	if (checkRateLimit(loginResponse)) {
		sleep(1) // Ждем при rate limiting
	}

	logResponse(loginResponse, 'Login')
}

function testGetTasks(baseUrl, token) {
	const tasksResponse = http.get(`${baseUrl}/api/tasks?page=1&limit=20`, {
		headers: getAuthHeaders(token),
		tags: { name: 'getTasks' },
	})

	check(tasksResponse, {
		'tasks status is 200 or 401': r => r.status === 200 || r.status === 401,
		'tasks response time < 1000ms': r => r.timings.duration < 1000,
	})

	logResponse(tasksResponse, 'Get Tasks')
}

function testGetUsers(baseUrl, token) {
	const usersResponse = http.get(`${baseUrl}/api/users?page=1&limit=20`, {
		headers: getAuthHeaders(token),
		tags: { name: 'getUsers' },
	})

	check(usersResponse, {
		'users status is 200 or 401': r => r.status === 200 || r.status === 401,
		'users response time < 1000ms': r => r.timings.duration < 1000,
	})

	logResponse(usersResponse, 'Get Users')
}

function testGetNotifications(baseUrl, token) {
	const notificationsResponse = http.get(
		`${baseUrl}/api/notifications?page=1&limit=20`,
		{
			headers: getAuthHeaders(token),
			tags: { name: 'getNotifications' },
		}
	)

	check(notificationsResponse, {
		'notifications status is 200 or 401': r =>
			r.status === 200 || r.status === 401,
		'notifications response time < 1000ms': r => r.timings.duration < 1000,
	})

	logResponse(notificationsResponse, 'Get Notifications')
}

function testGetCategories(baseUrl) {
	const categoriesResponse = http.get(`${baseUrl}/api/categories`, {
		tags: { name: 'getCategories' },
	})

	check(categoriesResponse, {
		'categories status is 200': r => r.status === 200,
		'categories response time < 500ms': r => r.timings.duration < 500,
	})

	logResponse(categoriesResponse, 'Get Categories')
}

function testCreateTask(baseUrl, token) {
	const taskPayload = JSON.stringify({
		title: `Stress Test Task ${Date.now()}`,
		description: 'This is a stress test task',
		price: Math.floor(Math.random() * 10000) + 1000,
	})

	const createTaskResponse = http.post(`${baseUrl}/api/tasks`, taskPayload, {
		headers: getAuthHeaders(token),
		tags: { name: 'createTask' },
	})

	check(createTaskResponse, {
		'create task status is 200, 400, or 401': r =>
			[200, 400, 401].includes(r.status),
		'create task response time < 2000ms': r => r.timings.duration < 2000,
	})

	logResponse(createTaskResponse, 'Create Task')
}

export function handleSummary(data) {
	const errorRate = (
		(data.metrics.http_req_failed.values.count /
			data.metrics.http_reqs.values.count) *
		100
	).toFixed(2)

	return {
		'stress-test-results.json': JSON.stringify(data, null, 2),
		stdout: `
=== Stress Test Results ===
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.count}
Error Rate: ${errorRate}%
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
Max Response Time: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Peak Performance:
- Max VUs: ${data.metrics.vus_max.values.max}
- Average VUs: ${data.metrics.vus.values.avg.toFixed(2)}

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

${
	errorRate > 5
		? '⚠️  WARNING: High error rate detected!'
		: '✅ Error rate within acceptable limits'
}
    `,
	}
}

