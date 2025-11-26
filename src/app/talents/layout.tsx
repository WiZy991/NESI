import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Для исполнителей — Найти удаленную работу, фриланс проекты | NESI',
	description: 'Найдите удаленную работу и фриланс проекты на платформе NESI. Получайте оплату безопасно, развивайте навыки через сертификацию, стройте карьеру фрилансера. Работа на дому, удаленная работа онлайн.',
	keywords: [
		'удаленная работа',
		'работа на дому',
		'фриланс работа',
		'найти работу',
		'удаленная работа вакансии',
		'работа фрилансером',
		'фриланс проекты',
		'удаленная работа онлайн',
		'работа из дома',
		'фриланс для исполнителей',
		'найти проект',
		'работа удаленно',
		'фриланс вакансии',
		'удаленная работа для специалистов',
		'работа онлайн',
		'фриланс биржа',
	],
	openGraph: {
		title: 'Для исполнителей — Найти удаленную работу на NESI',
		description: 'Найдите удаленную работу и фриланс проекты. Получайте оплату безопасно, развивайте навыки через сертификацию.',
		type: 'website',
	},
	alternates: {
		canonical: '/talents',
	},
}

export default function TalentsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<>
			{children}
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'WebPage',
						name: 'Для исполнителей — NESI',
						description: 'Найдите удаленную работу и фриланс проекты на платформе NESI',
						url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/talents`,
						mainEntity: {
							'@type': 'JobPosting',
							title: 'Удаленная работа и фриланс проекты',
							description: 'Найдите удаленную работу и фриланс проекты. Получайте оплату безопасно, развивайте навыки.',
							employmentType: 'CONTRACTOR',
							jobLocation: {
								'@type': 'Place',
								address: {
									'@type': 'PostalAddress',
									addressCountry: 'RU',
								},
							},
							hiringOrganization: {
								'@type': 'Organization',
								name: 'NESI',
							},
						},
					}),
				}}
			/>
		</>
	)
}

