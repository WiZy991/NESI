// context/UserContext.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type User = {
	id: string
	email: string
	role: 'admin' | 'executor' | 'customer'
	fullName?: string
	avatarUrl?: string | null
	accountType?: string | null
	companyVerification?: {
		innVerified: boolean
		corporateEmailVerified: boolean
		canUseGroupFeatures: boolean
	} | null
}

type UserContextType = {
	user: User | null
	token: string | null
	loading: boolean
	unreadCount: number
	setUser: (user: User | null) => void
	setUnreadCount: (count: number | ((prev: number) => number)) => void
	login: (user: User, token: string) => void
	logout: () => void
	refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
	user: null,
	token: null,
	loading: true,
	unreadCount: 0,
	setUser: () => {},
	setUnreadCount: () => {},
	login: () => {},
	logout: () => {},
	refreshUser: async () => {},
})

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<User | null>(null)
	const [token, setToken] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [unreadCount, setUnreadCountState] = useState(0)

	const setUnreadCount = (count: number | ((prev: number) => number)) => {
		if (typeof count === 'function') {
			setUnreadCountState(count)
		} else {
			setUnreadCountState(count)
		}
	}

	useEffect(() => {
		const storedToken = localStorage.getItem('token')
		if (!storedToken) {
			setLoading(false)
			return
		}

		const fetchUser = async () => {
			try {
				const res = await fetch('/api/me', {
					headers: {
						Authorization: `Bearer ${storedToken}`,
					},
				})
				if (!res.ok) {
					// Проверяем только статус 403 с явным флагом blocked
					if (res.status === 403) {
						const errorData = await res.json().catch(() => ({}))
						if (errorData.blocked) {
							// Только при реальной блокировке показываем сообщение
							const message = errorData.reason 
								? `🚫 Ваш аккаунт заблокирован.\n\nПричина: ${errorData.reason}${errorData.until ? `\n\nЗаблокирован до: ${new Date(errorData.until).toLocaleString('ru-RU')}` : '\n\nБлокировка постоянная.'}`
								: '🚫 Ваш аккаунт заблокирован.\n\nОбратитесь к администратору.'
							alert(message)
							localStorage.removeItem('token')
							setUser(null)
							setToken(null)
							setLoading(false)
							return
						}
					}
					// Для других ошибок (401, сетевые и т.д.) просто выходим без alert
					throw new Error()
				}
				const data = await res.json()
				setUser(data.user)
				setToken(storedToken)
			} catch {
				localStorage.removeItem('token')
				setUser(null)
				setToken(null)
			} finally {
				setLoading(false)
			}
		}

		fetchUser()
		
		// УБРАНО: Периодическая проверка блокировки была слишком агрессивной
		// Блокировка проверяется только при первоначальной загрузке и при явных действиях
		// Нет необходимости постоянно проверять статус пользователя
		
		return () => {
			// Cleanup
		}
	}, [])

	useEffect(() => {
		const fetchUnread = async () => {
			if (!token) return
			try {
				const res = await fetch('/api/notifications/unread-count', {
					headers: { Authorization: `Bearer ${token}` },
				})
				const data = await res.json()
				setUnreadCountState(data.count || 0)
			} catch (err) {
				console.error('Ошибка получения количества уведомлений', err)
			}
		}

		fetchUnread()
	}, [token])

	const login = (user: User, token: string) => {
		setUser(user)
		setToken(token)
		localStorage.setItem('token', token)
	}

	const refreshUser = async () => {
		const currentToken = token || localStorage.getItem('token')
		if (!currentToken) return

		try {
			const res = await fetch('/api/me', {
				headers: {
					Authorization: `Bearer ${currentToken}`,
				},
			})
			if (res.ok) {
				const data = await res.json()
				setUser(data.user)
			}
		} catch (err) {
			console.error('Ошибка обновления данных пользователя:', err)
		}
	}

	const logout = async () => {
		const currentToken = token || localStorage.getItem('token')
		
		// Вызываем API для обновления lastActivityAt перед выходом
		if (currentToken) {
			try {
				await fetch('/api/logout', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${currentToken}`,
					},
				}).catch(err => {
					// Игнорируем ошибки сети при выходе
					console.error('Ошибка при вызове API logout:', err)
				})
			} catch (err) {
				// Игнорируем ошибки при выходе
				console.error('Ошибка при выходе:', err)
			}
		}
		
		setUser(null)
		setToken(null)
		setUnreadCount(0)
		localStorage.removeItem('token')
	}

	return (
		<UserContext.Provider
			value={{
				user,
				token,
				loading,
				unreadCount,
				setUser,
				setUnreadCount,
				login,
				logout,
				refreshUser,
			}}
		>
			{children}
		</UserContext.Provider>
	)
}

export const useUser = () => useContext(UserContext)
