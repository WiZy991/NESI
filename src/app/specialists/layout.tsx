import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Подиум исполнителей — Найти специалиста, фрилансера | NESI',
	description: 'Подиум исполнителей NESI — каталог проверенных специалистов и фрилансеров. Найдите разработчика, дизайнера, маркетолога или другого специалиста для вашего проекта. Рейтинги, отзывы, портфолио.',
	keywords: [
		'найти специалиста',
		'найти исполнителя',
		'подиум исполнителей',
		'каталог фрилансеров',
		'найти разработчика',
		'найти дизайнера',
		'найти маркетолога',
		'найти копирайтера',
		'фрилансеры',
		'специалисты',
		'исполнители',
		'найм специалиста',
	],
	openGraph: {
		title: 'Подиум исполнителей — Найти специалиста на NESI',
		description: 'Каталог проверенных специалистов и фрилансеров. Найдите разработчика, дизайнера, маркетолога для вашего проекта.',
		type: 'website',
	},
	alternates: {
		canonical: '/specialists',
	},
}

export default function SpecialistsLayout({
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
						name: 'Подиум исполнителей — NESI',
						description: 'Каталог проверенных специалистов и фрилансеров',
						url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/specialists`,
					}),
				}}
			/>
		</>
	)
}

