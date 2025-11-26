import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Для заказчиков — Найти исполнителя, создать задачу | NESI',
	description: 'Найдите профессиональных исполнителей для ваших задач на фриланс платформе NESI. Создавайте задачи, получайте отклики от проверенных специалистов. Безопасные платежи, система эскроу, гарантия качества.',
	keywords: [
		'найти исполнителя',
		'найти специалиста',
		'заказать работу',
		'создать задачу',
		'фриланс для заказчиков',
		'найти фрилансера',
		'найм исполнителя',
		'заказчик фриланс',
		'разместить задачу',
		'найти разработчика',
		'найти дизайнера',
		'найти копирайтера',
		'бизнес фриланс',
		'предприниматель',
		'заказчик проектов',
	],
	openGraph: {
		title: 'Для заказчиков — Найти исполнителя на NESI',
		description: 'Найдите профессиональных исполнителей для ваших задач. Создавайте задачи, получайте отклики от проверенных специалистов.',
		type: 'website',
	},
	alternates: {
		canonical: '/business',
	},
}

export default function BusinessLayout({
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
						'@type': 'WebPage',
						name: 'Для заказчиков — NESI',
						description: 'Найдите профессиональных исполнителей для ваших задач на фриланс платформе NESI',
						url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/business`,
						mainEntity: {
							'@type': 'Service',
							serviceType: 'Фриланс платформа для заказчиков',
							provider: {
								'@type': 'Organization',
								name: 'NESI',
							},
							areaServed: 'RU',
							availableChannel: {
								'@type': 'ServiceChannel',
								serviceUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/tasks/new`,
							},
						},
					}),
				}}
			/>
		</>
	)
}

