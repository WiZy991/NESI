import { check, sleep } from 'k6'
import http from 'k6/http'
import {
	checkCacheHeaders,
	checkRateLimit,
	config,
	getAuthHeaders,
	logResponse,
} from './config.js'

export let options = {
	stages: [
		{ duration: '2m', target: 10 }, // Разогрев
		{ duration: '5m', target: 50 }, // Нормальная нагрузка
		{ duration: '2m', target: 100 }, // Высокая нагрузка
		{ duration: '5m', target: 100 }, // Поддержание высокой нагрузки
		{ duration: '2m', target: 200 }, // Пиковая нагрузка
		{ duration: '2m', target: 100 }, // Снижение
		{ duration: '2m', target: 50 }, // Возврат к нормальной
		{ duration: '2m', target: 0 }, // Завершение
	],
	thresholds: {
		http_req_duration: ['p(95)<1000'],
		http_req_failed: ['rate<0.05'],
		'http_req_duration{name:login}': ['p(95)<2000'],
		'http_req_duration{name:getTasks}': ['p(95)<500'],
		'http_req_duration{name:getUsers}': ['p(95)<500'],
		'http_req_duration{name:getNotifications}': ['p(95)<300'],
		'http_req_duration{name:getCategories}': ['p(95)<200'],
		'http_req_duration{name:createTask}': ['p(95)<2000'],
		'http_req_duration{name:sendMessage}': ['p(95)<1000'],
		'http_req_duration{name:cached}': ['p(95)<100'],
	},
}

let tokens = []

export function setup() {
	const baseUrl = config.baseUrl

	// Подготавливаем токены для полного теста
	for (let i = 0; i < 15; i++) {
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

	// Полный тест - все операции
	const operation = Math.random()

	if (operation < 0.2) {
		// 20% - Логин
		testLogin(baseUrl)
	} else if (operation < 0.35) {
		// 15% - Получение задач
		testGetTasks(baseUrl, token)
	} else if (operation < 0.45) {
		// 10% - Получение пользователей
		testGetUsers(baseUrl, token)
	} else if (operation < 0.55) {
		// 10% - Получение уведомлений
		testGetNotifications(baseUrl, token)
	} else if (operation < 0.65) {
		// 10% - Получение категорий
		testGetCategories(baseUrl)
	} else if (operation < 0.75) {
		// 10% - Получение профиля
		testGetProfile(baseUrl, token)
	} else if (operation < 0.85) {
		// 10% - Создание задачи
		testCreateTask(baseUrl, token)
	} else if (operation < 0.95) {
		// 10% - Отправка сообщения
		testSendMessage(baseUrl, token)
	} else {
		// 5% - Тест кеширования
		testCaching(baseUrl)
	}

	sleep(0.5)
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
		sleep(1)
	}

	logResponse(loginResponse, 'Login')
}

function testGetTasks(baseUrl, token) {
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
		'tasks response time < 500ms': r => r.timings.duration < 500,
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

function testCreateTask(baseUrl, token) {
	const taskPayload = JSON.stringify({
		title: `Full Load Test Task ${Date.now()}`,
		description: 'This is a full load test task',
		price: Math.floor(Math.random() * 10000) + 1000,
	})

	const createTaskResponse = http.post(`${baseUrl}/api/tasks`, taskPayload, {
		headers: getAuthHeaders(token),
		tags: { name: 'createTask' },
	})

	check(createTaskResponse, {
		'create task status is 200 or 400': r =>
			r.status === 200 || r.status === 400,
		'create task response time < 2000ms': r => r.timings.duration < 2000,
	})

	logResponse(createTaskResponse, 'Create Task')
}

function testSendMessage(baseUrl, token) {
	const messagePayload = JSON.stringify({
		recipientId: 'test-recipient-id',
		content: 'Full load test message',
	})

	const sendMessageResponse = http.post(
		`${baseUrl}/api/messages/send`,
		messagePayload,
		{
			headers: getAuthHeaders(token),
			tags: { name: 'sendMessage' },
		}
	)

	check(sendMessageResponse, {
		'send message status is 200, 400, or 429': r =>
			[200, 400, 429].includes(r.status),
		'send message response time < 1000ms': r => r.timings.duration < 1000,
	})

	if (checkRateLimit(sendMessageResponse)) {
		sleep(2)
	}

	logResponse(sendMessageResponse, 'Send Message')
}

function testCaching(baseUrl) {
	// Тестируем кеширование
	const categoriesResponse = http.get(`${baseUrl}/api/categories`, {
		tags: { name: 'cached' },
	})

	check(categoriesResponse, {
		'cached response time < 100ms': r => r.timings.duration < 100,
		'cached has cache headers': r => {
			const cache = checkCacheHeaders(r)
			return cache.hasCacheControl
		},
	})

	logResponse(categoriesResponse, 'Cached Request')
}

export function handleSummary(data) {
	const errorRate = (
		(data.metrics.http_req_failed.values.count /
			data.metrics.http_reqs.values.count) *
		100
	).toFixed(2)
	const totalRequests = data.metrics.http_reqs.values.count
	const maxVUs = data.metrics.vus_max.values.max

	return {
		'full-load-test-results.json': JSON.stringify(data, null, 2),
		stdout: `
=== Full Load Test Results ===
Total Requests: ${totalRequests}
Failed Requests: ${data.metrics.http_req_failed.values.count}
Error Rate: ${errorRate}%
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
Max Response Time: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Load Performance:
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
- Get Users: ${data.metrics[
			'http_req_duration{name:getUsers}'
		].values.avg.toFixed(2)}ms avg, ${data.metrics[
			'http_req_duration{name:getUsers}'
		].values['p(95)'].toFixed(2)}ms p95
- Get Notifications: ${data.metrics[
			'http_req_duration{name:getNotifications}'
		].values.avg.toFixed(2)}ms avg, ${data.metrics[
			'http_req_duration{name:getNotifications}'
		].values['p(95)'].toFixed(2)}ms p95
- Get Categories: ${data.metrics[
			'http_req_duration{name:getCategories}'
		].values.avg.toFixed(2)}ms avg, ${data.metrics[
			'http_req_duration{name:getCategories}'
		].values['p(95)'].toFixed(2)}ms p95
- Create Task: ${data.metrics[
			'http_req_duration{name:createTask}'
		].values.avg.toFixed(2)}ms avg, ${data.metrics[
			'http_req_duration{name:createTask}'
		].values['p(95)'].toFixed(2)}ms p95
- Send Message: ${data.metrics[
			'http_req_duration{name:sendMessage}'
		].values.avg.toFixed(2)}ms avg, ${data.metrics[
			'http_req_duration{name:sendMessage}'
		].values['p(95)'].toFixed(2)}ms p95

Cache Performance:
- Cached Requests: ${data.metrics[
			'http_req_duration{name:cached}'
		].values.avg.toFixed(2)}ms avg

Overall Assessment:
${
	errorRate < 2
		? '✅ EXCELLENT: System handled full load with minimal errors'
		: errorRate < 5
		? '✅ GOOD: System handled load with acceptable error rate'
		: '⚠️  WARNING: High error rate under full load'
}
${
	maxVUs >= 200
		? '🔥 HIGH LOAD: System handled ' + maxVUs + ' concurrent users'
		: '📈 MODERATE LOAD: System handled ' + maxVUs + ' concurrent users'
}
${
	data.metrics.http_req_duration.values['p(95)'] < 1000
		? '✅ EXCELLENT: Response times remained stable'
		: '⚠️  WARNING: Response times degraded under load'
}
    `,
	}
}

