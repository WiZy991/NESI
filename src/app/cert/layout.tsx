import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Сертификация | NESI',
	description: 'Пройдите сертификацию на платформе NESI',
	robots: {
		index: false,
		follow: false,
		googleBot: {
			index: false,
			follow: false,
		},
	},
	openGraph: {
		title: 'Сертификация',
		description: 'Пройдите сертификацию на платформе NESI',
		robots: 'noindex, nofollow',
	},
}

export default function CertLayout({
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

