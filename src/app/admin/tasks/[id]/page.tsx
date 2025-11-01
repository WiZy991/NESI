import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
	params: Promise<{ id: string }>
}

export default async function AdminTaskPage({ params }: Props) {
	const { id } = await params
	const task = await prisma.task.findUnique({
		where: { id },
		include: {
			customer: { select: { id: true, email: true, fullName: true } },
			executor: { select: { id: true, email: true, fullName: true } },
			Transaction: {
				select: {
					id: true,
					amount: true,
					type: true,
					createdAt: true,
					reason: true,
				},
				orderBy: { createdAt: 'desc' },
			},
			messages: {
				include: {
					sender: {
						select: { id: true, fullName: true, email: true, role: true },
					},
				},
				orderBy: { createdAt: 'asc' },
			},
		},
	})

	if (!task) return notFound()

	return (
		<div className='text-white'>
			<h1 className='text-xl sm:text-2xl font-bold mb-3 sm:mb-4 break-words'>Задача: {task.title}</h1>

			{/* Основная информация */}
			<div className='bg-gray-900 p-3 sm:p-4 rounded-lg border border-gray-800 mb-4 sm:mb-8'>
				<p className='text-sm sm:text-base break-all'>
					<span className='text-gray-400'>ID:</span> {task.id}
				</p>
				<p className='text-sm sm:text-base'>
					<span className='text-gray-400'>Статус:</span> {task.status}
				</p>
				<p className='text-sm sm:text-base'>
					<span className='text-gray-400'>Цена:</span>{' '}
					{task.price ? Number(task.price).toFixed(2) : '—'} ₽
				</p>
				<p className='text-sm sm:text-base'>
					<span className='text-gray-400'>Создана:</span>{' '}
					{new Date(task.createdAt).toLocaleDateString()}
				</p>
				<p className='text-sm sm:text-base'>
					<span className='text-gray-400'>Обновлена:</span>{' '}
					{new Date(task.updatedAt).toLocaleDateString()}
				</p>
			</div>

			{/* Описание */}
			<div className='bg-gray-900 p-3 sm:p-4 rounded-lg border border-gray-800 mb-4 sm:mb-8'>
				<h2 className='text-base sm:text-lg font-semibold mb-2'>Описание</h2>
				<p className='text-sm sm:text-base text-gray-300 whitespace-pre-line break-words'>
					{task.description || 'Без описания'}
				</p>
			</div>

			{/* Связанные пользователи */}
			<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-8'>
				<div className='bg-gray-900 p-3 sm:p-4 rounded-lg border border-gray-800'>
					<h2 className='text-base sm:text-lg font-semibold mb-2'>Заказчик</h2>
					{task.customer ? (
						<>
							<p className='text-sm sm:text-base break-words'>{task.customer.fullName || '—'}</p>
							<p className='text-sm sm:text-base break-all'>{task.customer.email}</p>
							<Link
								href={`/admin/users/${task.customer.id}`}
								className='text-blue-400 hover:underline text-xs sm:text-sm inline-block mt-2'
							>
								Открыть профиль →
							</Link>
						</>
					) : (
						<p className='text-gray-500 text-xs sm:text-sm'>Нет данных</p>
					)}
				</div>

				<div className='bg-gray-900 p-3 sm:p-4 rounded-lg border border-gray-800'>
					<h2 className='text-base sm:text-lg font-semibold mb-2'>Исполнитель</h2>
					{task.executor ? (
						<>
							<p className='text-sm sm:text-base break-words'>{task.executor.fullName || '—'}</p>
							<p className='text-sm sm:text-base break-all'>{task.executor.email}</p>
							<Link
								href={`/admin/users/${task.executor.id}`}
								className='text-blue-400 hover:underline text-xs sm:text-sm inline-block mt-2'
							>
								Открыть профиль →
							</Link>
						</>
					) : (
						<p className='text-gray-500 text-xs sm:text-sm'>Не назначен</p>
					)}
				</div>
			</div>

			{/* Финансы по задаче */}
			<div className='bg-gray-900 p-3 sm:p-4 rounded-lg border border-gray-800 mb-4 sm:mb-8 overflow-x-auto'>
				<h2 className='text-base sm:text-lg font-semibold mb-3'>Финансовые операции</h2>
				{task.Transaction.length === 0 ? (
					<p className='text-gray-500 text-xs sm:text-sm'>Нет связанных транзакций.</p>
				) : (
					<table className='w-full text-xs sm:text-sm border border-gray-800 min-w-[500px]'>
						<thead>
							<tr className='bg-gray-800'>
								<th className='p-2 text-left'>Тип</th>
								<th className='p-2'>Сумма</th>
								<th className='p-2'>Причина</th>
								<th className='p-2'>Дата</th>
							</tr>
						</thead>
						<tbody>
							{task.Transaction.map(t => (
								<tr key={t.id} className='border-t border-gray-800'>
									<td className='p-2 capitalize'>{t.type}</td>
									<td
										className={`p-2 ${
											Number(t.amount) > 0 ? 'text-green-400' : 'text-red-400'
										}`}
									>
										{Number(t.amount).toFixed(2)} ₽
									</td>
									<td className='p-2'>{t.reason}</td>
									<td className='p-2'>
										{new Date(t.createdAt).toLocaleDateString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* 💬 Чат между заказчиком и исполнителем */}
			<div className='bg-gray-900 p-3 sm:p-4 rounded-lg border border-gray-800'>
				<h2 className='text-base sm:text-lg font-semibold mb-3'>💬 Чат по задаче</h2>

				{task.messages.length === 0 ? (
					<p className='text-gray-500 text-xs sm:text-sm'>Переписка отсутствует.</p>
				) : (
					<div className='space-y-2 sm:space-y-3 max-h-[400px] overflow-y-auto'>
						{task.messages.map(msg => (
							<div
								key={msg.id}
								className={`p-2 sm:p-3 rounded-lg ${
									msg.sender.role === 'customer'
										? 'bg-blue-900/40 border border-blue-800'
										: 'bg-green-900/30 border border-green-700'
								}`}
							>
								<div className='flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-gray-400 mb-1 gap-1'>
									<span className='break-words'>
										{msg.sender.fullName || msg.sender.email}{' '}
										<span className='opacity-70'>
											(
											{msg.sender.role === 'customer'
												? 'Заказчик'
												: 'Исполнитель'}
											)
										</span>
									</span>
									<span className='text-[10px] sm:text-xs'>{new Date(msg.createdAt).toLocaleString()}</span>
								</div>
								<p className='text-xs sm:text-sm text-gray-100 whitespace-pre-line break-words'>
									{msg.content}
								</p>
								{msg.fileUrl && (
									<a
										href={msg.fileUrl}
										target='_blank'
										className='text-blue-400 text-[10px] sm:text-xs underline mt-1 inline-block'
									>
										📎 Прикреплённый файл
									</a>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
