import { check, sleep } from 'k6'
import http from 'k6/http'
import {
	checkCacheHeaders,
	config,
	getAuthHeaders,
	logResponse,
} from './config.js'

export let options = {
	stages: config.load.high.stages,
	thresholds: {
		'http_req_duration{name:getTasks}': ['p(95)<300'],
		'http_req_duration{name:getUsers}': ['p(95)<300'],
		'http_req_duration{name:getNotifications}': ['p(95)<200'],
		'http_req_duration{name:getCategories}': ['p(95)<100'],
		'http_req_duration{name:cached}': ['p(95)<50'],
		http_req_failed: ['rate<0.01'],
	},
}

// Глобальные переменные для токенов
let customerToken = null
let executorToken = null

export function setup() {
	const baseUrl = config.baseUrl

	// Получаем токены для тестирования
	const customerLogin = http.post(
		`${baseUrl}/api/auth/login`,
		JSON.stringify({
			email: config.testUsers.customer.email,
			password: config.testUsers.customer.password,
		}),
		{
			headers: { 'Content-Type': 'application/json' },
		}
	)

	const executorLogin = http.post(
		`${baseUrl}/api/auth/login`,
		JSON.stringify({
			email: config.testUsers.executor.email,
			password: config.testUsers.executor.password,
		}),
		{
			headers: { 'Content-Type': 'application/json' },
		}
	)

	return {
		customerToken:
			customerLogin.status === 200
				? JSON.parse(customerLogin.body).token
				: null,
		executorToken:
			executorLogin.status === 200
				? JSON.parse(executorLogin.body).token
				: null,
	}
}

export default function (data) {
	const baseUrl = config.baseUrl
	const customerToken = data.customerToken
	const executorToken = data.executorToken

	// Тест получения задач
	let tasksResponse = http.get(`${baseUrl}/api/tasks?page=1&limit=20`, {
		headers: getAuthHeaders(customerToken),
		tags: { name: 'getTasks' },
	})

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

	// Тест получения пользователей
	let usersResponse = http.get(`${baseUrl}/api/users?page=1&limit=20`, {
		headers: getAuthHeaders(customerToken),
		tags: { name: 'getUsers' },
	})

	check(usersResponse, {
		'users status is 200': r => r.status === 200,
		'users response time < 300ms': r => r.timings.duration < 300,
	})

	logResponse(usersResponse, 'Get Users')

	// Тест получения уведомлений
	let notificationsResponse = http.get(
		`${baseUrl}/api/notifications?page=1&limit=20`,
		{
			headers: getAuthHeaders(customerToken),
			tags: { name: 'getNotifications' },
		}
	)

	check(notificationsResponse, {
		'notifications status is 200': r => r.status === 200,
		'notifications response time < 200ms': r => r.timings.duration < 200,
	})

	logResponse(notificationsResponse, 'Get Notifications')

	// Тест получения категорий (кешированные данные)
	let categoriesResponse = http.get(`${baseUrl}/api/categories`, {
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

	// Тест создания задачи (только для заказчиков)
	if (customerToken && Math.random() < 0.1) {
		// 10% вероятность
		const taskPayload = JSON.stringify({
			title: `Load Test Task ${Date.now()}`,
			description: 'This is a load test task',
			price: Math.floor(Math.random() * 10000) + 1000,
			subcategoryId: null,
		})

		let createTaskResponse = http.post(`${baseUrl}/api/tasks`, taskPayload, {
			headers: getAuthHeaders(customerToken),
			tags: { name: 'createTask' },
		})

		check(createTaskResponse, {
			'create task status is 200': r => r.status === 200,
			'create task response time < 1000ms': r => r.timings.duration < 1000,
		})

		logResponse(createTaskResponse, 'Create Task')
	}

	// Тест отправки сообщения
	if (executorToken && Math.random() < 0.05) {
		// 5% вероятность
		const messagePayload = JSON.stringify({
			recipientId: 'test-recipient-id',
			content: 'Load test message',
		})

		let sendMessageResponse = http.post(
			`${baseUrl}/api/messages/send`,
			messagePayload,
			{
				headers: getAuthHeaders(executorToken),
				tags: { name: 'sendMessage' },
			}
		)

		check(sendMessageResponse, {
			'send message status is 200 or 400': r =>
				r.status === 200 || r.status === 400,
			'send message response time < 500ms': r => r.timings.duration < 500,
		})

		logResponse(sendMessageResponse, 'Send Message')
	}

	// Тест кешированных запросов
	if (Math.random() < 0.3) {
		// 30% вероятность
		let cachedResponse = http.get(`${baseUrl}/api/categories`, {
			tags: { name: 'cached' },
		})

		check(cachedResponse, {
			'cached response time < 50ms': r => r.timings.duration < 50,
		})
	}

	sleep(0.5)
}

export function handleSummary(data) {
	return {
		'api-load-test-results.json': JSON.stringify(data, null, 2),
		stdout: `
=== API Load Test Results ===
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.count}
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms

API Performance:
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

Cache Performance:
- Cached Requests: ${data.metrics[
			'http_req_duration{name:cached}'
		].values.avg.toFixed(2)}ms avg
    `,
	}
}

