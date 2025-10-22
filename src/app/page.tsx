'use client'
import Image from 'next/image'

export default function Home() {
	return (
		<div
			className="w-full min-h-screen relative overflow-x-hidden font-[Montserrat_Alternates,Helvetica,sans-serif]"
			style={{
				background:
					'radial-gradient(80% 100% at 100% 50%, rgba(0, 255, 205, 0.15) 0%, rgba(58, 57, 57, 0) 100%), linear-gradient(0deg, rgb(10, 20, 15) 0%, rgb(5, 15, 10) 100%)',
			}}
		>
			{/* TOP HEADER */}
			<div className="w-5/5 h-30 flex items-center justify-between px-6 relative z-50 mx-auto">
				{/* Logo */}
				<div
					className="text-7xl font-bold tracking-[10px]"
					style={{
						color: '#00ffcd',
						textShadow: '0px 0px 10px #00ffcd',
					}}
				>
					NESI
				</div>

				{/* Center subtitle with auth button inside */}
				<div
					className="flex-1 mx-8 h-25 flex items-center justify-between px-6 rounded-md relative"
					style={{
						background:
							'linear-gradient(270deg, rgba(4, 255, 205, 0.3) 0%, rgba(5, 15, 10, 0.2) 60%)',
					}}
				>
					<span
						className="text-m w-2/3 h-15 px-4 flex items-center justify-center rounded-lg font-bold"
						style={{
							color: '#ffffff',
							letterSpacing: '3px',
							border: '1px solid rgba(0, 255, 205, 0.5)',
							boxShadow: '0 0 12px rgba(0, 255, 205, 0.3)',
						}}
					>
						Платформа для заказчиков и исполнителей
					</span>

					{/* Auth button */}
					<div
						className="h-15 px-4 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-300 hover:translate-y-[-1px] font-bold"
						style={{
							background:
								'linear-gradient(0deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), linear-gradient(0deg, rgba(0, 255, 205, 0.3), rgba(0, 255, 205, 0.3))',
							border: '1px solid rgba(0, 255, 205, 0.5)',
							boxShadow: '0 0 12px rgba(0, 255, 205, 0.3)',
						}}
					>
						<span
							className="text-m whitespace-nowrap"
							style={{
								color: '#ffffff',
								letterSpacing: '3px',
							}}
						>
							<a href="/login">Вход</a> или{' '}
							<a href="/register">Регистрация</a>
						</span>
					</div>
				</div>
			</div>

			{/* MAIN CONTENT */}
			<div className="relative w-full px-6 py-8">
				{/* Decorative Snake - left side */}
				<div className="absolute left-0 top-2/4 -translate-y-1/2 w-2/4 h-auto opacity-75 pointer-events-none">
					<Image
						src="/nesi_snake.svg"
						alt="Decorative"
						width={400}
						height={600}
						className="w-full h-auto"
					/>
				</div>

				{/* Main Title */}
				<div className="text-center mb-8 relative z-10">
					<p
						className="text-m mb-4 mb-10"
						style={{
							color: '#00ffcd',
							letterSpacing: '5px',
							lineHeight: '1.6',
						}}
					>
						НЕСИ — это свежее дыхание в сфере цифровых платформ, объединяющее:
					</p>
					<h1
						className="text-5xl font-bold mb-20 flex items-center justify-center gap-4 flex-wrap"
						style={{
							color: '#ffffff',
							letterSpacing: '4px',
						}}
					>
						<a
							href="/business"
							className="px-6 py-3 border border-emerald-400/50 rounded-xl shadow-[0_0_20px_rgba(0,255,205,0.3)] hover:shadow-[0_0_30px_rgba(0,255,205,0.6)] hover:bg-emerald-500/10 hover:text-emerald-300 transition-all duration-300"
						>
							БИЗНЕС
						</a>
						<span className="text-3xl text-emerald-300 mx-2">и</span>
						<a
							href="/talents"
							className="px-6 py-3 border border-emerald-400/50 rounded-xl shadow-[0_0_20px_rgba(0,255,205,0.3)] hover:shadow-[0_0_30px_rgba(0,255,205,0.6)] hover:bg-emerald-500/10 hover:text-emerald-300 transition-all duration-300"
						>
							ТАЛАНТЫ
						</a>
					</h1>
				</div>

				{/* Content Grid */}
				<div className="grid grid-cols-2 gap-10 w-[90%] mx-auto relative z-10 items-start">
					{/* Left Column */}
					<div className="space-y-6">
						<div
							className="p-6 rounded-xl"
							style={{
								backgroundColor: 'transparent',
								border: '1px solid rgba(0, 255, 205, 0.3)',
								boxShadow: '0 0 25px rgba(0, 255, 205, 0.5)',
							}}
						>
							<p
								className="text-xl text-center leading-relaxed"
								style={{
									color: '#00ffcd',
									letterSpacing: '1.2px',
								}}
							>
								Мы не копия старых бирж, а новая цифровая экосистема, где бизнес
								встречает настоящие таланты.
								<br />
								<br />
								Каждый исполнитель проходит сертификацию, а заказчик получает
								гарантированный результат.
							</p>
						</div>
					</div>

					{/* Right Column - Enlarged More */}
					<div className="space-y-8 transform translate-x-10 -translate-y-6 scale-[1.22] origin-top-right">
						<div className="grid grid-cols-1 gap-4">
							<div className="aspect-[5/4] rounded-xl overflow-hidden relative">
								<Image
									src="/anime_images.svg"
									alt="Project preview"
									fill
									className="object-contain"
								/>
							</div>
						</div>

						<div
							className="p-8 rounded-xl"
							style={{
								backgroundColor: 'transparent',
								border: '1px solid rgba(0, 255, 205, 0.4)',
								boxShadow: '0 0 40px rgba(0, 255, 205, 0.7)',
							}}
						>
							<p
								className="text-xl text-center leading-relaxed"
								style={{
									color: '#00ffcd',
									letterSpacing: '1.5px',
								}}
							>
								Мы создаём пространство, где технологии соединяют людей и возможности.
								<br />
								<br />
								Здесь ценится не шум, а результат — точный, быстрый, проверенный.
								<br />
								<br />
								Каждый проект становится частью цифрового потока, управляемого интеллектом и доверием.
								<br />
								<br />
								Это не просто обмен задачами — это новая форма взаимодействия в IT-мире.
							</p>
						</div>
					</div>
				</div>

				{/* FOOTER */}
				<div className="w-5/5 h-28 flex items-center justify-between px-6 relative z-50 mx-auto mt-80 mb-20">
					<div
						className="text-7xl font-bold tracking-[10px]"
						style={{
							color: '#00ffcd',
							textShadow: '0px 0px 10px #00ffcd',
						}}
					>
						NESI
					</div>
					<div
						className="flex-1 mx-8 h-60 flex items-center justify-end px-6 rounded-md relative gap-10"
						style={{
							background:
								'linear-gradient(270deg, rgba(4, 255, 205, 0.3) 0%, rgba(5, 15, 10, 0.2) 60%)',
						}}
					>
						<div className="grid grid-cols-2 gap-3 w-7/8">
							{[
								'О проекте',
								'Политика конфиденциальности',
								'Пользовательское соглашение',
								'Служба поддержки',
							].map((text) => (
								<div
									key={text}
									className="h-15 px-3 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-300 hover:translate-y-[-1px] font-bold"
									style={{
										border: '1px solid rgba(0, 255, 205, 0.5)',
										boxShadow: '0 0 12px rgba(0, 255, 205, 0.3)',
									}}
								>
									<span className="text-m text-white tracking-[3px]">
										{text}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
