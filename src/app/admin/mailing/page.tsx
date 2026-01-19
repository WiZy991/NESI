'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { Mail, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'

export default function MailingPage() {
	const { user, token } = useUser()
	const router = useRouter()
	const [role, setRole] = useState<'executor' | 'customer'>('executor')
	const [subject, setSubject] = useState('')
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const [userCount, setUserCount] = useState<number | null>(null)

	const fetchUserCount = async (selectedRole: 'executor' | 'customer') => {
		try {
			const res = await fetch(`/api/admin/mailing/count?role=${selectedRole}`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				const data = await res.json()
				setUserCount(data.count)
			}
		} catch (error) {
			console.error('Ошибка при получении количества пользователей:', error)
		}
	}

	useEffect(() => {
		if (!user || user.role !== 'admin') {
			router.push('/login')
			return
		}
		if (token) {
			fetchUserCount(role)
		}
	}, [user, router, role, token])

	const handleRoleChange = (newRole: 'executor' | 'customer') => {
		setRole(newRole)
		fetchUserCount(newRole)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!subject.trim() || !message.trim()) {
			toast.error('Заполните все поля')
			return
		}

		setLoading(true)

		try {
			const res = await fetch('/api/admin/mailing', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					role,
					subject: subject.trim(),
					message: message.trim(),
				}),
			})

			const data = await res.json()

			if (res.ok) {
				toast.success(`Рассылка успешно отправлена ${data.sentCount} пользователям`)
				setSubject('')
				setMessage('')
			} else {
				toast.error(data.error || 'Ошибка при отправке рассылки')
			}
		} catch (error) {
			console.error('Ошибка при отправке рассылки:', error)
			toast.error('Не удалось отправить рассылку')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8'>
			<div className='mb-6 sm:mb-8'>
				<h1 className='text-2xl sm:text-3xl font-bold text-emerald-400 mb-2 flex items-center gap-2 sm:gap-3'>
					<Mail className='w-6 h-6 sm:w-8 sm:h-8' />
					Рассылки
				</h1>
				<p className='text-sm sm:text-base text-gray-400'>
					Отправка сообщений пользователям по ролям от имени NESI
				</p>
			</div>

			<Card className='bg-black/60 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'>
				<CardContent className='p-6'>
					<form onSubmit={handleSubmit} className='space-y-6'>
						{/* Выбор роли */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-3'>
								Выберите роль получателей
							</label>
							<div className='flex gap-4'>
								<button
									type='button'
									onClick={() => handleRoleChange('executor')}
									className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
										role === 'executor'
											? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
											: 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
									}`}
								>
									<div className='font-semibold'>Исполнитель</div>
									<div className='text-xs mt-1'>
										{userCount !== null && role === 'executor'
											? `${userCount} пользователей`
											: 'Выберите для просмотра'}
									</div>
								</button>
								<button
									type='button'
									onClick={() => handleRoleChange('customer')}
									className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
										role === 'customer'
											? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
											: 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
									}`}
								>
									<div className='font-semibold'>Заказчик</div>
									<div className='text-xs mt-1'>
										{userCount !== null && role === 'customer'
											? `${userCount} пользователей`
											: 'Выберите для просмотра'}
									</div>
								</button>
							</div>
						</div>

						{/* Тема письма */}
						<div>
							<label
								htmlFor='subject'
								className='block text-sm font-medium text-gray-300 mb-2'
							>
								Тема письма
							</label>
							<input
								id='subject'
								type='text'
								value={subject}
								onChange={(e) => setSubject(e.target.value)}
								placeholder='Введите тему письма'
								className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
								required
							/>
						</div>

						{/* Текст сообщения */}
						<div>
							<label
								htmlFor='message'
								className='block text-sm font-medium text-gray-300 mb-2'
							>
								Текст сообщения
							</label>
							<textarea
								id='message'
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder='Введите текст сообщения...'
								rows={10}
								className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 resize-y'
								required
							/>
							<p className='mt-2 text-xs text-gray-500'>
								Письмо будет отправлено от имени{' '}
								<span className='text-emerald-400'>info.nesi@bk.ru</span>
							</p>
						</div>

						{/* Кнопка отправки */}
						<button
							type='submit'
							disabled={loading || !subject.trim() || !message.trim()}
							className='w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
						>
							{loading ? (
								<>
									<Loader2 className='w-5 h-5 animate-spin' />
									Отправка...
								</>
							) : (
								<>
									<Send className='w-5 h-5' />
									Отправить рассылку
								</>
							)}
						</button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}

