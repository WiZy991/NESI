import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Политика конфиденциальности — NESI',
	description: 'Политика конфиденциальности платформы NESI. Узнайте, как мы собираем, используем и защищаем ваши персональные данные. Прозрачность и безопасность данных пользователей.',
	keywords: [
		'политика конфиденциальности',
		'защита данных',
		'персональные данные',
		'конфиденциальность',
		'безопасность данных',
	],
	openGraph: {
		title: 'Политика конфиденциальности — NESI',
		description: 'Политика конфиденциальности платформы NESI. Узнайте, как мы собираем, используем и защищаем ваши персональные данные.',
		type: 'website',
	},
	alternates: {
		canonical: '/privacy',
	},
}

export default function PrivacyLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <>{children}</>
}

