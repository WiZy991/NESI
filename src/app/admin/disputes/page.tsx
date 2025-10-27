// ✅ src/app/admin/disputes/page.tsx
export const dynamic = 'force-dynamic' // 🔥 Отключает пререндеринг, решает ошибку при билде

import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AdminDisputesPage() {
	let disputes = []

	try {
		disputes = await (prisma as any).dispute.findMany({
			include: {
				Task: { select: { id: true, title: true } },
				User: { select: { id: true, fullName: true, email: true } },
			},
			orderBy: { createdAt: 'desc' },
		})
	} catch (error) {
		console.error('Ошибка при загрузке споров:', error)
		return (
			<div>
				<h1 className='text-3xl font-bold text-emerald-400 mb-4 flex items-center gap-2'>
					<span className='text-4xl'>⚖️</span>
					Споры
				</h1>
				<div className='p-8 text-center bg-red-500/10 border border-red-500/30 rounded-xl'>
					<p className='text-red-400 text-lg'>
						⚠️ Не удалось подключиться к базе данных. Попробуйте позже.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div>
			<div className='mb-6'>
				<h1 className='text-3xl font-bold text-emerald-400 mb-2 flex items-center gap-2'>
					<span className='text-4xl'>⚖️</span>
					Управление спорами
				</h1>
				<p className='text-gray-400 text-sm'>Всего споров: {disputes.length}</p>
			</div>

			{disputes.length === 0 ? (
				<div className='p-12 text-center bg-black/40 border border-emerald-500/20 rounded-xl'>
					<p className='text-gray-400 text-lg'>
						✅ Нет открытых споров — значит всё спокойно!
					</p>
				</div>
			) : (
				<div className='bg-black/40 border border-emerald-500/20 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
					<div className='overflow-x-auto'>
						<table className='w-full text-sm'>
							<thead>
								<tr className='bg-emerald-900/20 border-b border-emerald-500/20'>
									<th className='p-4 text-left text-emerald-400 font-semibold'>
										Задача
									</th>
									<th className='p-4 text-left text-emerald-400 font-semibold'>
										Пользователь
									</th>
									<th className='p-4 text-left text-emerald-400 font-semibold'>
										Причина
									</th>
									<th className='p-4 text-left text-emerald-400 font-semibold'>
										Описание
									</th>
									<th className='p-4 text-center text-emerald-400 font-semibold'>
										Статус
									</th>
									<th className='p-4 text-center text-emerald-400 font-semibold'>
										Действия
									</th>
								</tr>
							</thead>
							<tbody>
								{disputes.map((d: any) => (
									<tr
										key={d.id}
										className='border-t border-gray-800 hover:bg-emerald-500/5 transition'
									>
										<td className='p-4'>
											<Link
												href={`/admin/tasks/${d.Task.id}`}
												className='text-emerald-400 hover:text-emerald-300 hover:underline font-medium'
											>
												{d.Task.title}
											</Link>
										</td>
										<td className='p-4 text-gray-300'>
											<div>
												<div className='font-medium'>
													{d.User.fullName || 'Неизвестный'}
												</div>
												<div className='text-xs text-gray-500'>
													{d.User.email}
												</div>
											</div>
										</td>
										<td className='p-4'>
											<span className='text-red-400 font-medium'>
												{d.reason}
											</span>
										</td>
										<td
											className='p-4 text-gray-300 max-w-xs truncate'
											title={d.details || '—'}
										>
											{d.details || (
												<span className='text-gray-500 italic'>
													Без описания
												</span>
											)}
										</td>
										<td className='p-4 text-center'>
											{d.status === 'open' ? (
												<span className='inline-block px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-medium'>
													Открыт
												</span>
											) : d.status === 'resolved' ? (
												<span className='inline-block px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium'>
													Решён
												</span>
											) : d.status === 'rejected' ? (
												<span className='inline-block px-3 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium'>
													Отклонён
												</span>
											) : (
												<span className='inline-block px-3 py-1 rounded-lg bg-gray-500/20 text-gray-400 border border-gray-500/30 text-xs font-medium'>
													{d.status}
												</span>
											)}
										</td>
										<td className='p-4 text-center'>
											<Link
												href={`/admin/disputes/${d.id}`}
												className='inline-block px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-white text-xs transition font-medium'
											>
												👁 Открыть
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
}
