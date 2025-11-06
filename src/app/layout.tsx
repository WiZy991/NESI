// app/layout.tsx (серверный)
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import LayoutClient from './LayoutClient'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
	title: 'NESI',
	description: 'Платформа NESI — задачи, специалисты и сертификация',
	icons: {
		icon: '/favicon.ico',
		shortcut: '/favicon-32x32.png',
		apple: '/apple-touch-icon.png',
	},
	manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
	themeColor: '#111827',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang='ru' className='h-full'>
			<head>
				{/* Можно добавить meta-иконки для старых браузеров */}
				<link rel='icon' href='/favicon.ico' sizes='any' />
				<link
					rel='icon'
					type='image/png'
					sizes='32x32'
					href='/favicon-32x32.png'
				/>
				<link
					rel='icon'
					type='image/png'
					sizes='16x16'
					href='/favicon-16x16.png'
				/>
				<link rel='apple-touch-icon' href='/apple-touch-icon.png' />
				<link rel='manifest' href='/site.webmanifest' />
				<meta name='theme-color' content='#111827' />
				<meta name='apple-mobile-web-app-status-bar-style' content='black-translucent' />
				<meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' />
			</head>
			<body className={`${inter.variable} antialiased h-full overflow-hidden`}>
				<LayoutClient>{children}</LayoutClient>
			</body>
		</html>
	)
}
