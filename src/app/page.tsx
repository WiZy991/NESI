import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Главная — Фриланс платформа NESI для заказчиков и исполнителей',
	description: 'NESI — современная фриланс платформа для поиска удаленной работы и найма специалистов. Создавайте задачи, находите исполнителей, работайте удаленно. Безопасные платежи, система эскроу.',
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
	],
	openGraph: {
		title: 'NESI — Фриланс платформа для заказчиков и исполнителей',
		description: 'Современная фриланс платформа для поиска удаленной работы и найма специалистов. Безопасные платежи, система эскроу.',
		type: 'website',
	},
}

export default function Home() {
	return (
		<div
			className='w-full min-h-screen relative overflow-x-hidden'
			style={{
				fontFamily: "'Inter', 'Poppins', system-ui, -apple-system, sans-serif",
			}}
		>
			{/* Background Effects */}
			<div className='fixed inset-0 -z-10'>
				<div className='absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black'></div>
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,205,0.1),transparent_50%)]'></div>
				<div className='absolute inset-0'>
					<div className='absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl'></div>
					<div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl'></div>
				</div>
			</div>

			{/* MAIN CONTENT */}
			<div className='relative w-full px-3 sm:px-6 py-6 md:py-8'>
				{/* Decorative Snake - left side (скрыта на мобильных) */}
				<div className='hidden lg:block absolute left-0 top-2/4 -translate-y-1/2 w-2/4 h-auto opacity-75 pointer-events-none'>
					<Image
						src='/nesi_snake.svg'
						alt=''
						width={400}
						height={600}
						className='w-full h-auto'
						priority={false}
						loading='lazy'
						aria-hidden='true'
					/>
				</div>

				{/* Main Title */}
				<div className='text-center mb-6 sm:mb-8 relative z-10'>
					<p
						className='text-xs sm:text-sm md:text-base lg:text-m mb-4 sm:mb-6 md:mb-10 px-2'
						style={{
							color: '#00ffcd',
							letterSpacing: '2px',
							lineHeight: '1.6',
						}}
					>
						НЕСИ — это свежее дыхание в сфере цифровых платформ, объединяющее:
					</p>
					<h1
						className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-8 sm:mb-12 md:mb-20 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 flex-wrap px-2'
						style={{
							color: '#ffffff',
							letterSpacing: '2px',
						}}
					>
						<a
							href='/business'
							className='w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-emerald-400/50 rounded-xl shadow-[0_0_20px_rgba(0,255,205,0.3)] hover:shadow-[0_0_30px_rgba(0,255,205,0.6)] hover:bg-emerald-500/10 hover:text-emerald-300 transition-all duration-300'
						>
							БИЗНЕС
						</a>
						<span className='text-xl sm:text-2xl md:text-3xl text-emerald-300 mx-2'>
							и
						</span>
						<a
							href='/talents'
							className='w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-emerald-400/50 rounded-xl shadow-[0_0_20px_rgba(0,255,205,0.3)] hover:shadow-[0_0_30px_rgba(0,255,205,0.6)] hover:bg-emerald-500/10 hover:text-emerald-300 transition-all duration-300'
						>
							ТАЛАНТЫ
						</a>
					</h1>
				</div>

				{/* Content Sections */}
				<div className='max-w-6xl mx-auto space-y-8 sm:space-y-12 relative z-10'>
					{/* Business Section */}
					<section className='bg-black/40 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 sm:p-8 md:p-10 shadow-[0_0_30px_rgba(0,255,205,0.2)]'>
						<h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-emerald-400 mb-4 sm:mb-6'>
							Для Бизнеса
						</h2>
						<p className='text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-6'>
							Найдите профессиональных исполнителей для ваших задач. Размещайте проекты, получайте отклики от проверенных специалистов и работайте с гарантией качества.
						</p>
						<div className='flex flex-wrap gap-3 sm:gap-4'>
							<Link
								href='/business'
								className='px-4 sm:px-6 py-2 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-emerald-500/50 text-sm sm:text-base'
							>
								Создать задачу
							</Link>
							<Link
								href='/specialists'
								className='px-4 sm:px-6 py-2 sm:py-3 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 rounded-lg font-semibold transition-all text-sm sm:text-base'
							>
								Найти специалиста
							</Link>
						</div>
					</section>

					{/* Talents Section */}
					<section className='bg-black/40 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 sm:p-8 md:p-10 shadow-[0_0_30px_rgba(0,255,205,0.2)]'>
						<h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-emerald-400 mb-4 sm:mb-6'>
							Для Исполнителей
						</h2>
						<p className='text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-6'>
							Найдите удаленную работу и проекты, которые вам интересны. Получайте оплату безопасно, развивайте навыки через сертификацию и стройте карьеру фрилансера.
						</p>
						<div className='flex flex-wrap gap-3 sm:gap-4'>
							<Link
								href='/tasks'
								className='px-4 sm:px-6 py-2 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-emerald-500/50 text-sm sm:text-base'
							>
								Найти работу
							</Link>
							<Link
								href='/cert'
								className='px-4 sm:px-6 py-2 sm:py-3 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 rounded-lg font-semibold transition-all text-sm sm:text-base'
							>
								Пройти сертификацию
							</Link>
						</div>
					</section>
				</div>

				{/* Structured Data */}
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							'@context': 'https://schema.org',
							'@type': 'WebSite',
							name: 'NESI',
							description: 'Фриланс платформа для заказчиков и исполнителей',
							url: process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su',
							potentialAction: {
								'@type': 'SearchAction',
								target: {
									'@type': 'EntryPoint',
									urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'}/tasks?search={search_term_string}`,
								},
								'query-input': 'required name=search_term_string',
							},
						}),
					}}
				/>
			</div>
		</div>
	)
}
