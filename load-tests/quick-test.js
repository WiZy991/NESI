import { check, sleep } from 'k6'
import http from 'k6/http'
import { config, getAuthHeaders, logResponse } from './config.js'

// Быстрый тест для проверки основных функций
export let options = {
	vus: 5, // 5 виртуальных пользователей
	duration: '2m', // 2 минуты
	thresholds: {
		http_req_duration: ['p(95)<1000'],
		http_req_failed: ['rate<0.05'],
	},
}

export default function () {
	const baseUrl = config.baseUrl

	// 1. Тест логина
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
		'login response time < 1000ms': r => r.timings.duration < 1000,
	})

	logResponse(loginResponse, 'Login')

	// 2. Тест получения задач (если логин успешен)
	if (loginResponse.status === 200) {
		const token = JSON.parse(loginResponse.body).token

		const tasksResponse = http.get(`${baseUrl}/api/tasks?page=1&limit=10`, {
			headers: getAuthHeaders(token),
			tags: { name: 'getTasks' },
		})

		check(tasksResponse, {
			'tasks status is 200': r => r.status === 200,
			'tasks response time < 500ms': r => r.timings.duration < 500,
		})

		logResponse(tasksResponse, 'Get Tasks')
	}

	// 3. Тест получения категорий (публичный endpoint)
	const categoriesResponse = http.get(`${baseUrl}/api/categories`, {
		tags: { name: 'getCategories' },
	})

	check(categoriesResponse, {
		'categories status is 200': r => r.status === 200,
		'categories response time < 200ms': r => r.timings.duration < 200,
	})

	logResponse(categoriesResponse, 'Get Categories')

	sleep(1)
}

export function handleSummary(data) {
	return {
		'quick-test-results.json': JSON.stringify(data, null, 2),
		stdout: `
=== Quick Test Results ===
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.count}
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms

Quick Check:
- Login: ${data.metrics['http_req_duration{name:login}'].values.avg.toFixed(
			2
		)}ms avg
- Get Tasks: ${data.metrics[
			'http_req_duration{name:getTasks}'
		].values.avg.toFixed(2)}ms avg
- Get Categories: ${data.metrics[
			'http_req_duration{name:getCategories}'
		].values.avg.toFixed(2)}ms avg

${
	data.metrics.http_req_failed.values.count === 0
		? '✅ All tests passed!'
		: '⚠️  Some tests failed - check logs'
}
    `,
	}
}



