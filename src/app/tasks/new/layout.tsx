import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Создать задачу | NESI',
	description: 'Создайте новую задачу на платформе NESI',
	robots: {
		index: false,
		follow: false,
		googleBot: {
			index: false,
			follow: false,
		},
	},
	openGraph: {
		title: 'Создать задачу',
		description: 'Создайте новую задачу на платформе NESI',
		robots: 'noindex, nofollow',
	},
}

export default function CreateTaskLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<>
			{/* Явные meta-теги для полного закрытия от индексации */}
			<meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
			<meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
			<meta name="yandex" content="noindex, nofollow" />
			{children}
		</>
	)
}

