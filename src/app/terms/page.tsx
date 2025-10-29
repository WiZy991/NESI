'use client'

import Link from 'next/link'

export default function TermsPage() {
	return (
		<div className='max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
			{/* Заголовок */}
			<div className='mb-8 sm:mb-12 text-center'>
				<h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold text-emerald-400 mb-4'>
					Пользовательское соглашение
				</h1>
				<p className='text-gray-400 text-sm sm:text-base'>
					Последнее обновление: 27 октября 2025 г.
				</p>
			</div>

			{/* Основной контент */}
			<div className='space-y-6 sm:space-y-8'>
				{/* Термины */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						1. Термины и определения
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed text-sm sm:text-base'>
						<p>
							<strong className='text-emerald-400'>Администрация</strong> — ООО
							«НЭСИ» (ИНН: 2205021414), предоставляющее Платформу.
						</p>
						<p>
							<strong className='text-emerald-400'>Пользователь</strong> —
							физическое или юридическое лицо, использующее Платформу.
						</p>
						<p>
							<strong className='text-emerald-400'>Заказчик</strong> —
							Пользователь, размещающий задачи на Платформе.
						</p>
						<p>
							<strong className='text-emerald-400'>Исполнитель</strong> —
							Пользователь, выполняющий задачи на Платформе.
						</p>
						<p>
							<strong className='text-emerald-400'>Платформа</strong> — веб-сайт
							и мобильное приложение NESI.
						</p>
						<p>
							<strong className='text-emerald-400'>Задача</strong> — проект,
							размещённый Заказчиком для выполнения Исполнителем.
						</p>
					</div>
				</div>

				{/* Принятие условий */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						2. Принятие условий
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>
							Настоящее Пользовательское соглашение (далее — «Соглашение»)
							определяет условия использования Платформы NESI.
						</p>
						<p>Регистрируясь на Платформе, вы подтверждаете, что:</p>
						<ul className='list-disc pl-6 space-y-2'>
							<li>
								Вам исполнилось 18 лет, либо вы получили согласие законных
								представителей
							</li>
							<li>
								Вы ознакомились с настоящим Соглашением и принимаете все его
								условия
							</li>
							<li>Предоставленная вами информация является достоверной</li>
							<li>
								Вы несёте полную ответственность за действия, совершённые под
								вашим аккаунтом
							</li>
						</ul>
					</div>
				</div>

				{/* Оплата и комиссия */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						3. Оплата и комиссия
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>
							<strong className='text-emerald-400'>Порядок оплаты:</strong>
						</p>
						<ul className='list-disc pl-6 space-y-2'>
							<li>
								Пополнение баланса осуществляется через платёжный провайдер
								YooKassa
							</li>
							<li>
								При создании задачи средства резервируются на балансе Заказчика
							</li>
							<li>После выполнения задачи средства переводятся Исполнителю</li>
						</ul>
						<p className='mt-4'>
							<strong className='text-emerald-400'>Комиссия:</strong>
						</p>
						<p>
							Платформа взимает комиссию в размере 20% с каждой завершённой
							задачи. Комиссия автоматически вычитается при переводе средств
							Исполнителю.
						</p>
						<p className='text-sm text-gray-400 mt-3'>
							Пример: при цене задачи 1000 ₽, Исполнитель получает 800 ₽,
							Платформа получает 200 ₽.
						</p>
					</div>
				</div>

				{/* Обязанности пользователей */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						4. Обязанности пользователей
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>
							<strong className='text-emerald-400'>
								Обязанности Заказчика:
							</strong>
						</p>
						<ul className='list-disc pl-6 space-y-2'>
							<li>Предоставлять полную и достоверную информацию о задаче</li>
							<li>Своевременно пополнять баланс для оплаты задач</li>
							<li>Проверять качество выполненной работы</li>
							<li>Использовать систему разрешения споров при конфликтах</li>
						</ul>
						<p className='mt-4'>
							<strong className='text-emerald-400'>
								Обязанности Исполнителя:
							</strong>
						</p>
						<ul className='list-disc pl-6 space-y-2'>
							<li>Проходить сертификацию в выбранных категориях</li>
							<li>Выполнять задачи качественно и в установленные сроки</li>
							<li>Соблюдать профессиональную этику</li>
							<li>Не принимать задачи, если недостаточно опыта или ресурсов</li>
						</ul>
					</div>
				</div>

				{/* Спам и запрещённые действия */}
				<div className='bg-black/40 border border-red-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(239,68,68,0.1)]'>
					<h2 className='text-2xl font-bold text-red-400 mb-4'>
						5. Запрещённые действия
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>Запрещается:</p>
						<ul className='list-disc pl-6 space-y-2'>
							<li>Обход системы комиссии (прямые переводы вне Платформы)</li>
							<li>Размещение недостоверной информации</li>
							<li>Использование чужих данных для регистрации</li>
							<li>Публикация спама или вредоносного контента</li>
							<li>
								Незаконное использование объектов интеллектуальной собственности
							</li>
							<li>Выдача себя за другого пользователя или компанию</li>
							<li>Попытки взлома или нарушения работы Платформы</li>
						</ul>
						<p className='text-red-400 text-sm mt-4'>
							⚠️ Нарушение данных правил может привести к блокировке аккаунта
							без возврата средств.
						</p>
					</div>
				</div>

				{/* Споры */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						6. Разрешение споров
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>В случае возникновения спора между Заказчиком и Исполнителем:</p>
						<ul className='list-disc pl-6 space-y-2'>
							<li>
								Администрация предоставляет систему разрешения споров на
								Платформе
							</li>
							<li>
								Решение администрации является окончательным и обязательным для
								сторон
							</li>
							<li>
								При невозможности разрешения спора на Платформе стороны вправе
								обратиться в суд
							</li>
						</ul>
					</div>
				</div>

				{/* Ответственность */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						7. Ответственность сторон
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>
							<strong className='text-emerald-400'>
								Администрация Платформы:
							</strong>
						</p>
						<ul className='list-disc pl-6 space-y-2'>
							<li>Обеспечивает техническую работоспособность Платформы</li>
							<li>
								Обеспечивает сохранность персональных данных согласно Политике
								конфиденциальности
							</li>
							<li>
								НЕ несёт ответственности за содержание и качество выполненных
								задач
							</li>
							<li>НЕ несёт ответственности за действия третьих лиц</li>
						</ul>
						<p className='mt-4'>
							<strong className='text-emerald-400'>Пользователь:</strong>
						</p>
						<ul className='list-disc pl-6 space-y-2'>
							<li>
								Несёт полную ответственность за достоверность предоставленной
								информации
							</li>
							<li>
								Несёт ответственность за все действия, совершённые под его
								аккаунтом
							</li>
							<li>Возмещает ущерб в случае причинения вреда третьим лицам</li>
						</ul>
					</div>
				</div>

				{/* Изменение соглашения */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						8. Изменение Соглашения
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>
							Администрация оставляет за собой право вносить изменения в
							настоящее Соглашение. О существенных изменениях Пользователи
							уведомляются через Платформу.
						</p>
						<p>
							Изменения вступают в силу с момента опубликования на Платформе.
							Продолжение использования Платформы после изменений означает
							принятие новых условий.
						</p>
					</div>
				</div>

				{/* Контакты */}
				<div className='bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.2)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						9. Контакты
					</h2>
					<div className='space-y-3 text-gray-300'>
						<p>
							<strong className='text-emerald-400'>ООО «НЭСИ»</strong>
						</p>
						<p>ИНН: 2205021414</p>
						<p>
							<strong className='text-emerald-400'>Email:</strong>{' '}
							<a
								href='mailto:info@nesi.ru'
								className='text-emerald-400 hover:underline'
							>
								info@nesi.ru
							</a>
						</p>
						<p className='text-sm text-gray-400'>
							По всем вопросам работы Платформы обращайтесь по указанному адресу
							электронной почты.
						</p>
					</div>
				</div>

				{/* Навигация */}
				<div className='flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-800'>
					<Link
						href='/privacy'
						className='flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition'
					>
						<span>←</span>
						<span>Политика конфиденциальности</span>
					</Link>
					<Link
						href='/offer'
						className='flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition'
					>
						<span>Публичная оферта</span>
					</Link>
					<Link
						href='/'
						className='flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition'
					>
						<span>На главную →</span>
					</Link>
				</div>
			</div>
		</div>
	)
}
