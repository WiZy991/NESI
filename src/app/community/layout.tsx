import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Сообщество — Обсуждения, вопросы, помощь | NESI',
	description: 'Сообщество NESI — место для обсуждений, вопросов и помощи. Общайтесь с другими заказчиками и исполнителями, делитесь опытом, получайте советы по фрилансу и удаленной работе.',
	keywords: [
		'сообщество фрилансеров',
		'форум фриланс',
		'обсуждения',
		'вопросы фриланс',
		'помощь фрилансерам',
		'сообщество удаленной работы',
	],
	openGraph: {
		title: 'Сообщество NESI',
		description: 'Место для обсуждений, вопросов и помощи. Общайтесь с другими заказчиками и исполнителями.',
		type: 'website',
	},
	alternates: {
		canonical: '/community',
	},
}

export default function CommunityLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <>{children}</>
}

