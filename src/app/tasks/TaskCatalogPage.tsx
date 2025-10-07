'use client'

import CategoryDropdown from '@/components/CategoryDropdown'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type Task = {
	id: string
	title: string
	description: string
	createdAt: string
	price?: number
	customer: {
		fullName?: string
	}
}

type Category = {
	id: string
	name: string
	subcategories: {
		id: string
		name: string
	}[]
}

export default function TaskCatalogPage() {
	const { user, token, loading: userLoading } = useUser()
	const [tasks, setTasks] = useState<Task[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const searchParams = useSearchParams()
	const router = useRouter()

	const [search, setSearch] = useState(searchParams.get('search') || '')
	const [status, setStatus] = useState(searchParams.get('status') || '')
	const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '')
	const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '')
	const [sort, setSort] = useState(searchParams.get('sort') || 'new')
	const [subcategory, setSubcategory] = useState(
		searchParams.get('subcategory') || ''
	)

	const fetchTasks = useCallback(async () => {
		setLoading(true)
		try {
			const query = new URLSearchParams()
			if (search) query.set('search', search)
			if (status) query.set('status', status)
			if (minPrice) query.set('minPrice', minPrice)
			if (maxPrice) query.set('maxPrice', maxPrice)
			if (sort) query.set('sort', sort)
			if (subcategory) query.set('subcategory', subcategory)

			const res = await fetch(`/api/tasks?${query.toString()}`, {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await res.json()
			if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')

			setTasks(data.tasks || [])
		} catch (err: any) {
			console.error('Ошибка загрузки задач:', err)
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}, [search, status, minPrice, maxPrice, sort, subcategory, token])

	const fetchCategories = useCallback(async () => {
		try {
			const res = await fetch('/api/categories')
			const data = await res.json()
			setCategories(data.categories || [])
		} catch (err) {
			console.error('Ошибка загрузки категорий:', err)
		}
	}, [])

	useEffect(() => {
		if (!userLoading && user && token) {
			fetchTasks()
			fetchCategories()
		}
	}, [userLoading, user, token, fetchTasks, fetchCategories])

	const applyFilters = useCallback(() => {
		const query = new URLSearchParams()
		if (search) query.set('search', search)
		if (status) query.set('status', status)
		if (minPrice) query.set('minPrice', minPrice)
		if (maxPrice) query.set('maxPrice', maxPrice)
		if (sort) query.set('sort', sort)
		if (subcategory) query.set('subcategory', subcategory)
		router.push(`/tasks?${query.toString()}`)
	}, [search, status, minPrice, maxPrice, sort, subcategory, router])

	const resetFilters = useCallback(() => {
		setSearch('')
		setStatus('')
		setMinPrice('')
		setMaxPrice('')
		setSort('new')
		setSubcategory('')
		router.push('/tasks')
	}, [router])

	const handleSubcategorySelect = useCallback(
		(id: string) => {
			setSubcategory(id)
			const query = new URLSearchParams(searchParams.toString())
			query.set('subcategory', id)
			router.push(`/tasks?${query.toString()}`)
		},
		[searchParams, router]
	)

	const renderSkeleton = () => (
		<div className='space-y-4'>
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					key={i}
					className='p-6 border border-emerald-500/30 rounded-xl bg-black/40 animate-pulse shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-3'
				>
					<div className='h-5 bg-emerald-900/40 rounded w-1/2'></div>
					<div className='h-4 bg-emerald-900/30 rounded w-3/4'></div>
					<div className='h-3 bg-emerald-900/20 rounded w-1/4'></div>
				</div>
			))}
		</div>
	)

	return (
		<div className='space-y-8'>
			<h1 className='text-4xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]'>
				Каталог задач
			</h1>

			<CategoryDropdown
				categories={categories}
				onSelectSubcategory={handleSubcategorySelect}
			/>

			<div className='flex gap-8'>
				{/* Фильтры */}
				<div className='w-72 p-6 bg-black/40 border border-emerald-500/30 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)] space-y-4'>
					<input
						type='text'
						placeholder='Поиск...'
						className='w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400'
						value={search}
						onChange={e => setSearch(e.target.value)}
					/>
					<select
						className='w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400'
						value={status}
						onChange={e => setStatus(e.target.value)}
					>
						<option value=''>Все статусы</option>
						<option value='open'>Открыта</option>
						<option value='in_progress'>В работе</option>
						<option value='completed'>Выполнена</option>
					</select>
					<input
						type='number'
						placeholder='Цена от'
						className='w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400'
						value={minPrice}
						onChange={e => setMinPrice(e.target.value)}
					/>
					<input
						type='number'
						placeholder='Цена до'
						className='w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400'
						value={maxPrice}
						onChange={e => setMaxPrice(e.target.value)}
					/>
					<select
						className='w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400'
						value={sort}
						onChange={e => setSort(e.target.value)}
					>
						<option value='new'>Сначала новые</option>
						<option value='old'>Сначала старые</option>
					</select>
					<button
						onClick={applyFilters}
						className='w-full py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold'
					>
						Применить
					</button>
					<button
						onClick={resetFilters}
						className='w-full py-2 rounded-lg border border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white transition'
					>
						Сбросить
					</button>
				</div>

				{/* Задачи */}
				<div className='flex-1 space-y-6'>
					{loading || userLoading ? (
						renderSkeleton()
					) : error ? (
						<div className='text-red-400'>{error}</div>
					) : tasks.length === 0 ? (
						<div className='text-gray-400'>Задач пока нет</div>
					) : (
						tasks.map(task => (
							<div
								key={task.id}
								className='p-6 border border-emerald-500/30 rounded-xl bg-black/40 shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition space-y-2'
							>
								<Link href={`/tasks/${task.id}`}>
									<h2 className='text-xl font-semibold text-emerald-300 hover:underline cursor-pointer'>
										{task.title}
									</h2>
								</Link>
								<p className='text-gray-300'>{task.description}</p>
								{task.price && (
									<p className='text-emerald-400 font-medium'>
										💰 {task.price} ₽
									</p>
								)}
								<p className='text-sm text-gray-400'>
									Автор: {task.customer?.fullName || 'Без имени'} —{' '}
									{new Date(task.createdAt).toLocaleDateString()}
								</p>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	)
}
