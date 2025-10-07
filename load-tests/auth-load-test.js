import { check, sleep } from 'k6'
import http from 'k6/http'
import {
	checkRateLimit,
	config,
	getAuthHeaders,
	logResponse,
} from './config.js'

export let options = {
	stages: config.load.normal.stages,
	thresholds: {
		'http_req_duration{name:login}': ['p(95)<1000'],
		'http_req_duration{name:register}': ['p(95)<2000'],
		http_req_failed: ['rate<0.01'],
	},
}

export default function () {
	const baseUrl = config.baseUrl
	const testUser = config.testUsers.customer

	// Тест регистрации
	const registerPayload = JSON.stringify({
		email: `test_${Date.now()}_${Math.random()}@example.com`,
		password: 'password123',
		fullName: 'Test User',
	})

	let registerResponse = http.post(
		`${baseUrl}/api/auth/register`,
		registerPayload,
		{
			headers: { 'Content-Type': 'application/json' },
		}
	)

	check(registerResponse, {
		'register status is 200 or 409': r => r.status === 200 || r.status === 409,
		'register response time < 2000ms': r => r.timings.duration < 2000,
	})

	logResponse(registerResponse, 'Register')

	// Тест логина
	const loginPayload = JSON.stringify({
		email: testUser.email,
		password: testUser.password,
	})

	let loginResponse = http.post(`${baseUrl}/api/auth/login`, loginPayload, {
		headers: { 'Content-Type': 'application/json' },
		tags: { name: 'login' },
	})

	check(loginResponse, {
		'login status is 200': r => r.status === 200,
		'login response time < 1000ms': r => r.timings.duration < 1000,
		'login returns token': r => {
			try {
				const body = JSON.parse(r.body)
				return !!body.token
			} catch {
				return false
			}
		},
		'login returns user data': r => {
			try {
				const body = JSON.parse(r.body)
				return !!body.user && !!body.user.id
			} catch {
				return false
			}
		},
	})

	logResponse(loginResponse, 'Login')

	// Проверяем rate limiting при множественных попытках логина
	if (Math.random() < 0.1) {
		// 10% вероятность
		for (let i = 0; i < 6; i++) {
			let rateLimitResponse = http.post(
				`${baseUrl}/api/auth/login`,
				JSON.stringify({
					email: 'wrong@email.com',
					password: 'wrongpassword',
				}),
				{
					headers: { 'Content-Type': 'application/json' },
					tags: { name: 'rateLimited' },
				}
			)

			if (checkRateLimit(rateLimitResponse)) {
				break
			}
			sleep(0.1)
		}
	}

	// Тест получения профиля
	if (loginResponse.status === 200) {
		const token = JSON.parse(loginResponse.body).token

		let profileResponse = http.get(`${baseUrl}/api/me`, {
			headers: getAuthHeaders(token),
			tags: { name: 'getProfile' },
		})

		check(profileResponse, {
			'profile status is 200': r => r.status === 200,
			'profile response time < 500ms': r => r.timings.duration < 500,
		})

		logResponse(profileResponse, 'Profile')
	}

	sleep(1)
}

export function handleSummary(data) {
	return {
		'auth-load-test-results.json': JSON.stringify(data, null, 2),
		stdout: `
=== Auth Load Test Results ===
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.count}
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
Max Response Time: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Login Performance:
- Average: ${data.metrics['http_req_duration{name:login}'].values.avg.toFixed(
			2
		)}ms
- 95th Percentile: ${data.metrics['http_req_duration{name:login}'].values[
			'p(95)'
		].toFixed(2)}ms

Rate Limiting:
- Rate Limited Requests: ${
			data.metrics['http_req_duration{name:rateLimited}'].values.count
		}
    `,
	}
}
