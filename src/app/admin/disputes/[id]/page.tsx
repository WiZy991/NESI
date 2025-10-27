import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

interface Props {
	params: { id: string }
}

export default async function DisputeDetailsPage({ params }: Props) {
	const dispute = await (prisma as any).dispute.findUnique({
		where: { id: params.id },
		include: {
			Task: {
				select: {
					id: true,
					title: true,
					status: true,
					customer: { select: { id: true, fullName: true, email: true } },
					executor: { select: { id: true, fullName: true, email: true } },
					messages: {
						orderBy: { createdAt: 'asc' },
						include: {
							sender: {
								select: { id: true, fullName: true, email: true, role: true },
							},
						},
					},
				},
			},
			User: { select: { id: true, fullName: true, email: true } },
		},
	})

	if (!dispute) return notFound()

	// ✅ Серверное действие
	async function resolveDispute(formData: FormData) {
		'use server'

		const decision = formData.get('decision') as string // "customer" | "executor"
		const resolution = formData.get('resolution') as string

		// Обновляем спор
		await (prisma as any).dispute.update({
			where: { id: dispute.id },
			data: {
				status: 'resolved',
				resolution: resolution || '',
				resolvedAt: new Date(),
				adminDecision: decision,
			},
		})

		// Обновляем задачу
		if (decision === 'customer') {
			await (prisma as any).task.update({
				where: { id: dispute.Task.id },
				data: { status: 'cancelled' },
			})
		} else if (decision === 'executor') {
			await (prisma as any).task.update({
				where: { id: dispute.Task.id },
				data: { status: 'completed' },
			})
		}

		// 🚀 Возврат в список споров
		redirect('/admin/disputes')
	}

	return (
		<div>
			<div className='mb-6'>
				<h1 className='text-3xl font-bold text-emerald-400 mb-2 flex items-center gap-2'>
					<span className='text-4xl'>⚖️</span>
					Детали спора
				</h1>
				<p className='text-gray-400 text-sm font-mono'>ID: {dispute.id}</p>
			</div>

			{/* 🧱 Основная информация */}
			<div className='bg-black/40 border border-emerald-500/20 rounded-xl p-5 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]'>
				<div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
					<div>
						<span className='text-gray-400 text-sm block mb-1'>Статус:</span>
						<span
							className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${
								dispute.status === 'open'
									? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
									: dispute.status === 'resolved'
									? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
									: 'bg-red-500/20 text-red-400 border-red-500/30'
							}`}
						>
							{dispute.status === 'open'
								? 'Открыт'
								: dispute.status === 'resolved'
								? 'Решён'
								: 'Отклонён'}
						</span>
					</div>
					<div>
						<span className='text-gray-400 text-sm block mb-1'>Создан:</span>
						<span className='text-gray-200 text-sm'>
							{new Date(dispute.createdAt).toLocaleString('ru-RU')}
						</span>
					</div>
					{dispute.resolvedAt && (
						<div>
							<span className='text-gray-400 text-sm block mb-1'>Решён:</span>
							<span className='text-emerald-400 text-sm'>
								{new Date(dispute.resolvedAt).toLocaleString('ru-RU')}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* 🧩 Информация о задаче */}
			<div className='bg-black/40 border border-emerald-500/20 rounded-xl p-5 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]'>
				<h2 className='text-lg font-semibold mb-3 text-emerald-400 flex items-center gap-2'>
					<span>📋</span> Задача
				</h2>
				<div className='space-y-2'>
					<Link
						href={`/admin/tasks/${dispute.Task.id}`}
						className='text-emerald-400 hover:text-emerald-300 transition font-medium text-lg block'
					>
						{dispute.Task.title} →
					</Link>
					<p className='text-sm text-gray-400'>
						Статус: <span className='text-gray-200'>{dispute.Task.status}</span>
					</p>
				</div>
			</div>

			{/* 👤 Инициатор спора */}
			<div className='bg-black/40 border border-emerald-500/20 rounded-xl p-5 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]'>
				<h2 className='text-lg font-semibold mb-3 text-emerald-400 flex items-center gap-2'>
					<span>👤</span> Инициатор спора
				</h2>
				<div className='space-y-2'>
					<p className='text-gray-200 font-medium'>
						{dispute.User.fullName || 'Неизвестный'}
					</p>
					<p className='text-gray-400 text-sm'>{dispute.User.email}</p>
					<Link
						href={`/admin/users/${dispute.User.id}`}
						className='inline-block text-emerald-400 hover:text-emerald-300 text-sm transition mt-2'
					>
						Открыть профиль →
					</Link>
				</div>
			</div>

			{/* 📄 Причина */}
			<div className='bg-black/40 border border-red-500/20 rounded-xl p-5 mb-6 shadow-[0_0_15px_rgba(239,68,68,0.1)]'>
				<h2 className='text-lg font-semibold mb-3 text-red-400 flex items-center gap-2'>
					<span>⚠️</span> Причина спора
				</h2>
				<div className='bg-red-950/20 border border-red-500/20 rounded-lg p-4'>
					<p className='text-gray-200 whitespace-pre-line font-medium'>
						{dispute.reason}
					</p>
				</div>
				{dispute.details && (
					<div className='mt-4'>
						<h3 className='text-gray-400 mb-2 text-sm font-medium'>
							Дополнительные детали:
						</h3>
						<p className='text-gray-300 text-sm leading-relaxed'>
							{dispute.details}
						</p>
					</div>
				)}
			</div>

			{/* 💬 Чат по задаче */}
			<div className='bg-black/40 border border-emerald-500/20 rounded-xl p-5 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]'>
				<h2 className='text-lg font-semibold mb-3 text-emerald-400 flex items-center gap-2'>
					<span>💬</span> Чат по задаче
				</h2>
				{dispute.Task.messages.length === 0 ? (
					<p className='text-gray-500 text-sm italic'>Сообщений нет</p>
				) : (
					<div className='space-y-3 max-h-[400px] overflow-y-auto p-4 bg-black/30 rounded-lg border border-gray-700'>
						{dispute.Task.messages.map(m => (
							<div
								key={m.id}
								className='border-b border-gray-800 pb-3 last:border-0'
							>
								<div className='flex items-center justify-between mb-1'>
									<p className='text-sm'>
										<span className='font-semibold text-gray-200'>
											{m.sender.fullName || m.sender.email}
										</span>{' '}
										<span className='text-xs text-gray-500'>
											({m.sender.role})
										</span>
									</p>
									<span className='text-xs text-gray-600'>
										{new Date(m.createdAt).toLocaleString('ru-RU')}
									</span>
								</div>
								<p className='text-gray-300 text-sm leading-relaxed'>
									{m.content}
								</p>
							</div>
						))}
					</div>
				)}
			</div>

			{/* ⚖️ Решение администратора */}
			{dispute.status === 'open' ? (
				<form
					action={resolveDispute}
					className='bg-gradient-to-br from-emerald-900/20 to-black/40 border border-emerald-500/30 rounded-xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
				>
					<h2 className='text-xl font-semibold mb-4 text-emerald-400 flex items-center gap-2'>
						<span>⚖️</span> Решение администратора
					</h2>

					<div className='flex flex-col gap-3 mb-5'>
						<label className='flex items-center gap-3 p-4 bg-black/30 border border-gray-700 rounded-xl hover:border-emerald-500/30 transition cursor-pointer'>
							<input
								type='radio'
								name='decision'
								value='customer'
								className='w-5 h-5 accent-emerald-500'
								required
							/>
							<span className='text-gray-200 font-medium'>
								👤 Поддержать заказчика
							</span>
						</label>
						<label className='flex items-center gap-3 p-4 bg-black/30 border border-gray-700 rounded-xl hover:border-blue-500/30 transition cursor-pointer'>
							<input
								type='radio'
								name='decision'
								value='executor'
								className='w-5 h-5 accent-blue-500'
								required
							/>
							<span className='text-gray-200 font-medium'>
								🛠 Поддержать исполнителя
							</span>
						</label>
					</div>

					<textarea
						name='resolution'
						placeholder='Комментарий администратора (необязательно)...'
						className='w-full p-4 rounded-xl bg-black/30 text-gray-100 border border-gray-700 focus:border-emerald-500/30 focus:outline-none transition mb-4'
						rows={4}
					/>

					<button
						type='submit'
						className='w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl text-white font-semibold transition shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
					>
						✅ Зафиксировать решение
					</button>
				</form>
			) : (
				<div className='bg-gradient-to-br from-emerald-900/20 to-black/40 border border-emerald-500/30 rounded-xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]'>
					<h2 className='text-xl font-semibold mb-3 text-emerald-400 flex items-center gap-2'>
						<span>✅</span>
						Спор решён
					</h2>
					<div className='bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-4 mb-3'>
						<p className='text-gray-200'>
							Решение администратора:{' '}
							<span className='font-bold text-emerald-400'>
								{dispute.adminDecision === 'customer'
									? '👤 в пользу заказчика'
									: '🛠 в пользу исполнителя'}
							</span>
						</p>
					</div>
					{dispute.resolution && (
						<div className='bg-black/30 border border-gray-700 rounded-lg p-4'>
							<p className='text-gray-400 text-sm mb-1 font-medium'>
								Комментарий:
							</p>
							<p className='text-gray-300 italic leading-relaxed'>
								«{dispute.resolution}»
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
