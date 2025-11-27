import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Каталог задач — Фриланс проекты и удаленная работа',
	description: 'Каталог фриланс задач и проектов на NESI. Найдите удаленную работу: разработка, дизайн, маркетинг, копирайтинг. Безопасные платежи, система эскроу.',
	keywords: [
		'каталог задач',
		'фриланс задачи',
		'найти работу',
		'удаленная работа',
		'фриланс проекты',
		'задачи фриланс',
		'работа на дому',
		'удаленная работа вакансии',
		'фриланс биржа',
		'найти проект',
		'работа фрилансером',
		'удаленная работа онлайн',
	],
	openGraph: {
		title: 'Каталог задач — Фриланс проекты и удаленная работа',
		description: 'Каталог фриланс задач и проектов на NESI. Найдите удаленную работу: разработка, дизайн, маркетинг, копирайтинг.',
		type: 'website',
		url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/tasks`,
		images: [
			{
				url: '/og-image.png',
				width: 1200,
				height: 630,
				alt: 'Каталог задач NESI',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Каталог задач — Фриланс проекты и удаленная работа',
		description: 'Каталог фриланс задач и проектов на NESI. Найдите удаленную работу: разработка, дизайн, маркетинг, копирайтинг.',
		images: ['/og-image.png'],
	},
	alternates: {
		canonical: '/tasks',
	},
}

export default function TasksLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<>
			{children}
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'CollectionPage',
						name: 'Каталог задач — NESI',
						description: 'Каталог фриланс задач и проектов',
						url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/tasks`,
					}),
				}}
			/>
		</>
	)
}

