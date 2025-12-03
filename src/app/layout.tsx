// app/layout.tsx (серверный)
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Poppins } from 'next/font/google'
import Script from 'next/script'
import LayoutClient from './LayoutClient'
import './globals.css'

// Загружаем шрифты через Next.js font optimization (без внешних запросов)
const inter = Inter({
	subsets: ['latin', 'cyrillic'],
	variable: '--font-inter',
	display: 'swap',
})
const poppins = Poppins({
	weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
	subsets: ['latin'],
	variable: '--font-poppins',
	display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
	subsets: ['latin', 'cyrillic'],
	variable: '--font-mono',
	display: 'swap',
})

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'),
	title: {
		default: 'NESI — Фриланс платформа для заказчиков и исполнителей | Удаленная работа',
		template: '%s | NESI',
	},
	description: 'NESI — современная фриланс платформа для поиска удаленной работы и найма специалистов. Создавайте задачи, находите исполнителей, работайте удаленно. Безопасные платежи, система эскроу, сертификация специалистов.',
	keywords: [
		'фриланс',
		'удаленная работа',
		'работа на дому',
		'фрилансеры',
		'заказчики',
		'исполнители',
		'удаленная работа вакансии',
		'фриланс биржа',
		'найти исполнителя',
		'найти работу',
		'удаленная работа онлайн',
		'фриланс проекты',
		'заказать работу',
		'найти специалиста',
		'работа фрилансером',
		'удаленная работа для специалистов',
	],
	authors: [{ name: 'NESI' }],
	creator: 'NESI',
	publisher: 'NESI',
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	openGraph: {
		type: 'website',
		locale: 'ru_RU',
		url: process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su',
		siteName: 'NESI',
		title: 'NESI — Фриланс платформа для заказчиков и исполнителей',
		description: 'Современная фриланс платформа для поиска удаленной работы и найма специалистов. Безопасные платежи, система эскроу, сертификация.',
		images: [
			{
				url: '/og-image.png',
				width: 1200,
				height: 630,
				alt: 'NESI — Фриланс платформа',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'NESI — Фриланс платформа для заказчиков и исполнителей',
		description: 'Современная фриланс платформа для поиска удаленной работы и найма специалистов.',
		images: ['/og-image.png'],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	icons: {
		icon: '/favicon.ico',
		shortcut: '/favicon-32x32.png',
		apple: '/apple-touch-icon.png',
	},
	manifest: '/site.webmanifest',
	alternates: {
		canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su',
	},
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
		<html lang='ru'>
			<head>
				{/* Yandex.Metrika counter */}
				<Script
					id='yandex-metrika'
					strategy='afterInteractive'
					dangerouslySetInnerHTML={{
						__html: `
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=105621885', 'ym');

    ym(105621885, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});
						`,
					}}
				/>
				<noscript>
					<div>
						<img
							src='https://mc.yandex.ru/watch/105621885'
							style={{ position: 'absolute', left: '-9999px' }}
							alt=''
						/>
					</div>
				</noscript>
				{/* /Yandex.Metrika counter */}
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
				<meta
					name='apple-mobile-web-app-status-bar-style'
					content='black-translucent'
				/>
				<meta
					name='viewport'
					content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
				/>
			</head>
			<body
				className={`${inter.variable} ${poppins.variable} ${jetbrainsMono.variable} antialiased`}
			>
				<LayoutClient>{children}</LayoutClient>
			</body>
		</html>
	)
}
