'use client'

import Link from 'next/link'

export default function AboutPage() {
	return (
		<div className='max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
			{/* Заголовок */}
			<div className='mb-8 sm:mb-12 text-center'>
				<h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold text-emerald-400 mb-4'>
					О проекте
				</h1>
				<p className='text-gray-400 text-sm sm:text-base'>
					Платформа для заказчиков и исполнителей
				</p>
			</div>

			{/* Основной контент */}
			<div className='space-y-6 sm:space-y-8'>
				{/* Введение */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4 flex items-center gap-3'>
						<span className='text-3xl'>🚀</span>
						Что такое NESI?
					</h2>
					<p className='text-gray-300 leading-relaxed text-base sm:text-lg'>
						NESI — это современная цифровая платформа, которая объединяет
						заказчиков и исполнителей в сфере IT и цифровых услуг. Мы создаём
						пространство, где бизнес встречает настоящие таланты, а каждое
						взаимодействие основано на профессионализме и доверии.
					</p>
				</div>

				{/* Миссия */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4 flex items-center gap-3'>
						<span className='text-3xl'>💎</span>
						Наша миссия
					</h2>
					<p className='text-gray-300 leading-relaxed text-base sm:text-lg mb-4'>
						Мы стремимся создать экосистему, где каждый проект получает
						качественное выполнение, а каждый исполнитель — достойное
						вознаграждение за свой труд.
					</p>
					<ul className='space-y-3 text-gray-300'>
						<li className='flex items-start gap-3'>
							<span className='text-emerald-400 text-xl'>✓</span>
							<span>Прозрачность и честность во всех транзакциях</span>
						</li>
						<li className='flex items-start gap-3'>
							<span className='text-emerald-400 text-xl'>✓</span>
							<span>Гарантия качества через систему сертификации</span>
						</li>
						<li className='flex items-start gap-3'>
							<span className='text-emerald-400 text-xl'>✓</span>
							<span>Безопасность всех операций и данных</span>
						</li>
						<li className='flex items-start gap-3'>
							<span className='text-emerald-400 text-xl'>✓</span>
							<span>Поддержка и развитие сообщества</span>
						</li>
					</ul>
				</div>

				{/* Особенности */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-6 flex items-center gap-3'>
						<span className='text-3xl'>⭐</span>
						Особенности платформы
					</h2>
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
						<div className='bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4'>
							<h3 className='text-lg font-semibold text-emerald-400 mb-2 flex items-center gap-2'>
								<span className='text-2xl'>🎓</span>
								Сертификация
							</h3>
							<p className='text-gray-300 text-sm'>
								Каждый исполнитель проходит обязательную сертификацию в
								выбранной категории
							</p>
						</div>
						<div className='bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4'>
							<h3 className='text-lg font-semibold text-emerald-400 mb-2 flex items-center gap-2'>
								<span className='text-2xl'>💰</span>
								Система оплаты
							</h3>
							<p className='text-gray-300 text-sm'>
								Удобное пополнение баланса через YooKassa и безопасные переводы
							</p>
						</div>
						<div className='bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4'>
							<h3 className='text-lg font-semibold text-emerald-400 mb-2 flex items-center gap-2'>
								<span className='text-2xl'>🛡️</span>
								Безопасность
							</h3>
							<p className='text-gray-300 text-sm'>
								Система эскроу для защиты средств и разрешение споров
							</p>
						</div>
						<div className='bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4'>
							<h3 className='text-lg font-semibold text-emerald-400 mb-2 flex items-center gap-2'>
								<span className='text-2xl'>💬</span>
								Комьюнити
							</h3>
							<p className='text-gray-300 text-sm'>
								Сообщество для общения, обмена опытом и поддержки друг друга
							</p>
						</div>
					</div>
				</div>

				{/* Контакты */}
				<div className='bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.2)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-6 flex items-center gap-3'>
						<span className='text-3xl'>📧</span>
						Контакты
					</h2>
					<div className='space-y-4 text-gray-300'>
						<div>
							<p className='font-semibold text-emerald-400 mb-1'>
								Наименование
							</p>
							<p>Общество с ограниченной ответственностью «НЭСИ»</p>
							<p className='text-sm text-gray-400'>ООО «НЭСИ»</p>
						</div>
						<div>
							<p className='font-semibold text-emerald-400 mb-1'>ИНН</p>
							<p>2205021414</p>
						</div>
						<div>
							<p className='font-semibold text-emerald-400 mb-1'>
								Электронная почта
							</p>
							<p>info@nesi.ru</p>
						</div>
					</div>
				</div>

				{/* Навигация */}
				<div className='flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-800'>
					<Link
						href='/'
						className='flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition'
					>
						<span>←</span>
						<span>На главную</span>
					</Link>
				</div>
			</div>
		</div>
	)
}
