// context/UserContext.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type User = {
	id: string
	email: string
	role: 'admin' | 'executor' | 'customer'
	fullName?: string
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
					// Если 401/403 - возможно заблокирован
					if (res.status === 401 || res.status === 403) {
						const errorData = await res.json().catch(() => ({}))
						if (errorData.blocked) {
							alert(`🚫 Ваш аккаунт заблокирован.\n\n${errorData.reason || 'Обратитесь к администратору.'}`)
						}
					}
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
		
		// Периодическая проверка блокировки каждые 60 секунд
		const checkInterval = setInterval(() => {
			if (storedToken) {
				fetch('/api/me', {
					headers: { Authorization: `Bearer ${storedToken}` },
				})
				.then(res => {
					if (!res.ok) {
						// Пользователь заблокирован или токен невалиден
						localStorage.removeItem('token')
						setUser(null)
						setToken(null)
						alert('🚫 Ваш аккаунт был заблокирован. Вы будете перенаправлены на страницу входа.')
						window.location.href = '/login'
					}
				})
				.catch(() => {})
			}
		}, 60000) // Каждую минуту

		return () => clearInterval(checkInterval)
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

	const logout = () => {
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
			}}
		>
			{children}
		</UserContext.Provider>
	)
}

export const useUser = () => useContext(UserContext)
