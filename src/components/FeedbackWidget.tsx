'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, X } from 'lucide-react'
import { toast } from 'sonner'
import { useEscapeKey } from '@/hooks/useEscapeKey'

export default function FeedbackWidget() {
	const [isOpen, setIsOpen] = useState(false)
	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		message: '',
		type: 'general',
	})
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Отслеживаем открытие модального окна редактирования профиля
	useEffect(() => {
		const checkModal = () => {
			setIsProfileModalOpen(!!document.querySelector('[data-profile-modal]'))
		}
		
		checkModal()
		const interval = setInterval(checkModal, 100)
		
		return () => clearInterval(interval)
	}, [])

	// Закрытие по Escape
	useEscapeKey(() => {
		if (!isSubmitting && isOpen) {
			setIsOpen(false)
		}
	})

	// Блокировка прокрутки фона при открытом модальном окне
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [isOpen])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)

		try {
			const response = await fetch('/api/feedback', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			})

			if (!response.ok) {
				throw new Error('Ошибка при отправке отзыва')
			}

			toast.success('Спасибо за ваш отзыв! Мы обязательно учтём его.')
			setFormData({ name: '', email: '', message: '', type: 'general' })
			setIsOpen(false)
		} catch (error) {
			toast.error('Не удалось отправить отзыв. Попробуйте позже.')
			console.error('Ошибка:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<>
			{/* Плавающая кнопка */}
			{!isProfileModalOpen && (
				<div className='fixed bottom-6 left-6 z-50 flex flex-col items-center gap-2 group'>
					<button
						onClick={() => setIsOpen(true)}
						className='w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] transition-all duration-300 hover:scale-110'
						aria-label='Отправить обратную связь'
					>
						<MessageSquare className='w-6 h-6' />
					</button>
					<span className='text-xs text-emerald-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap bg-black/60 px-2 py-1 rounded backdrop-blur-sm'>
						Обратная связь
					</span>
				</div>
			)}

			{/* Модальное окно */}
			{isOpen && typeof window !== 'undefined' && createPortal(
				<div 
					className={`fixed inset-0 z-50 flex ${typeof window !== 'undefined' && window.innerWidth < 640 ? 'items-end' : 'items-center justify-center'} bg-black/70 backdrop-blur-sm`} 
					data-nextjs-scroll-focus-boundary={false}
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setIsOpen(false)
						}
					}}
				>
					<div className={`relative ${typeof window !== 'undefined' && window.innerWidth < 640 ? 'w-full max-w-full h-[90vh] rounded-t-3xl' : 'max-w-md rounded-2xl'} bg-gray-900 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)] w-full mx-4 p-6 md:p-8 animate-fadeIn max-h-[90vh] overflow-y-auto`}
						style={{
							boxShadow: typeof window !== 'undefined' && window.innerWidth < 640
								? '0 -10px 40px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(16, 185, 129, 0.1), 0 0 40px rgba(16, 185, 129, 0.3)'
								: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(16, 185, 129, 0.1), 0 0 40px rgba(16, 185, 129, 0.3)',
						}}
					>
						{/* Кнопка закрытия */}
						<button
							onClick={() => setIsOpen(false)}
							className='absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors'
							aria-label='Закрыть'
						>
							<X className='w-5 h-5' />
						</button>

						{/* Заголовок */}
						<div className='mb-6'>
							<h2 className='text-2xl font-bold text-emerald-400 mb-2'>
								Обратная связь
							</h2>
							<p className='text-gray-400 text-sm'>
								Помогите нам стать лучше. Ваше мнение очень важно!
							</p>
						</div>

						{/* Форма */}
						<form onSubmit={handleSubmit} className='space-y-4'>
							{/* Тип отзыва */}
							<div>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									Тип обратной связи
								</label>
								<select
									value={formData.type}
									onChange={(e) =>
										setFormData({ ...formData, type: e.target.value })
									}
									className='w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition'
									required
								>
									<option value='general'>Общее</option>
									<option value='bug'>Сообщить об ошибке</option>
									<option value='feature'>Предложение</option>
									<option value='complaint'>Жалоба</option>
									<option value='praise'>Благодарность</option>
								</select>
							</div>

							{/* Имя */}
							<div>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									Ваше имя
								</label>
								<input
									type='text'
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className='w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition'
									placeholder='Как к вам обращаться?'
									required
								/>
							</div>

							{/* Email */}
							<div>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									Email (опционально)
								</label>
								<input
									type='email'
									value={formData.email}
									onChange={(e) =>
										setFormData({ ...formData, email: e.target.value })
									}
									className='w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition'
									placeholder='your@email.com'
								/>
							</div>

							{/* Сообщение */}
							<div>
								<label className='block text-sm font-medium text-gray-300 mb-2'>
									Сообщение
								</label>
								<textarea
									value={formData.message}
									onChange={(e) =>
										setFormData({ ...formData, message: e.target.value })
									}
									rows={5}
									className='w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition resize-none'
									placeholder='Расскажите, что вы думаете о платформе...'
									required
								/>
							</div>

							{/* Кнопки */}
							<div className='flex gap-3 pt-2'>
								<button
									type='button'
									onClick={() => setIsOpen(false)}
									className='flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700 transition-colors'
									disabled={isSubmitting}
								>
									Отмена
								</button>
								<button
									type='submit'
									className='flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed'
									disabled={isSubmitting}
								>
									{isSubmitting ? 'Отправка...' : 'Отправить'}
								</button>
							</div>
						</form>
					</div>
				</div>,
				document.body
			)}
		</>
	)
}

