import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Часто задаваемые вопросы (FAQ) — NESI',
	description: 'Ответы на популярные вопросы о платформе NESI: как работает система эскроу, сертификация, оплата, создание задач и поиск работы. Получите помощь и поддержку.',
	keywords: [
		'FAQ',
		'часто задаваемые вопросы',
		'помощь NESI',
		'вопросы о платформе',
		'поддержка',
		'как работает NESI',
		'система эскроу',
		'сертификация',
	],
	openGraph: {
		title: 'Часто задаваемые вопросы (FAQ) — NESI',
		description: 'Ответы на популярные вопросы о платформе NESI: как работает система эскроу, сертификация, оплата, создание задач и поиск работы.',
		type: 'website',
	},
	alternates: {
		canonical: '/faq',
	},
}

export default function FAQLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <>{children}</>
}

