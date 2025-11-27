import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Пользовательское соглашение — NESI',
	description: 'Пользовательское соглашение платформы NESI. Условия использования сервиса, права и обязанности пользователей. Правила работы на фриланс платформе.',
	keywords: [
		'пользовательское соглашение',
		'условия использования',
		'правила платформы',
		'соглашение пользователя',
		'условия сервиса',
	],
	openGraph: {
		title: 'Пользовательское соглашение — NESI',
		description: 'Пользовательское соглашение платформы NESI. Условия использования сервиса, права и обязанности пользователей.',
		type: 'website',
	},
	alternates: {
		canonical: '/terms',
	},
}

export default function TermsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <>{children}</>
}

