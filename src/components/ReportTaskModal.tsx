'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useEscapeKey } from '@/hooks/useEscapeKey'

type Props = {
	taskId: string
	taskTitle: string
	onClose: () => void
}

const REPORT_REASONS = [
	{ value: 'fraud', label: '🚫 Мошенничество' },
	{ value: 'spam', label: '📢 Спам' },
	{ value: 'inappropriate', label: '⚠️ Неприемлемый контент' },
	{ value: 'misleading', label: '❌ Вводящая в заблуждение информация' },
	{ value: 'duplicate', label: '📋 Дубликат задачи' },
	{ value: 'other', label: '🔹 Другое' },
]

export default function ReportTaskModal({ taskId, taskTitle, onClose }: Props) {
	const [reason, setReason] = useState('')
	const [description, setDescription] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Закрытие по Escape
	useEscapeKey(() => {
		if (!isSubmitting) {
			onClose()
		}
	})

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!reason) {
			toast.error('Выберите причину жалобы')
			return
		}

		setIsSubmitting(true)

		try {
			const res = await fetch(`/api/tasks/${taskId}/report`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason, description }),
			})

			const data = await res.json()

			if (res.ok) {
				toast.success('Жалоба отправлена. Администрация рассмотрит её в ближайшее время.')
				onClose()
			} else {
				toast.error(data.error || 'Ошибка отправки жалобы')
			}
		} catch (error) {
			console.error('Ошибка отправки жалобы:', error)
			toast.error('Ошибка отправки жалобы')
		} finally {
			setIsSubmitting(false)
		}
	}

	if (typeof window === 'undefined') return null

	const isMobileView = window.innerWidth < 640

	return createPortal(
		<div className={`fixed inset-0 z-[1000] flex ${isMobileView ? 'items-end' : 'items-center justify-center'} bg-black/70 backdrop-blur-sm p-4`}>
			<div className={`relative ${isMobileView ? 'w-full max-w-full h-[90vh] rounded-t-3xl' : 'max-w-lg rounded-2xl'} bg-gray-900 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)] w-full ${isMobileView ? 'max-h-[90vh]' : 'max-h-[90vh]'} overflow-y-auto mx-4`}
				style={{
					boxShadow: isMobileView 
						? '0 -10px 40px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(239, 68, 68, 0.1), 0 0 30px rgba(239, 68, 68, 0.3)'
						: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(239, 68, 68, 0.1), 0 0 30px rgba(239, 68, 68, 0.3)',
				}}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-800">
					<div className="flex items-center gap-3">
						<AlertTriangle className="w-6 h-6 text-red-500" />
						<h2 className="text-xl font-bold text-white">
							Пожаловаться на задачу
						</h2>
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-white transition p-1 hover:bg-gray-800 rounded-lg"
						disabled={isSubmitting}
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{/* Task Title */}
					<div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
						<p className="text-sm text-gray-400 mb-1">Задача:</p>
						<p className="text-white font-medium line-clamp-2">{taskTitle}</p>
					</div>

					{/* Reason Select */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Причина жалобы <span className="text-red-500">*</span>
						</label>
						<select
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition"
							required
						>
							<option value="">Выберите причину...</option>
							{REPORT_REASONS.map((r) => (
								<option key={r.value} value={r.value}>
									{r.label}
								</option>
							))}
						</select>
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Дополнительная информация
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Опишите подробнее проблему (необязательно)..."
							rows={4}
							className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition resize-none"
							maxLength={500}
						/>
						<p className="text-xs text-gray-500 mt-1">
							{description.length}/500 символов
						</p>
					</div>

					{/* Warning */}
					<div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
						<p className="text-sm text-red-400">
							<strong>⚠️ Важно:</strong> Ложные жалобы могут привести к
							блокировке вашего аккаунта.
						</p>
					</div>

					{/* Buttons */}
					<div className="flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition font-medium"
							disabled={isSubmitting}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={isSubmitting || !reason}
						>
							{isSubmitting ? 'Отправка...' : 'Отправить жалобу'}
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body
	)
}

