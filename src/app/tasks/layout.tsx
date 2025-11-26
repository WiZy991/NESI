import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Каталог задач — Найти работу, фриланс проекты | NESI',
	description: 'Каталог фриланс задач и проектов на платформе NESI. Найдите удаленную работу по различным категориям: разработка, дизайн, маркетинг, копирайтинг и многое другое. Безопасные платежи, система эскроу.',
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
	],
	openGraph: {
		title: 'Каталог задач — Найти работу на NESI',
		description: 'Каталог фриланс задач и проектов. Найдите удаленную работу по различным категориям.',
		type: 'website',
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

