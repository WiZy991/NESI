import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Сертификация',
	description: 'Пройдите сертификацию на платформе NESI',
	robots: {
		index: false,
		follow: false,
	},
}

export default function CertLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <>{children}</>
}

