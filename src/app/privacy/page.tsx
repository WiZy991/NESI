'use client'

import Link from 'next/link'

export default function PrivacyPage() {
	return (
		<div className='max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
			{/* Заголовок */}
			<div className='mb-8 sm:mb-12 text-center'>
				<h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold text-emerald-400 mb-4'>
					Политика конфиденциальности
				</h1>
				<p className='text-gray-400 text-sm sm:text-base'>
					Последнее обновление: 27 октября 2025 г.
				</p>
			</div>

			{/* Основной контент */}
			<div className='space-y-6 sm:space-y-8'>
				{/* Общие положения */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4 flex items-center gap-3'>
						<span className='text-3xl'>📋</span>
						1. Общие положения
					</h2>
					<div className='space-y-4 text-gray-300 leading-relaxed'>
						<p>
							Настоящая Политика конфиденциальности (далее — «Политика»)
							разработана в соответствии с Федеральным законом от 27.07.2006 №
							152-ФЗ «О персональных данных» и устанавливает правила обработки
							персональных данных пользователей сервиса NESI (далее — «Сервис»,
							«Платформа»).
						</p>
						<p>
							<strong className='text-emerald-400'>
								Администратор персональных данных:
							</strong>
						</p>
						<ul className='list-disc pl-6 space-y-2'>
							<li>ООО «НЭСИ» (ИНН: 2205021414)</li>
							<li>Адрес: Российская Федерация</li>
							<li>Электронная почта: info.nesi@bk.ru</li>
						</ul>
						<p>
							Используя Сервис, вы подтверждаете, что ознакомились с настоящей
							Политикой и соглашаетесь с условиями обработки ваших персональных
							данных.
						</p>
					</div>
				</div>

				{/* Персональные данные */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						2. Какие данные мы собираем
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>При использовании Сервиса мы можем собирать следующие данные:</p>
						<ul className='space-y-2'>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<div>
									<strong className='text-emerald-400'>
										Контактные данные:
									</strong>{' '}
									электронная почта, номер телефона (при необходимости)
								</div>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<div>
									<strong className='text-emerald-400'>
										Профильные данные:
									</strong>{' '}
									имя, фамилия, аватар, специализация
								</div>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<div>
									<strong className='text-emerald-400'>
										Финансовые данные:
									</strong>{' '}
									информация о платежах и транзакциях (обрабатывается платёжным
									провайдером YooKassa)
								</div>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<div>
									<strong className='text-emerald-400'>
										Технические данные:
									</strong>{' '}
									IP-адрес, данные о браузере и устройстве, история действий на
									платформе
								</div>
							</li>
						</ul>
					</div>
				</div>

				{/* Цели обработки */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						3. Цели обработки персональных данных
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<ul className='space-y-2'>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>Предоставление услуг платформы и функционала</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>Обработка платежей и управление балансом</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									Связь с пользователями по вопросам использования Сервиса
								</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									Улучшение качества Сервиса и разработка новых функций
								</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>Соблюдение требований законодательства</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									Обеспечение безопасности и предотвращение мошенничества
								</span>
							</li>
						</ul>
					</div>
				</div>

				{/* Защита данных */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						4. Меры защиты персональных данных
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>
							Мы принимаем необходимые правовые, организационные и технические
							меры для защиты ваших персональных данных:
						</p>
						<ul className='space-y-2'>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									<strong className='text-emerald-400'>
										Шифрование данных:
									</strong>{' '}
									передача данных осуществляется по защищённому протоколу HTTPS
								</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									<strong className='text-emerald-400'>
										Ограничение доступа:
									</strong>{' '}
									доступ к персональным данным имеют только уполномоченные лица
								</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									<strong className='text-emerald-400'>
										Резервное копирование:
									</strong>{' '}
									регулярное резервное копирование данных
								</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									<strong className='text-emerald-400'>
										Мониторинг безопасности:
									</strong>{' '}
									постоянный мониторинг безопасности систем
								</span>
							</li>
						</ul>
					</div>
				</div>

				{/* Права пользователей */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						5. Ваши права
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>Вы имеете право:</p>
						<ul className='space-y-2'>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									Получить информацию об обработке ваших персональных данных
								</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>Требовать уточнения неактуальных данных</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									Требовать удаления или блокировки обработки ваших данных
								</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>Отозвать согласие на обработку персональных данных</span>
							</li>
							<li className='flex items-start gap-2'>
								<span className='text-emerald-400'>•</span>
								<span>
									Обратиться с жалобой в уполномоченный орган по защите прав
									субъектов персональных данных
								</span>
							</li>
						</ul>
						<p className='mt-4 text-sm text-gray-400'>
							Для реализации ваших прав обращайтесь по адресу:{' '}
							<a
								href='mailto:info.nesi@bk.ru'
								className='text-emerald-400 hover:underline'
							>
								info@nesi.ru
							</a>
						</p>
					</div>
				</div>

				{/* Куки */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						6. Использование Cookies
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>
							Сервис использует файлы cookie для обеспечения работоспособности и
							улучшения качества услуг. Используя Сервис, вы соглашаетесь с
							использованием cookies согласно вашим настройкам браузера.
						</p>
						<p>
							Вы можете настроить браузер для отказа от использования cookies,
							однако это может повлиять на функциональность Сервиса.
						</p>
					</div>
				</div>

				{/* Изменения */}
				<div className='bg-black/40 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.15)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						7. Изменения в Политике
					</h2>
					<div className='space-y-3 text-gray-300 leading-relaxed'>
						<p>
							Мы оставляем за собой право вносить изменения в настоящую
							Политику. О существенных изменениях мы уведомим вас через Сервис
							или по электронной почте.
						</p>
						<p>
							Продолжая использовать Сервис после внесения изменений, вы
							соглашаетесь с новой редакцией Политики.
						</p>
					</div>
				</div>

				{/* Контакты */}
				<div className='bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.2)]'>
					<h2 className='text-2xl font-bold text-emerald-300 mb-4'>
						8. Контакты
					</h2>
					<div className='space-y-3 text-gray-300'>
						<p>
							Если у вас есть вопросы по настоящей Политике конфиденциальности,
							свяжитесь с нами:
						</p>
						<p>
							<strong className='text-emerald-400'>ООО «НЭСИ»</strong>
						</p>
						<p>ИНН: 2205021414</p>
						<p>
							<strong className='text-emerald-400'>Email:</strong>{' '}
							<a
								href='mailto:info.nesi@bk.ru'
								className='text-emerald-400 hover:underline'
							>
								info@nesi.ru
							</a>
						</p>
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
					<Link
						href='/terms'
						className='flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition'
					>
						<span>Пользовательское соглашение</span>
					</Link>
					<Link
						href='/offer'
						className='flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition'
					>
						<span>Публичная оферта →</span>
					</Link>
				</div>
			</div>
		</div>
	)
}
