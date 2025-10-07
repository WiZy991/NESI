import { check, sleep } from 'k6'
import http from 'k6/http'
import {
	checkRateLimit,
	config,
	getAuthHeaders,
	logResponse,
} from './config.js'

export let options = {
	stages: config.load.spike.stages,
	thresholds: {
		http_req_duration: ['p(95)<2000'], // Более мягкие пороги для спайк-теста
		http_req_failed: ['rate<0.1'], // Допускаем до 10% ошибок
		'http_req_duration{name:login}': ['p(95)<3000'],
		'http_req_duration{name:getTasks}': ['p(95)<2000'],
	},
}

export default function () {
	const baseUrl = config.baseUrl

	// Случайный выбор операции для спайк-теста
	const operation = Math.random()

	if (operation < 0.4) {
		// 40% - Логин (наиболее вероятная операция при спайке)
		testLogin(baseUrl)
	} else if (operation < 0.7) {
		// 30% - Получение задач
		testGetTasks(baseUrl)
	} else if (operation < 0.9) {
		// 20% - Получение категорий (кешированные)
		testGetCategories(baseUrl)
	} else {
		// 10% - Получение пользователей
		testGetUsers(baseUrl)
	}

	// Минимальная задержка для имитации реального спайка
	sleep(0.05)
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
		'login status is 200, 401, or 429': r => [200, 401, 429].includes(r.status),
		'login response time < 3000ms': r => r.timings.duration < 3000,
	})

	if (checkRateLimit(loginResponse)) {
		// При rate limiting ждем дольше
		sleep(2)
	}

	logResponse(loginResponse, 'Login')
}

function testGetTasks(baseUrl) {
	// Пытаемся получить токен для авторизованных запросов
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

	let token = null
	if (loginResponse.status === 200) {
		token = JSON.parse(loginResponse.body).token
	}

	const tasksResponse = http.get(`${baseUrl}/api/tasks?page=1&limit=20`, {
		headers: token
			? getAuthHeaders(token)
			: { 'Content-Type': 'application/json' },
		tags: { name: 'getTasks' },
	})

	check(tasksResponse, {
		'tasks status is 200, 401, or 429': r => [200, 401, 429].includes(r.status),
		'tasks response time < 2000ms': r => r.timings.duration < 2000,
	})

	logResponse(tasksResponse, 'Get Tasks')
}

function testGetCategories(baseUrl) {
	const categoriesResponse = http.get(`${baseUrl}/api/categories`, {
		tags: { name: 'getCategories' },
	})

	check(categoriesResponse, {
		'categories status is 200': r => r.status === 200,
		'categories response time < 1000ms': r => r.timings.duration < 1000,
	})

	logResponse(categoriesResponse, 'Get Categories')
}

function testGetUsers(baseUrl) {
	// Пытаемся получить токен
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

	let token = null
	if (loginResponse.status === 200) {
		token = JSON.parse(loginResponse.body).token
	}

	const usersResponse = http.get(`${baseUrl}/api/users?page=1&limit=20`, {
		headers: token
			? getAuthHeaders(token)
			: { 'Content-Type': 'application/json' },
		tags: { name: 'getUsers' },
	})

	check(usersResponse, {
		'users status is 200, 401, or 429': r => [200, 401, 429].includes(r.status),
		'users response time < 2000ms': r => r.timings.duration < 2000,
	})

	logResponse(usersResponse, 'Get Users')
}

export function handleSummary(data) {
	const errorRate = (
		(data.metrics.http_req_failed.values.count /
			data.metrics.http_reqs.values.count) *
		100
	).toFixed(2)
	const maxVUs = data.metrics.vus_max.values.max

	return {
		'spike-test-results.json': JSON.stringify(data, null, 2),
		stdout: `
=== Spike Test Results ===
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.count}
Error Rate: ${errorRate}%
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
Max Response Time: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Spike Performance:
- Max VUs: ${maxVUs}
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

Spike Analysis:
${
	maxVUs >= 200
		? '🔥 EXTREME SPIKE: System handled ' + maxVUs + ' concurrent users'
		: '📈 MODERATE SPIKE: System handled ' + maxVUs + ' concurrent users'
}
${
	errorRate > 10
		? '⚠️  WARNING: High error rate during spike!'
		: '✅ System recovered well from spike'
}
    `,
	}
}
