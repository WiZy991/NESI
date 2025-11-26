import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'О проекте NESI — Фриланс платформа для заказчиков и исполнителей',
	description: 'Узнайте больше о платформе NESI — современной фриланс платформе для заказчиков и исполнителей. Система сертификации, безопасные платежи, эскроу, сообщество.',
	keywords: [
		'о проекте NESI',
		'о платформе',
		'фриланс платформа',
		'NESI',
	],
	openGraph: {
		title: 'О проекте NESI',
		description: 'Узнайте больше о платформе NESI — современной фриланс платформе для заказчиков и исполнителей.',
		type: 'website',
	},
	alternates: {
		canonical: '/about',
	},
}

export default function AboutLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <>{children}</>
}

