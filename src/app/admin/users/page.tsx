'use client'

import { useEffect, useState } from 'react'

export default function AdminUsers() {
	const [users, setUsers] = useState<any[]>([])
	const [page, setPage] = useState(1)
	const [pages, setPages] = useState(1)
	const [search, setSearch] = useState('')

	const fetchUsers = async (query = '') => {
		const res = await fetch(
			`/api/admin/users?page=${page}&limit=20&search=${query}`
		)
		const data = await res.json()
		setUsers(data.users)
		setPages(data.pages)
	}

	useEffect(() => {
		fetchUsers(search)
	}, [page])

	const handleBlockToggle = async (id: string, blocked: boolean) => {
		try {
			const res = await fetch(`/api/admin/users`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, blocked }),
			})
			
			if (res.ok) {
				// Обновляем UI сразу без перезагрузки страницы
				setUsers(prev => prev.map(u => (u.id === id ? { ...u, blocked } : u)))
			}
		} catch (error) {
			console.error('Ошибка при блокировке пользователя:', error)
		}
	}

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		setPage(1)
		fetchUsers(search)
	}

	return (
		<div className='text-white'>
			<h2 className='text-xl font-bold mb-4'>Пользователи</h2>

			{/* 🔍 Поиск */}
			<form onSubmit={handleSearch} className='mb-4 flex gap-2'>
				<input
					type='text'
					value={search}
					onChange={e => setSearch(e.target.value)}
					placeholder='Поиск по email или имени'
					className='bg-gray-900 border border-gray-700 rounded px-3 py-1 w-64'
				/>
				<button className='px-3 py-1 bg-green-700 hover:bg-green-800 rounded'>
					Найти
				</button>
			</form>

			{/* 📋 Таблица */}
			<table className='w-full text-sm border border-gray-800'>
				<thead>
					<tr className='bg-gray-800'>
						<th className='p-2'>Email</th>
						<th className='p-2'>Имя</th>
						<th className='p-2'>Роль</th>
						<th className='p-2'>Баланс</th>
						<th className='p-2'>XP</th>
						<th className='p-2'>Рейтинг</th>
						<th className='p-2'>Задач</th>
						<th className='p-2'>Статус</th>
						<th className='p-2'>Действия</th>
					</tr>
				</thead>
				<tbody>
					{users.map(u => (
						<tr key={u.id} className='border-t border-gray-800'>
							<td className='p-2'>{u.email}</td>
							<td className='p-2'>{u.fullName || '—'}</td>
							<td className='p-2'>{u.role}</td>
							<td className='p-2'>{Number(u.balance || 0).toFixed(2)} ₽</td>
							<td className='p-2'>{u.xp}</td>
							<td className='p-2'>
								{u.avgRating ? Number(u.avgRating).toFixed(1) : '—'}
							</td>
							<td className='p-2'>{u.completedTasksCount}</td>
							<td className='p-2'>
								{u.blocked ? (
									<span className='text-red-400'>Заблокирован</span>
								) : (
									<span className='text-green-400'>Активен</span>
								)}
							</td>
							<td className='p-2 space-x-2'>
								<button
									onClick={() => handleBlockToggle(u.id, !u.blocked)}
									className={`px-2 py-1 rounded text-xs ${
										u.blocked
											? 'bg-green-700 hover:bg-green-800'
											: 'bg-red-700 hover:bg-red-800'
									}`}
								>
									{u.blocked ? 'Разблокировать' : 'Заблокировать'}
								</button>
								<a
									href={`/admin/users/${u.id}`}
									className='px-2 py-1 bg-blue-700 hover:bg-blue-800 rounded text-xs'
								>
									👁 Профиль
								</a>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* 📄 Пагинация */}
			<div className='flex gap-2 mt-4'>
				<button
					onClick={() => setPage(p => Math.max(1, p - 1))}
					disabled={page === 1}
					className='px-3 py-1 bg-gray-800 rounded disabled:opacity-50'
				>
					← Назад
				</button>
				<span className='px-2 py-1'>
					{page} / {pages}
				</span>
				<button
					onClick={() => setPage(p => Math.min(pages, p + 1))}
					disabled={page === pages}
					className='px-3 py-1 bg-gray-800 rounded disabled:opacity-50'
				>
					Вперёд →
				</button>
			</div>
		</div>
	)
}
