'use client'

import { useUser } from '@/context/UserContext'
import { Edit, FileText, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

type Template = {
	id: string
	title: string
	content: string
	createdAt: string
	updatedAt: string
}

type MessageTemplatesModalProps = {
	isOpen: boolean
	onClose: () => void
	onSelectTemplate: (content: string) => void
}

export default function MessageTemplatesModal({
	isOpen,
	onClose,
	onSelectTemplate,
}: MessageTemplatesModalProps) {
	const { token } = useUser()
	const [templates, setTemplates] = useState<Template[]>([])
	const [loading, setLoading] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [showForm, setShowForm] = useState(false)
	const [formData, setFormData] = useState({ title: '', content: '' })

	useEffect(() => {
		if (isOpen && token) {
			fetchTemplates()
		}
	}, [isOpen, token])

	const fetchTemplates = async () => {
		if (!token) return

		setLoading(true)
		try {
			const res = await fetch('/api/message-templates', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (res.ok) {
				const data = await res.json()
				setTemplates(data.templates || [])
			}
		} catch (error) {
			console.error('Ошибка загрузки шаблонов:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleSave = async () => {
		if (!token || !formData.title.trim() || !formData.content.trim()) {
			toast.error('Заполните все поля')
			return
		}

		try {
			const url = editingId
				? `/api/message-templates/${editingId}`
				: '/api/message-templates'
			const method = editingId ? 'PUT' : 'POST'

			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(formData),
			})

			if (res.ok) {
				toast.success(editingId ? 'Шаблон обновлен' : 'Шаблон создан')
				setFormData({ title: '', content: '' })
				setShowForm(false)
				setEditingId(null)
				fetchTemplates()
			} else {
				const error = await res.json().catch(() => ({}))
				toast.error(error.error || 'Ошибка при сохранении')
			}
		} catch (error) {
			console.error('Ошибка при сохранении шаблона:', error)
			toast.error('Ошибка соединения с сервером')
		}
	}

	const handleDelete = async (id: string) => {
		if (!token || !confirm('Удалить этот шаблон?')) return

		try {
			const res = await fetch(`/api/message-templates/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (res.ok) {
				toast.success('Шаблон удален')
				fetchTemplates()
			} else {
				const error = await res.json().catch(() => ({}))
				toast.error(error.error || 'Ошибка при удалении')
			}
		} catch (error) {
			console.error('Ошибка при удалении шаблона:', error)
			toast.error('Ошибка соединения с сервером')
		}
	}

	const handleEdit = (template: Template) => {
		setFormData({ title: template.title, content: template.content })
		setEditingId(template.id)
		setShowForm(true)
	}

	const handleSelect = (template: Template) => {
		onSelectTemplate(template.content)
		onClose()
	}

	if (!isOpen) return null

	const modalContent = (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4'
			onClick={onClose}
		>
			<div
				className='bg-gray-900/95 backdrop-blur-md border border-emerald-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col'
				onClick={e => e.stopPropagation()}
			>
				{/* Header */}
				<div className='flex items-center justify-between p-6 border-b border-emerald-500/20'>
					<h2 className='text-2xl font-bold text-emerald-400 flex items-center gap-2'>
						<FileText className='w-6 h-6' />
						Шаблоны сообщений
					</h2>
					<div className='flex items-center gap-2'>
						<button
							onClick={() => {
								setShowForm(true)
								setEditingId(null)
								setFormData({ title: '', content: '' })
							}}
							className='p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors'
							title='Создать шаблон'
						>
							<Plus className='w-5 h-5' />
						</button>
						<button
							onClick={onClose}
							className='p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors'
						>
							<X className='w-5 h-5' />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className='flex-1 overflow-y-auto custom-scrollbar p-6'>
					{showForm ? (
						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium text-emerald-400 mb-2'>
									Название шаблона
								</label>
								<input
									type='text'
									value={formData.title}
									onChange={e =>
										setFormData({ ...formData, title: e.target.value })
									}
									placeholder='Например: Приветствие'
									className='w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-emerald-400 mb-2'>
									Текст шаблона
								</label>
								<textarea
									value={formData.content}
									onChange={e =>
										setFormData({ ...formData, content: e.target.value })
									}
									placeholder='Введите текст шаблона...'
									rows={6}
									className='w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none'
								/>
							</div>
							<div className='flex gap-3'>
								<button
									onClick={handleSave}
									className='flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-semibold'
								>
									{editingId ? 'Сохранить' : 'Создать'}
								</button>
								<button
									onClick={() => {
										setShowForm(false)
										setEditingId(null)
										setFormData({ title: '', content: '' })
									}}
									className='px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors'
								>
									Отмена
								</button>
							</div>
						</div>
					) : loading ? (
						<div className='text-center py-8 text-gray-400'>Загрузка...</div>
					) : templates.length === 0 ? (
						<div className='text-center py-8 text-gray-400'>
							<FileText className='w-12 h-12 mx-auto mb-4 text-gray-600' />
							<p>Нет сохраненных шаблонов</p>
							<p className='text-sm mt-2'>
								Создайте первый шаблон для быстрой отправки сообщений
							</p>
						</div>
					) : (
						<div className='space-y-3'>
							{templates.map(template => (
								<div
									key={template.id}
									className='p-4 bg-black/40 border border-emerald-500/20 rounded-lg hover:border-emerald-500/40 transition-all group cursor-pointer'
									onClick={() => handleSelect(template)}
								>
									<div className='flex items-start justify-between gap-4'>
										<div className='flex-1'>
											<h3 className='text-lg font-semibold text-emerald-300 mb-2 group-hover:text-emerald-200 transition-colors'>
												{template.title}
											</h3>
											<p className='text-gray-300 text-sm whitespace-pre-wrap line-clamp-3'>
												{template.content}
											</p>
										</div>
										<div
											className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'
											onClick={e => e.stopPropagation()}
										>
											<button
												onClick={() => handleEdit(template)}
												className='p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors'
												title='Редактировать'
											>
												<Edit className='w-4 h-4' />
											</button>
											<button
												onClick={() => handleDelete(template.id)}
												className='p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors'
												title='Удалить'
											>
												<Trash2 className='w-4 h-4' />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)

	if (typeof document === 'undefined') {
		return modalContent
	}

	const portalTarget = document.getElementById('modal-root') || document.body

	return createPortal(modalContent, portalTarget)
}
