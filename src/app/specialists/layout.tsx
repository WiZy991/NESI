import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Подиум специалистов — Найти фрилансера и исполнителя',
	description: 'Каталог проверенных специалистов и фрилансеров на NESI. Найдите разработчика, дизайнера, маркетолога для вашего проекта. Рейтинги, отзывы, портфолио.',
	keywords: [
		'найти специалиста',
		'найти исполнителя',
		'подиум специалистов',
		'каталог фрилансеров',
		'найти разработчика',
		'найти дизайнера',
		'найти маркетолога',
		'найти копирайтера',
		'фрилансеры',
		'специалисты',
		'исполнители',
		'найм специалиста',
		'найти фрилансера',
	],
	openGraph: {
		title: 'Подиум специалистов — Найти фрилансера и исполнителя',
		description: 'Каталог проверенных специалистов и фрилансеров на NESI. Найдите разработчика, дизайнера, маркетолога для вашего проекта.',
		type: 'website',
		url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/specialists`,
		images: [
			{
				url: '/og-image.png',
				width: 1200,
				height: 630,
				alt: 'Подиум специалистов NESI',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Подиум специалистов — Найти фрилансера и исполнителя',
		description: 'Каталог проверенных специалистов и фрилансеров на NESI. Найдите разработчика, дизайнера, маркетолога для вашего проекта.',
		images: ['/og-image.png'],
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

