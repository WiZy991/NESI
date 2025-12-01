import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Создать задачу',
	description: 'Создайте новую задачу на платформе NESI',
	robots: {
		index: false,
		follow: false,
	},
}

export default function CreateTaskLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <>{children}</>
}

