'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import EmailLink from './EmailLink'

export default function Footer() {
	const currentYear = new Date().getFullYear()

	return (
		<footer
			className='relative mt-20 border-t border-emerald-500/20 bg-black/60 backdrop-blur-md'
			role='contentinfo'
		>
			{/* Градиентный фон */}
			<div className='absolute inset-0 bg-gradient-to-t from-emerald-900/10 to-transparent' />

			<div className='relative max-w-screen-xl mx-auto px-4 py-12 md:px-8'>
				<div className='grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-8'>
					{/* О компании */}
					<div className='space-y-4'>
						<h3 className='text-xl font-bold text-emerald-400'>NESI</h3>
						<p className='text-gray-400 text-sm leading-relaxed'>
							Платформа для заказчиков и исполнителей в сфере IT и цифровых
							услуг. Создаём пространство, где бизнес встречает настоящие
							таланты.
						</p>
						{/* Социальные сети */}
						<div className='flex gap-3'>
							<EmailLink
								email='info.nesi@bk.ru'
								className='w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors'
							>
								<Mail className='w-5 h-5' />
							</EmailLink>
						</div>
					</div>

					{/* Быстрые ссылки */}
					<div className='space-y-4'>
						<h4 className='text-lg font-semibold text-white'>Платформа</h4>
						<ul className='space-y-2'>
							<li>
								<Link
									href='/tasks'
									className='text-gray-400 hover:text-emerald-400 transition-colors text-sm'
								>
									Каталог задач
								</Link>
							</li>
							<li>
								<Link
									href='/specialists'
									className='text-gray-400 hover:text-emerald-400 transition-colors text-sm'
								>
									Подиум исполнителей
								</Link>
							</li>
							<li>
								<Link
									href='/community'
									className='text-gray-400 hover:text-emerald-400 transition-colors text-sm'
								>
									Сообщество
								</Link>
							</li>
							<li>
								<Link
									href='/about'
									className='text-gray-400 hover:text-emerald-400 transition-colors text-sm'
								>
									О нас
								</Link>
							</li>
						</ul>
					</div>

					{/* Поддержка */}
					<div className='space-y-4'>
						<h4 className='text-lg font-semibold text-white'>Поддержка</h4>
						<ul className='space-y-2'>
							<li>
								<Link
									href='/faq'
									className='text-gray-400 hover:text-emerald-400 transition-colors text-sm'
								>
									Часто задаваемые вопросы
								</Link>
							</li>
							<li>
								<Link
									href='/privacy'
									className='text-gray-400 hover:text-emerald-400 transition-colors text-sm'
								>
									Политика конфиденциальности
								</Link>
							</li>
							<li>
								<Link
									href='/terms'
									className='text-gray-400 hover:text-emerald-400 transition-colors text-sm'
								>
									Условия использования
								</Link>
							</li>
							<li>
								<EmailLink
									email='info.nesi@bk.ru'
									className='text-gray-400 hover:text-emerald-400 transition-colors text-sm'
								/>
							</li>
						</ul>
					</div>

					{/* Контакты */}
					<div className='space-y-4'>
						<h4 className='text-lg font-semibold text-white'>Контакты</h4>
						<ul className='space-y-2 text-sm text-gray-400'>
							<li>
								<p className='font-medium text-white'>ООО «НЭСИ»</p>
								<p>ИНН: 2205021414</p>
							</li>
							<li className='flex items-center gap-2'>
								<Mail className='w-4 h-4 text-emerald-400' />
								<EmailLink
									email='info.nesi@bk.ru'
									className='hover:text-emerald-400 transition-colors'
								/>
							</li>
						</ul>
					</div>
				</div>

				{/* Разделитель */}
				<div className='border-t border-emerald-500/20 pt-8'>
					<div className='flex flex-col md:flex-row justify-between items-center gap-4'>
						{/* Копирайт */}
						<p className='text-gray-400 text-sm text-center md:text-left'>
							© {currentYear} NESI. Все права защищены.
						</p>

						{/* Дополнительные ссылки */}
						<div className='flex gap-6 text-sm'>
							<Link
								href='/privacy'
								className='text-gray-400 hover:text-emerald-400 transition-colors'
							>
								Конфиденциальность
							</Link>
							<Link
								href='/terms'
								className='text-gray-400 hover:text-emerald-400 transition-colors'
							>
								Условия
							</Link>
							<Link
								href='/about'
								className='text-gray-400 hover:text-emerald-400 transition-colors'
							>
								О нас
							</Link>
						</div>
					</div>
				</div>
			</div>

			{/* Декоративные элементы */}
			<div className='absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent' />
		</footer>
	)
}
