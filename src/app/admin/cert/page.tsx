'use client'
import { useEffect, useState } from 'react'

export default function CertPage() {
	const [categories, setCategories] = useState<any[]>([])

	useEffect(() => {
		fetch('/api/admin/categories')
			.then(res => res.json())
			.then(setCategories)
	}, [])

	const updatePrice = async (id: string, minPrice: number) => {
		await fetch('/api/admin/categories', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, minPrice }),
		})
		setCategories(prev =>
			prev.map(c => ({
				...c,
				subcategories: c.subcategories.map((s: any) =>
					s.id === id ? { ...s, minPrice } : s
				),
			}))
		)
	}

	return (
		<div className='p-8 text-gray-100'>
			<h1 className='text-2xl font-bold text-emerald-400 mb-6'>
				🧾 Сертификация
			</h1>
			{categories.map(cat => (
				<div
					key={cat.id}
					className='mb-6 bg-black/50 p-4 rounded-xl border border-emerald-500/30'
				>
					<h2 className='text-lg text-emerald-400 mb-2'>{cat.name}</h2>
					<table className='w-full text-left'>
						<thead>
							<tr className='border-b border-gray-700 text-gray-400'>
								<th>Подкатегория</th>
								<th>Мин. ставка (₽)</th>
							</tr>
						</thead>
						<tbody>
							{cat.subcategories.map((sub: any) => (
								<tr key={sub.id} className='border-b border-gray-800'>
									<td>{sub.name}</td>
									<td>
										<input
											type='number'
											value={Number(sub.minPrice || 0)}
											onChange={e =>
												updatePrice(sub.id, Number(e.target.value))
											}
											className='bg-gray-900 border border-gray-700 px-2 py-1 rounded w-24'
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			))}
		</div>
	)
}
