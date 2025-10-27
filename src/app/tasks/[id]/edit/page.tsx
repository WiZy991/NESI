'use client'

import { useUser } from '@/context/UserContext'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function EditTaskPage() {
	const { id } = useParams() as { id: string }
	const { token, user } = useUser()
	const router = useRouter()

	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		const fetchTask = async () => {
			const res = await fetch(`/api/tasks/${id}`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			})

			if (!res.ok) {
				toast.error('Ошибка загрузки задачи')
				router.push('/tasks')
				return
			}

			const data = await res.json()

			if (
				!user ||
				data.task.customerId !== user.id ||
				data.task.status !== 'open'
			) {
				toast.error('Нет доступа к редактированию')
				router.push('/tasks')
				return
			}

			setTitle(data.task.title)
			setDescription(data.task.description)
			setLoading(false)
		}

		if (id && token) fetchTask()
	}, [id, token, user, router])

	const handleSave = async () => {
		if (!title.trim() || !description.trim()) {
			toast.error('Заполни все поля')
			return
		}

		setSaving(true)

		const res = await fetch(`/api/tasks/${id}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ title, description }),
		})

		if (!res.ok) {
			toast.error('Ошибка при сохранении')
			setSaving(false)
			return
		}

		toast.success('Задача обновлена!')
		router.push(`/tasks/${id}`)
	}

	if (loading) {
		return (
			<div className='relative flex justify-center items-center min-h-[80vh]'>
				<div className='text-center space-y-4'>
					<div className='w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto' />
					<p className='text-gray-400 animate-pulse'>Загрузка задачи...</p>
				</div>
			</div>
		)
	}

	return (
		<div className='relative flex justify-center items-center min-h-[80vh] overflow-hidden py-12'>
			{/* Фоновая подсветка */}
			<div className='absolute w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse-slow' />
			<div className='absolute w-[900px] h-[900px] bg-emerald-700/10 blur-[180px] rounded-full animate-pulse-slower' />

			<div className='relative w-full max-w-2xl mx-auto p-8 space-y-7 bg-gradient-to-br from-black/60 via-black/40 to-emerald-900/20 border border-emerald-500/20 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md transition-all duration-700 hover:shadow-[0_0_60px_rgba(16,185,129,0.35)]'>
				{/* Заголовок */}
				<div className='text-center mb-6'>
					<h1 className='text-3xl font-semibold text-emerald-400 flex justify-center items-center gap-3 mb-2'>
						<span className='text-4xl'>✏️</span>
						Редактировать задачу
					</h1>
					<p className='text-sm text-gray-400'>
						Внесите необходимые изменения в описание задачи
					</p>
				</div>

				{/* Поле названия */}
				<div className='space-y-2'>
					<label className='block text-sm font-medium text-emerald-300'>
						<span className='flex items-center gap-2'>
							<span>📝</span>
							Название задачи
						</span>
					</label>
					<input
						type='text'
						value={title}
						onChange={e => setTitle(e.target.value)}
						placeholder='Например: Разработать сайт для агентства'
						className='w-full p-4 rounded-xl bg-black/60 border border-emerald-700/50 text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 outline-none transition-all duration-300 shadow-inner focus:scale-[1.01]'
						disabled={saving}
					/>
					<p className='text-xs text-gray-500 ml-1'>
						{title.length} / 100 символов
					</p>
				</div>

				{/* Поле описания */}
				<div className='space-y-2'>
					<label className='block text-sm font-medium text-emerald-300'>
						<span className='flex items-center gap-2'>
							<span>📄</span>
							Описание
						</span>
					</label>
					<textarea
						value={description}
						onChange={e => setDescription(e.target.value)}
						placeholder='Опишите, что нужно изменить или дополнить...'
						rows={8}
						className='w-full p-4 rounded-xl bg-black/60 border border-emerald-700/50 text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 outline-none transition-all duration-300 shadow-inner resize-none focus:scale-[1.01]'
						disabled={saving}
					/>
					<p className='text-xs text-gray-500 ml-1'>
						{description.length} символов
					</p>
				</div>

				{/* Подсказка */}
				<div className='bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4'>
					<p className='text-sm text-emerald-300 flex items-start gap-2'>
						<span className='text-lg'>💡</span>
						<span>
							<strong>Совет:</strong> Четкое описание поможет исполнителю лучше
							понять задачу и выполнить её быстрее!
						</span>
					</p>
				</div>

				{/* Кнопки */}
				<div className='flex gap-4 pt-4'>
					<button
						onClick={handleSave}
						disabled={saving || !title.trim() || !description.trim()}
						className={`flex-1 px-6 py-4 rounded-xl font-semibold text-white transition-all duration-300 transform ${
							saving || !title.trim() || !description.trim()
								? 'bg-gray-600 cursor-not-allowed opacity-50'
								: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02]'
						}`}
					>
						{saving ? (
							<span className='flex items-center justify-center gap-2'>
								<span className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
								Сохраняем...
							</span>
						) : (
							<span className='flex items-center justify-center gap-2'>
								<span>💾</span>
								Сохранить изменения
							</span>
						)}
					</button>

					<button
						onClick={() => router.push(`/tasks/${id}`)}
						disabled={saving}
						className='px-6 py-4 rounded-xl font-semibold text-gray-300 bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 hover:border-gray-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]'
					>
						Отмена
					</button>
				</div>

				{/* Информация о статусе */}
				<div className='pt-4 border-t border-emerald-500/10'>
					<p className='text-xs text-gray-500 text-center'>
						Изменения будут видны сразу после сохранения. Редактировать можно
						только задачи со статусом "Открыта".
					</p>
				</div>
			</div>
		</div>
	)
}
