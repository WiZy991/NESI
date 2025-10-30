// src/app/test-notifications/page.tsx
// Страница для тестирования уведомлений на production
'use client'

import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function TestNotificationsPage() {
	const { user, token } = useUser()
	const router = useRouter()
	const [logs, setLogs] = useState<string[]>([])
	const [testResult, setTestResult] = useState<any>(null)

	const addLog = (message: string) => {
		setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
		console.log(message)
	}

	useEffect(() => {
		if (!user) {
			router.push('/login')
		}
	}, [user, router])

	const testPollingAPI = async () => {
		setLogs([])
		addLog('🧪 Начинаем тест polling API...')

		if (!token) {
			addLog('❌ Токен отсутствует')
			return
		}

		addLog(`✅ Токен: ${token.substring(0, 20)}...`)
		addLog(`✅ User ID: ${user?.id}`)

		try {
			const since = new Date(Date.now() - 60000).toISOString() // последняя минута
			const url = `/api/notifications/poll?since=${since}`
			addLog(`📡 Запрос: ${url}`)

			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			addLog(`📊 Статус ответа: ${response.status}`)

			if (!response.ok) {
				const errorText = await response.text()
				addLog(`❌ Ошибка: ${errorText}`)
				setTestResult({ error: errorText, status: response.status })
				return
			}

			const data = await response.json()
			addLog(`✅ Ответ получен: ${JSON.stringify(data, null, 2)}`)
			setTestResult(data)

			if (data.notifications && data.notifications.length > 0) {
				addLog(`🎉 Найдено уведомлений: ${data.notifications.length}`)
			} else {
				addLog(`📭 Новых уведомлений нет`)
			}
		} catch (error: any) {
			addLog(`❌ Исключение: ${error.message}`)
			setTestResult({ error: error.message })
		}
	}

	const testCreateNotification = async () => {
		setLogs([])
		addLog('🧪 Создаем тестовое уведомление...')

		try {
			const response = await fetch('/api/notifications/test-create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			addLog(`✅ Создано: ${JSON.stringify(data, null, 2)}`)
			setTestResult(data)

			// Теперь проверяем polling
			addLog('⏳ Ждём 2 секунды и проверяем polling...')
			setTimeout(() => {
				testPollingAPI()
			}, 2000)
		} catch (error: any) {
			addLog(`❌ Ошибка: ${error.message}`)
			setTestResult({ error: error.message })
		}
	}

	if (!user) return null

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-900 via-black to-emerald-900 p-4 md:p-8'>
			<div className='max-w-4xl mx-auto'>
				<h1 className='text-3xl font-bold text-emerald-400 mb-6'>
					🧪 Тест уведомлений
				</h1>

				<div className='bg-gray-800 rounded-lg p-6 mb-6'>
					<h2 className='text-xl font-semibold text-emerald-300 mb-4'>
						Информация
					</h2>
					<div className='space-y-2 text-sm font-mono'>
						<div>
							<span className='text-gray-400'>User ID:</span>{' '}
							<span className='text-white'>{user.id}</span>
						</div>
						<div>
							<span className='text-gray-400'>Email:</span>{' '}
							<span className='text-white'>{user.email}</span>
						</div>
						<div>
							<span className='text-gray-400'>Token:</span>{' '}
							<span className='text-white'>{token?.substring(0, 30)}...</span>
						</div>
						<div>
							<span className='text-gray-400'>Environment:</span>{' '}
							<span className='text-white'>
								{process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
							</span>
						</div>
					</div>
				</div>

				<div className='bg-gray-800 rounded-lg p-6 mb-6'>
					<h2 className='text-xl font-semibold text-emerald-300 mb-4'>
						Тесты
					</h2>
					<div className='flex flex-wrap gap-4'>
						<button
							onClick={testPollingAPI}
							className='px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition'
						>
							Тест Polling API
						</button>
						<button
							onClick={testCreateNotification}
							className='px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition'
						>
							Создать тестовое уведомление
						</button>
					</div>
				</div>

				{logs.length > 0 && (
					<div className='bg-gray-800 rounded-lg p-6 mb-6'>
						<h2 className='text-xl font-semibold text-emerald-300 mb-4'>
							Логи
						</h2>
						<div className='bg-black rounded p-4 max-h-96 overflow-y-auto font-mono text-sm space-y-1'>
							{logs.map((log, i) => (
								<div key={i} className='text-gray-300'>
									{log}
								</div>
							))}
						</div>
					</div>
				)}

				{testResult && (
					<div className='bg-gray-800 rounded-lg p-6'>
						<h2 className='text-xl font-semibold text-emerald-300 mb-4'>
							Результат
						</h2>
						<pre className='bg-black rounded p-4 overflow-x-auto text-sm text-gray-300'>
							{JSON.stringify(testResult, null, 2)}
						</pre>
					</div>
				)}
			</div>
		</div>
	)
}

