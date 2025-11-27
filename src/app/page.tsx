import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'Фриланс платформа NESI | Найти работу и исполнителя',
	description:
		'NESI — фриланс платформа для поиска удаленной работы и найма специалистов. Каталог задач, проверенные исполнители, безопасные платежи. Начните работать уже сегодня!',
	keywords: [
		'фриланс',
		'фриланс платформа',
		'найти исполнителя',
		'найти работу',
		'удаленная работа',
		'работа на дому',
		'фриланс биржа',
		'каталог задач',
		'найти специалиста',
		'фриланс проекты',
		'удаленная работа вакансии',
		'работа фрилансером',
	],
	openGraph: {
		title: 'Фриланс платформа NESI | Найти работу и исполнителя',
		description:
			'NESI — фриланс платформа для поиска удаленной работы и найма специалистов. Каталог задач, проверенные исполнители, безопасные платежи.',
		type: 'website',
		url: process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su',
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
		title: 'Фриланс платформа NESI | Найти работу и исполнителя',
		description:
			'NESI — фриланс платформа для поиска удаленной работы и найма специалистов. Каталог задач, проверенные исполнители.',
		images: ['/og-image.png'],
	},
	alternates: {
		canonical: '/',
	},
}

export default function Home() {
	return (
		<div
			className='w-full min-h-screen relative overflow-x-hidden'
			style={{
				fontFamily: "'Inter', 'Poppins', system-ui, -apple-system, sans-serif",
				background:
					'radial-gradient(80% 100% at 100% 50%, rgba(0, 255, 205, 0.15) 0%, rgba(58, 57, 57, 0) 100%), linear-gradient(0deg, rgb(10, 20, 15) 0%, rgb(5, 15, 10) 100%)',
			}}
		>
			{/* TOP HEADER */}
			<div className='w-full h-auto flex flex-col md:flex-row items-center justify-between px-3 sm:px-6 py-4 md:py-0 md:h-30 relative z-50 mx-auto gap-4 md:gap-0'>
				{/* Logo */}
				<div
					className='text-4xl sm:text-5xl md:text-7xl font-bold tracking-[5px] md:tracking-[10px]'
					style={{
						color: '#00ffcd',
						textShadow: '0px 0px 10px #00ffcd',
					}}
				>
					NESI
				</div>

				{/* Center subtitle with auth button inside */}
				<div
					className='flex-1 w-full md:w-auto md:mx-8 h-auto md:h-25 flex flex-col md:flex-row items-center justify-between px-3 sm:px-6 py-3 md:py-0 rounded-md relative gap-3 md:gap-0'
					style={{
						background:
							'linear-gradient(270deg, rgba(4, 255, 205, 0.3) 0%, rgba(5, 15, 10, 0.2) 60%)',
					}}
				>
					<span
						className='text-xs sm:text-sm md:text-m w-full md:w-2/3 h-auto md:h-15 px-3 sm:px-4 py-2 md:py-0 flex items-center justify-center rounded-lg font-bold text-center'
						style={{
							color: '#ffffff',
							letterSpacing: '1px',
							border: '1px solid rgba(0, 255, 205, 0.5)',
							boxShadow: '0 0 12px rgba(0, 255, 205, 0.3)',
						}}
					>
						Платформа для заказчиков и исполнителей
					</span>

					{/* Auth button */}
					<div
						className='w-full md:w-auto h-auto md:h-15 px-3 sm:px-4 py-2 md:py-0 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-300 hover:translate-y-[-1px] font-bold'
						style={{
							background:
								'linear-gradient(0deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), linear-gradient(0deg, rgba(0, 255, 205, 0.3), rgba(0, 255, 205, 0.3))',
							border: '1px solid rgba(0, 255, 205, 0.5)',
							boxShadow: '0 0 12px rgba(0, 255, 205, 0.3)',
						}}
					>
						<span
							className='text-xs sm:text-sm md:text-m whitespace-nowrap'
							style={{
								color: '#ffffff',
								letterSpacing: '1px',
							}}
						>
							<a href='/login'>Вход</a> или <a href='/register'>Регистрация</a>
						</span>
					</div>
				</div>
			</div>

			{/* MAIN CONTENT */}
			<div className='relative w-full px-3 sm:px-6 py-6 md:py-8'>
				{/* Decorative Snake - left side (скрыта на мобильных) */}
				<div className='hidden lg:block absolute left-0 top-2/4 -translate-y-1/2 w-2/4 h-auto opacity-75 pointer-events-none'>
					<Image
						src='/nesi_snake.svg'
						alt='Декоративное изображение платформы NESI'
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

				{/* Content Grid */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 w-full lg:w-[90%] mx-auto relative z-10 items-start'>
					{/* Left Column */}
					<div className='space-y-4 sm:space-y-6'>
						<div
							className='p-4 sm:p-6 rounded-xl'
							style={{
								backgroundColor: 'transparent',
								border: '1px solid rgba(0, 255, 205, 0.3)',
								boxShadow: '0 0 25px rgba(0, 255, 205, 0.5)',
							}}
						>
							<p
								className='text-sm sm:text-base md:text-lg lg:text-xl text-center leading-relaxed'
								style={{
									color: '#00ffcd',
									letterSpacing: '1px',
								}}
							>
								Мы новая цифровая экосистема, где бизнес встречает настоящие
								таланты.
								<br />
								<br />
								Каждый исполнитель проходит сертификацию, а заказчик получает
								гарантированный результат.
							</p>
						</div>
					</div>

					{/* Right Column */}
					<div className='space-y-4 sm:space-y-6 md:space-y-8 transform translate-x-0 md:translate-x-10 translate-y-0 md:-translate-y-6 scale-100 md:scale-[1.22] origin-top-right'>
						<div className='grid grid-cols-1 gap-4'>
							<div className='aspect-[5/4] rounded-xl overflow-hidden relative'>
								<Image
									src='/anime_images.svg'
									alt='Иллюстрация платформы NESI для бизнеса и талантов'
									fill
									className='object-contain'
									priority={false}
									loading='lazy'
								/>
							</div>
						</div>

						<div
							className='p-4 sm:p-6 md:p-8 rounded-xl'
							style={{
								backgroundColor: 'transparent',
								border: '1px solid rgba(0, 255, 205, 0.4)',
								boxShadow: '0 0 40px rgba(0, 255, 205, 0.7)',
							}}
						>
							<p
								className='text-sm sm:text-base md:text-lg lg:text-xl text-center leading-relaxed'
								style={{
									color: '#00ffcd',
									letterSpacing: '1px',
								}}
							>
								Мы создаём пространство, где технологии соединяют людей и
								возможности.
								<br />
								<br />
								Здесь ценится результат — точный, быстрый, проверенный.
								<br />
								<br />
								Каждый проект становится частью цифрового потока, управляемого
								интеллектом и доверием.
								<br />
								<br />
								Это не просто обмен задачами — это новая форма взаимодействия в
								IT-мире.
							</p>
						</div>
					</div>
				</div>

				{/* FOOTER */}
				<div className='w-full h-auto flex flex-col md:flex-row items-center justify-between px-3 sm:px-6 relative z-50 mx-auto mt-12 sm:mt-20 md:mt-40 lg:mt-80 mb-8 sm:mb-12 md:mb-20 gap-6 md:gap-0'>
					<div
						className='text-4xl sm:text-5xl md:text-7xl font-bold tracking-[5px] md:tracking-[10px]'
						style={{
							color: '#00ffcd',
							textShadow: '0px 0px 10px #00ffcd',
						}}
					>
						NESI
					</div>
					<div
						className='flex-1 w-full md:w-auto md:mx-8 h-auto md:h-60 flex items-center justify-center md:justify-end px-3 sm:px-6 py-4 md:py-0 rounded-md relative gap-4 md:gap-10'
						style={{
							background:
								'linear-gradient(270deg, rgba(4, 255, 205, 0.3) 0%, rgba(5, 15, 10, 0.2) 60%)',
						}}
					>
						<div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full md:w-7/8'>
							{[
								{ text: 'О проекте', href: '/about' },
								{ text: 'Политика конфиденциальности', href: '/privacy' },
								{ text: 'Пользовательское соглашение', href: '/terms' },
								{ text: 'Публичная оферта', href: '/offer' },
								{ text: 'Служба поддержки', href: 'mailto:info.nesi@bk.ru' },
							].map(({ text, href }) => (
								<Link
									key={text}
									href={href}
									className='h-auto md:h-15 px-2 sm:px-3 py-2 md:py-0 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-300 hover:translate-y-[-1px] font-bold'
									style={{
										border: '1px solid rgba(0, 255, 205, 0.5)',
										boxShadow: '0 0 12px rgba(0, 255, 205, 0.3)',
									}}
								>
									<span className='text-xs sm:text-sm md:text-m text-white tracking-[1px] md:tracking-[3px] text-center'>
										{text}
									</span>
								</Link>
							))}
						</div>
					</div>
				</div>
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
									urlTemplate: `${
										process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
									}/tasks?search={search_term_string}`,
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
