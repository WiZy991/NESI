'use client'

import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
	FaAward,
	FaCalendarAlt,
	FaCertificate,
	FaChartLine,
	FaDatabase,
	FaGlobe,
	FaJs,
	FaPython,
	FaStar,
	FaTasks,
	FaToolbox,
	FaTrophy,
	FaUserCircle,
} from 'react-icons/fa'

type Review = {
	id: string
	rating: number
	comment: string
	createdAt: string
	task: { title: string }
	fromUser: { fullName?: string; email: string }
}

type FullUser = {
	id: string
	fullName?: string
	email: string
	role: string
	description?: string
	location?: string
	skills?: string[]
	avatarUrl?: string
	balance?: number
	xp?: number
	completedTasksCount?: number
	avgRating?: number
	level?: {
		id: string
		name: string
		description: string
		slug: string
	}
	badges?: Array<{
		id: string
		earnedAt: string
		badge: {
			id: string
			name: string
			description: string
			icon: string
		}
	}>
	certifications?: Array<{
		id: string
		level: string
		grantedAt: string
		subcategory: {
			id: string
			name: string
		}
	}>
	executedTasks?: Array<{
		id: string
		title: string
		description: string
		price?: number
		completedAt?: string
		customer: {
			id: string
			fullName?: string
			email: string
		}
		review?: {
			id: string
			rating: number
			comment: string
		}
	}>
	_count?: {
		executedTasks: number
		reviewsReceived: number
		responses: number
	}
}

const getSkillIcon = (skill: string) => {
	const lower = skill.toLowerCase()
	if (lower.includes('python'))
		return <FaPython className='mr-1 text-emerald-400' />
	if (lower.includes('js') || lower.includes('javascript'))
		return <FaJs className='mr-1 text-yellow-400' />
	if (lower.includes('sql') || lower.includes('db'))
		return <FaDatabase className='mr-1 text-blue-400' />
	if (lower.includes('dns') || lower.includes('network'))
		return <FaGlobe className='mr-1 text-indigo-400' />
	return <FaToolbox className='mr-1 text-gray-400' />
}

export default function ProfilePageContent() {
	const { user, token, loading, login } = useUser()
	const [reviews, setReviews] = useState<Review[]>([])
	const [customerReviews, setCustomerReviews] = useState<Review[]>([]) // 🔥 для заказчиков
	const [profile, setProfile] = useState<FullUser | null>(null)
	const [loadingProfile, setLoadingProfile] = useState(true)
	const [transactions, setTransactions] = useState<any[]>([])
	const [amount, setAmount] = useState(100)

	useEffect(() => {
		if (!token) return

		const fetchProfile = async () => {
			try {
				const res = await fetch('/api/profile', {
					headers: { Authorization: `Bearer ${token}` },
				})
				if (!res.ok) throw new Error('Ошибка загрузки профиля')
				const data = await res.json()
				setProfile(data.user)
				login(data.user, token)

				const txRes = await fetch('/api/wallet/transactions', {
					headers: { Authorization: `Bearer ${token}` },
				})
				const txData = await txRes.json()
				setTransactions(txData.transactions || [])
			} catch (err) {
				console.error('Ошибка загрузки профиля:', err)
			} finally {
				setLoadingProfile(false)
			}
		}

		fetchProfile()
	}, [token])

	// 🧩 Отзывы для исполнителя
	useEffect(() => {
		const fetchReviews = async () => {
			if (!user || user.role !== 'executor') return
			try {
				const res = await fetch('/api/reviews/me', {
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				})
				const data = await res.json()
				setReviews(data.reviews || [])
			} catch (err) {
				console.error('Ошибка загрузки отзывов исполнителя:', err)
			}
		}
		fetchReviews()
	}, [user, token])

	// 🧩 Отзывы для заказчика
	useEffect(() => {
		const fetchCustomerReviews = async () => {
			if (!user || user.role !== 'customer') return
			try {
				const res = await fetch('/api/reviews/me', {
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				})
				const data = await res.json()
				setCustomerReviews(data.reviews || [])
			} catch (err) {
				console.error('Ошибка загрузки отзывов заказчика:', err)
			}
		}
		fetchCustomerReviews()
	}, [user, token])

	const handleDeposit = async () => {
		await fetch('/api/wallet/deposit', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ amount }),
		})
		location.reload()
	}

	const handleWithdraw = async () => {
		await fetch('/api/wallet/withdraw', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ amount }),
		})
		location.reload()
	}

	if (loading || !user || loadingProfile || !profile) {
		return <div className='p-6 text-gray-400'>Загрузка профиля...</div>
	}

	const avatarSrc = profile.avatarUrl
		? profile.avatarUrl.startsWith('http')
			? profile.avatarUrl
			: `${typeof window !== 'undefined' ? window.location.origin : ''}${profile.avatarUrl}`
		: null

	return (
		<div className='p-6 max-w-6xl mx-auto space-y-8'>
			{/* Всё, что у тебя уже было — без изменений */}

			{/* 🔥 Блок отзывов исполнителя (оставляем как есть) */}
			{user.role === 'executor' && reviews.length > 0 && (
				<div className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'>
					<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
						<FaStar />
						Отзывы заказчиков
					</h3>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{reviews.map(review => (
							<div
								key={review.id}
								className='bg-black/60 border border-emerald-500/30 p-4 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.2)]'
							>
								<div className='flex justify-between items-center mb-3'>
									<h4 className='font-semibold text-white'>{review.task.title}</h4>
									<div className='flex items-center gap-1'>
										{[...Array(5)].map((_, i) => (
											<FaStar
												key={i}
												className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-600'}`}
											/>
										))}
									</div>
								</div>
								<p className='text-gray-300 mb-3 italic'>"{review.comment}"</p>
								<div className='flex justify-between items-center text-sm text-gray-400'>
									<span>От: {review.fromUser?.fullName || review.fromUser?.email}</span>
									<span>{new Date(review.createdAt).toLocaleDateString()}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* 🔥 Новый блок отзывов заказчика */}
			{user.role === 'customer' && customerReviews.length > 0 && (
				<div className='bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'>
					<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
						<FaStar />
						Отзывы исполнителей
					</h3>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{customerReviews.map(review => (
							<div
								key={review.id}
								className='bg-black/60 border border-emerald-500/30 p-4 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.2)]'
							>
								<div className='flex justify-between items-center mb-3'>
									<h4 className='font-semibold text-white'>{review.task.title}</h4>
									<div className='flex items-center gap-1'>
										{[...Array(5)].map((_, i) => (
											<FaStar
												key={i}
												className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-600'}`}
											/>
										))}
									</div>
								</div>
								<p className='text-gray-300 mb-3 italic'>"{review.comment}"</p>
								<div className='flex justify-between items-center text-sm text-gray-400'>
									<span>От: {review.fromUser?.fullName || review.fromUser?.email}</span>
									<span>{new Date(review.createdAt).toLocaleDateString()}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
