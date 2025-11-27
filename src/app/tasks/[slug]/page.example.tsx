// ПРИМЕР: Страница категории задач
// Скопируйте этот файл для каждой категории и обновите slug

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import FAQSchema from '@/components/FAQSchema'
import { getCategoryConfig } from '@/lib/seo/categories'
import prisma from '@/lib/prisma'

export async function generateStaticParams() {
	return [
		{ slug: 'development' },
		{ slug: 'design' },
		{ slug: 'marketing' },
		{ slug: 'copywriting' },
		{ slug: 'smm' },
		{ slug: 'frontend' },
		{ slug: 'backend' },
		{ slug: 'mobile' },
		{ slug: 'ai' },
		{ slug: 'devops' },
		{ slug: 'qa' },
		{ slug: 'management' },
		{ slug: 'data-science' },
		{ slug: 'support' },
	]
}

export async function generateMetadata({
	params,
}: {
	params: { slug: string }
}): Promise<Metadata> {
	const category = getCategoryConfig(params.slug, 'tasks')
	if (!category) return {}

	return {
		title: `${category.name} — Фриланс задачи и проекты | NESI`,
		description: category.description,
		keywords: [
			...category.keywords,
			'фриланс',
			'удаленная работа',
			'каталог задач',
			'найти работу',
		],
		openGraph: {
			title: `${category.name} — Фриланс задачи и проекты`,
			description: category.description,
			type: 'website',
			url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/tasks/${category.slug}`,
		},
		twitter: {
			card: 'summary_large_image',
			title: `${category.name} — Фриланс задачи и проекты`,
			description: category.description,
		},
		alternates: {
			canonical: `/tasks/${category.slug}`,
		},
	}
}

export default async function CategoryPage({
	params,
}: {
	params: { slug: string }
}) {
	const category = getCategoryConfig(params.slug, 'tasks')
	if (!category) notFound()

	// Получаем задачи категории
	const tasks = await prisma.task.findMany({
		where: {
			status: 'open',
			subcategory: {
				category: {
					name: {
						contains: category.name,
						mode: 'insensitive',
					},
				},
			},
		},
		take: 20,
		orderBy: { createdAt: 'desc' },
		include: {
			customer: { select: { fullName: true } },
			subcategory: {
				include: { category: true },
			},
		},
	})

	return (
		<div className='max-w-6xl mx-auto px-4 py-8'>
			{/* Breadcrumbs */}
			<Breadcrumbs
				items={[
					{ label: 'Главная', href: '/' },
					{ label: 'Каталог задач', href: '/tasks' },
					{ label: category.name, href: `/tasks/${category.slug}` },
				]}
			/>

			{/* H1 */}
			<h1 className='text-3xl md:text-4xl font-bold text-emerald-400 mb-6'>
				{category.h1}
			</h1>

			{/* SEO-текст */}
			<div className='bg-black/40 border border-emerald-500/30 rounded-2xl p-6 mb-8'>
				<p className='text-gray-300 leading-relaxed mb-4'>{category.seoText}</p>

				{/* Популярные подкатегории */}
				{category.popularSubcategories.length > 0 && (
					<>
						<h2 className='text-xl font-semibold text-emerald-300 mb-3'>
							Популярные подкатегории
						</h2>
						<ul className='list-disc list-inside text-gray-300 space-y-2'>
							{category.popularSubcategories.map(sub => (
								<li key={sub}>{sub}</li>
							))}
						</ul>
					</>
				)}
			</div>

			{/* FAQ */}
			{category.faq.length > 0 && (
				<div className='bg-black/40 border border-emerald-500/30 rounded-2xl p-6 mb-8'>
					<h2 className='text-xl font-semibold text-emerald-300 mb-4'>
						Часто задаваемые вопросы
					</h2>
					<div className='space-y-4'>
						{category.faq.map((faq, index) => (
							<div key={index}>
								<h3 className='text-lg font-medium text-white mb-2'>
									{faq.question}
								</h3>
								<p className='text-gray-300'>{faq.answer}</p>
							</div>
						))}
					</div>
					<FAQSchema faqs={category.faq} />
				</div>
			)}

			{/* Список задач */}
			<div className='space-y-4'>
				<h2 className='text-2xl font-semibold text-emerald-300 mb-4'>
					Актуальные задачи
				</h2>
				{tasks.length === 0 ? (
					<p className='text-gray-400 text-center py-8'>
						Пока нет задач в этой категории
					</p>
				) : (
					tasks.map(task => (
						<div
							key={task.id}
							className='bg-black/40 border border-emerald-500/30 rounded-xl p-4 hover:border-emerald-400/60 transition-colors'
						>
							<h3 className='text-lg font-semibold text-white mb-2'>
								<Link
									href={`/tasks/${task.id}`}
									className='hover:text-emerald-400 transition-colors'
								>
									{task.title}
								</Link>
							</h3>
							<p className='text-gray-300 text-sm mb-2 line-clamp-2'>
								{task.description}
							</p>
							<div className='flex items-center justify-between'>
								{task.price && (
									<p className='text-emerald-400 font-semibold'>
										{task.price} ₽
									</p>
								)}
								<Link
									href={`/tasks/${task.id}`}
									className='text-emerald-400 hover:text-emerald-300 text-sm'
								>
									Подробнее →
								</Link>
							</div>
						</div>
					))
				)}
			</div>

			{/* JSON-LD для CollectionPage */}
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'CollectionPage',
						name: `Задачи по ${category.name.toLowerCase()}`,
						description: category.description,
						url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/tasks/${category.slug}`,
					}),
				}}
			/>
		</div>
	)
}

