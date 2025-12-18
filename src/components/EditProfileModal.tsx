'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	FaBuilding,
	FaCheckCircle,
	FaCity,
	FaCode,
	FaExclamationCircle,
	FaFileSignature,
	FaIdCard,
	FaImage,
	FaMapMarkerAlt,
	FaTimes,
} from 'react-icons/fa'
import { toast } from 'sonner'

const cityOptions = [
	'Москва',
	'Санкт-Петербург',
	'Новосибирск',
	'Екатеринбург',
	'Казань',
	'Нижний Новгород',
	'Челябинск',
	'Самара',
	'Омск',
	'Ростов-на-Дону',
	'Уфа',
	'Красноярск',
	'Пермь',
	'Воронеж',
	'Волгоград',
	'Краснодар',
	'Саратов',
	'Тюмень',
	'Тольятти',
	'Ижевск',
	'Барнаул',
	'Ульяновск',
	'Иркутск',
	'Хабаровск',
	'Ярославль',
	'Владивосток',
	'Махачкала',
	'Томск',
	'Оренбург',
	'Кемерово',
	'Новокузнецк',
	'Рязань',
	'Астрахань',
	'Набережные Челны',
	'Пенза',
	'Липецк',
	'Киров',
	'Чебоксары',
	'Балашиха',
	'Калининград',
	'Тула',
	'Курск',
	'Ставрополь',
	'Улан-Удэ',
	'Сочи',
	'Тверь',
	'Магнитогорск',
	'Иваново',
	'Брянск',
	'Белгород',
	'Сургут',
	'Владимир',
	'Чита',
	'Нижний Тагил',
	'Архангельск',
	'Калуга',
	'Симферополь',
	'Смоленск',
	'Волжский',
	'Якутск',
	'Грозный',
	'Подольск',
	'Саранск',
	'Череповец',
	'Вологда',
	'Орёл',
	'Владикавказ',
	'Йошкар-Ола',
	'Каменск-Уральский',
	'Мытищи',
	'Мурманск',
	'Нижневартовск',
	'Новороссийск',
	'Таганрог',
	'Комсомольск-на-Амуре',
	'Петрозаводск',
	'Нальчик',
	'Стерлитамак',
	'Кострома',
	'Химки',
	'Каменск-Шахтинский',
	'Тамбов',
	'Курган',
	'Энгельс',
	'Благовещенск',
	'Севастополь',
	'Сыктывкар',
	'Нижнекамск',
	'Шахты',
	'Ногинск',
	'Зеленоград',
	'Орск',
	'Бийск',
	'Димитровград',
	'Новый Уренгой',
	'Псков',
	'Кисловодск',
	'Армавир',
	'Рыбинск',
	'Ангарск',
	'Балашов',
	'Элиста',
	'Копейск',
	'Березники',
	'Златоуст',
	'Миасс',
	'Абакан',
	'Норильск',
	'Сызрань',
	'Великий Новгород',
	'Бердск',
	'Салават',
	'Арзамас',
	'Коломна',
	'Домодедово',
	'Жуковский',
	'Одинцово',
	'Кызыл',
	'Ессентуки',
	'Новочеркасск',
	'Серпухов',
	'Нефтеюганск',
	'Дербент',
	'Каменка',
	'Майкоп',
	'Клин',
	'Раменское',
	'Сергиев Посад',
	'Новоуральск',
	'Альметьевск',
	'Находка',
	'Обнинск',
	'Каменск',
	'Хасавюрт',
	'Каспийск',
	'Назрань',
	'Евпатория',
	'Пятигорск',
	'Королёв',
	'Люберцы',
	'Щёлково',
	'Красногорск',
	'Электросталь',
	'Железнодорожный',
	'Новомосковск',
	'Сергиевск',
	'Черкесск',
	'Геленджик',
	'Минеральные Воды',
	'Будённовск',
	'Ковров',
	'Саров',
	'Егорьевск',
	'Уссурийск',
	'Тобольск',
	'Ноябрьск',
	'Северск',
	'Муром',
	'Камышин',
	'Каспийский',
	'Долгопрудный',
	'Пушкино',
	'Реутов',
	'Нягань',
	'Северодвинск',
	'Ачинск',
	'Канск',
	'Минусинск',
	'Саянск',
	'Усть-Илимск',
	'Братск',
	'Ухта',
	'Воркута',
	'Печора',
	'Сосногорск',
	'Когалым',
	'Радужный',
	'Мегион',
	'Лангепас',
	'Пыть-Ях',
	'Советский',
	'Белоярский',
	'Урай',
	'Ханты-Мансийск',
	'Югорск',
	'Лабытнанги',
	'Салехард',
	'Надым',
	'Губкинский',
	'Тарко-Сале',
	'Южно-Сахалинск',
]

// Расширенный список навыков на основе категорий
export const skillCategories: Record<string, string[]> = {
	'IT и программирование': [
		'JavaScript',
		'TypeScript',
		'React',
		'Next.js',
		'Vue.js',
		'Angular',
		'Node.js',
		'Express',
		'Python',
		'Django',
		'Flask',
		'FastAPI',
		'PHP',
		'Laravel',
		'Symfony',
		'Java',
		'Spring Boot',
		'Kotlin',
		'C#',
		'.NET',
		'ASP.NET',
		'Go',
		'Rust',
		'Ruby',
		'Ruby on Rails',
		'PostgreSQL',
		'MySQL',
		'MongoDB',
		'Redis',
		'Elasticsearch',
		'REST API',
		'GraphQL',
		'WebSocket',
		'Docker',
		'Kubernetes',
		'Git',
		'Linux',
		'AWS',
		'Azure',
		'GCP',
		'CI/CD',
		'Jenkins',
		'Bitrix',
		'WordPress',
		'Drupal',
		'Joomla',
		'Frontend',
		'Backend',
		'Fullstack',
		'DevOps',
		'Базы данных',
		'Телеграм-боты',
		'Интеграции API',
		'Тестирование',
		'QA',
		'Selenium',
		'Jest',
		'AI / ML',
		'Нейросети',
		'TensorFlow',
		'PyTorch',
		'Игровая разработка',
		'Unity',
		'Unreal Engine',
		'Скрипты',
		'Автоматизация',
	],
	'1С': [
		'1С: Бухгалтерия',
		'1С: УТ',
		'1С: ERP',
		'1С: ЗУП',
		'1С: Розница',
		'1С: Конфигурация',
		'1С: Внедрение',
		'1С: Обновление',
		'1С: Интеграция',
	],
	Дизайн: [
		'UI/UX',
		'Figma',
		'Adobe XD',
		'Sketch',
		'Photoshop',
		'Illustrator',
		'InDesign',
		'After Effects',
		'Premiere Pro',
		'Адаптивный дизайн',
		'Логотипы',
		'Фирменный стиль',
		'Веб-дизайн',
		'Мобильный дизайн',
		'Презентации',
		'Инфографика',
		'Анимация',
		'Видео',
		'3D-графика',
		'Blender',
		'Cinema 4D',
		'Полиграфия',
		'Иллюстрации',
		'Иконки',
		'Моушн-дизайн',
		'Интерактивный дизайн',
	],
	'Контент и копирайтинг': [
		'SEO',
		'SMM',
		'Маркетинг',
		'Копирайтинг',
		'Контент-маркетинг',
		'Редактура',
		'Корректура',
		'Написание статей',
		'SEO-тексты',
		'Коммерческие тексты',
		'Переводы',
		'Нейминг',
		'Слоганы',
		'Сценарии',
		'Скрипты',
		'Посты для соцсетей',
		'Email-маркетинг',
		'Контент-план',
		'Таргетированная реклама',
		'Контекстная реклама',
	],
	'Бизнес и жизнь': [
		'Консалтинг',
		'Бизнес-планы',
		'Обучение',
		'Коучинг',
		'Менторинг',
		'Подбор персонала',
		'HR',
		'Юридические услуги',
		'Документооборот',
		'Продажи',
		'Переговоры',
		'Проектный менеджмент',
		'PM',
		'Scrum',
		'Agile',
		'Kanban',
		'Аналитика',
		'Бухгалтерия',
		'Финансы',
	],
	'Аудио, видео, съёмка': [
		'Видеомонтаж',
		'Монтаж',
		'Цветокоррекция',
		'Звукорежиссура',
		'Озвучка',
		'Субтитры',
		'Видеосъёмка',
		'Фотосъёмка',
		'Обработка фото',
		'Стриминг',
		'YouTube',
		'Подкасты',
		'Музыка',
		'Аудио-постпродакшн',
	],
	Маркетплейсы: [
		'Wildberries',
		'Ozon',
		'Яндекс.Маркет',
		'Авито',
		'Юла',
		'Настройка карточек',
		'SEO карточек',
		'Продвижение',
		'Аналитика',
		'Работа с отзывами',
		'Логистика',
		'Фулфилмент',
	],
	'Соцсети и мессенджеры': [
		'ВКонтакте',
		'Telegram',
		'WhatsApp',
		'Instagram',
		'Facebook',
		'Одноклассники',
		'YouTube',
		'TikTok',
		'Настройка рекламы',
		'Ведение сообществ',
		'Контент для соцсетей',
		'Модерация',
	],
	Разное: [
		'Вёрстка',
		'HTML',
		'CSS',
		'SCSS',
		'SASS',
		'Tailwind CSS',
		'Bootstrap',
		'Адаптивная вёрстка',
		'Микроразметка',
		'PWA',
		'Веб-аналитика',
		'Google Analytics',
		'Яндекс.Метрика',
		'Техническая поддержка',
		'Администрирование',
		'Безопасность',
		'Парсинг данных',
		'Автоматизация процессов',
	],
}

// Компонент выбора навыков
function SkillsSelector({
	skills,
	setSkills,
}: {
	skills: string[]
	setSkills: (s: string[]) => void
}) {
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

	// Дебаунс для поиска (оптимизация)
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery)
		}, 300)
		return () => clearTimeout(timer)
	}, [searchQuery])

	// Мемоизация функций для оптимизации
	const addSkill = useCallback(
		(skill: string) => {
			if (!skills.includes(skill)) {
				setSkills([...skills, skill])
			}
		},
		[skills, setSkills]
	)

	const removeSkill = useCallback(
		(skill: string) => {
			setSkills(skills.filter(s => s !== skill))
		},
		[skills, setSkills]
	)

	// Мемоизация фильтрованных категорий
	const filteredCategories = useMemo(() => {
		return Object.entries(skillCategories).filter(([category, items]) => {
			if (selectedCategory && category !== selectedCategory) return false
			if (!debouncedSearchQuery) return true
			const query = debouncedSearchQuery.toLowerCase()
			return (
				category.toLowerCase().includes(query) ||
				items.some(item => item.toLowerCase().includes(query))
			)
		})
	}, [selectedCategory, debouncedSearchQuery])

	// Мемоизация фильтрованных навыков для категории
	const getFilteredSkills = useCallback(
		(category: string) => {
			const items = skillCategories[category] || []
			if (!debouncedSearchQuery) return items
			const query = debouncedSearchQuery.toLowerCase()
			return items.filter(item => item.toLowerCase().includes(query))
		},
		[debouncedSearchQuery]
	)

	return (
		<div className='space-y-4'>
			{/* Выбранные навыки */}
			{skills.length > 0 && (
				<div className='flex flex-wrap gap-2 p-2 sm:p-3 bg-black/30 rounded-lg border border-emerald-500/20'>
					{skills.map(skill => (
						<span
							key={skill}
							className='px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500/20 text-emerald-300 text-xs sm:text-sm rounded-full border border-emerald-500/40 flex items-center gap-1 sm:gap-2'
						>
							{skill}
							<button
								type='button'
								onClick={() => removeSkill(skill)}
								className='text-red-400 hover:text-red-300 transition text-xs'
							>
								✕
							</button>
						</span>
					))}
				</div>
			)}

			{/* Поиск и фильтр категорий */}
			<div className='space-y-2'>
				<input
					type='text'
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
					placeholder='Поиск навыков...'
					className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition'
				/>
				<div className='flex flex-wrap gap-1.5 sm:gap-2'>
					<button
						type='button'
						onClick={() => setSelectedCategory(null)}
						className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-lg border transition ${
							selectedCategory === null
								? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
								: 'bg-black/30 text-gray-400 border-gray-600 hover:border-emerald-500/30'
						}`}
					>
						Все категории
					</button>
					{Object.keys(skillCategories).map(category => (
						<button
							key={category}
							type='button'
							onClick={() => setSelectedCategory(category)}
							className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-lg border transition ${
								selectedCategory === category
									? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
									: 'bg-black/30 text-gray-400 border-gray-600 hover:border-emerald-500/30'
							}`}
						>
							{category}
						</button>
					))}
				</div>
			</div>

			{/* Навыки по категориям */}
			<div className='space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto custom-scrollbar'>
				{filteredCategories.map(([category]) => {
					const skillsToShow = getFilteredSkills(category)
					if (skillsToShow.length === 0) return null

					return (
						<div key={category}>
							<h3 className='text-emerald-400 text-xs sm:text-sm mb-1.5 sm:mb-2 font-medium'>
								{category}{' '}
								<span className='text-gray-500 text-xs'>
									({skillsToShow.length})
								</span>
							</h3>
							<div className='flex flex-wrap gap-1.5 sm:gap-2'>
								{skillsToShow.map(skill => (
									<button
										key={skill}
										type='button'
										onClick={() => addSkill(skill)}
										disabled={skills.includes(skill)}
										className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg border transition ${
											skills.includes(skill)
												? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50 cursor-not-allowed opacity-60'
												: 'bg-black/30 text-gray-300 border-gray-600 hover:border-emerald-500/40 hover:text-emerald-300 hover:shadow-[0_0_8px_rgba(16,185,129,0.2)]'
										}`}
									>
										{skill}
									</button>
								))}
							</div>
						</div>
					)
				})}
				{filteredCategories.length === 0 && debouncedSearchQuery && (
					<div className='text-center py-8 text-gray-400 text-sm'>
						Навыки не найдены. Попробуйте другой запрос или добавьте свой навык
						ниже.
					</div>
				)}
			</div>

			{/* Добавить свой навык */}
			<div className='pt-2 border-t border-gray-700'>
				<input
					type='text'
					placeholder='Добавить свой навык (Enter)'
					className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition'
					onKeyDown={e => {
						if (e.key === 'Enter' && e.currentTarget.value.trim()) {
							addSkill(e.currentTarget.value.trim())
							e.currentTarget.value = ''
						}
					}}
				/>
			</div>
		</div>
	)
}

interface EditProfileModalProps {
	isOpen: boolean
	onClose: () => void
	user: any
	token: string
	onSuccess: () => void
}

export default function EditProfileModal({
	isOpen,
	onClose,
	user,
	token,
	onSuccess,
}: EditProfileModalProps) {
	const [fullName, setFullName] = useState('')
	const [description, setDescription] = useState('')
	const [location, setLocation] = useState('')
	const [skills, setSkills] = useState<string[]>([])
	const [avatarFile, setAvatarFile] = useState<File | null>(null)
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [mounted, setMounted] = useState(false)
	const [showCityDropdown, setShowCityDropdown] = useState(false)
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({})
	
	// B2B/B2C поля
	const [companyName, setCompanyName] = useState('')
	const [inn, setInn] = useState('')
	const [kpp, setKpp] = useState('')
	const [ogrn, setOgrn] = useState('')
	const [legalAddress, setLegalAddress] = useState('')
	
	// Поиск по ИНН
	const [innLoading, setInnLoading] = useState(false)
	const [innError, setInnError] = useState<string | null>(null)
	const [innFound, setInnFound] = useState<boolean | null>(null)
	const innSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	
	const locationInputRef = useRef<HTMLInputElement>(null)
	const cityDropdownRef = useRef<HTMLDivElement>(null)
	const citySearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		setMounted(true)
	}, [])

	// Закрытие выпадающего списка городов при клике вне
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				cityDropdownRef.current &&
				!cityDropdownRef.current.contains(event.target as Node) &&
				locationInputRef.current &&
				!locationInputRef.current.contains(event.target as Node)
			) {
				setShowCityDropdown(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	// Мемоизация фильтрации городов для оптимизации
	const filteredCities = useMemo(() => {
		const query = location.trim().toLowerCase()
		if (!query) return cityOptions.slice(0, 10)
		return cityOptions
			.filter(city => city.toLowerCase().includes(query))
			.slice(0, 10)
	}, [location])

	const handleCitySelect = useCallback((city: string) => {
		setLocation(city)
		setShowCityDropdown(false)
		setValidationErrors(prev => ({ ...prev, location: '' }))
	}, [])

	// Поиск организации по ИНН
	const lookupInn = useCallback(async (innValue: string) => {
		// Проверяем длину ИНН: 10 для юр.лиц, 12 для ИП
		const expectedLength = user?.accountType === 'COMPANY' ? 10 : 12
		if (innValue.length !== expectedLength) {
			setInnFound(null)
			setInnError(null)
			return
		}

		setInnLoading(true)
		setInnError(null)
		setInnFound(null)

		try {
			const res = await fetch(`/api/inn/lookup?inn=${innValue}`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			})
			const data = await res.json()

			if (!res.ok) {
				setInnError(data.error || 'Ошибка проверки ИНН')
				setInnFound(false)
				return
			}

			if (data.found) {
				setInnFound(true)
				
				// Автозаполнение полей
				if (data.name) {
					setCompanyName(data.name)
				}
				if (data.kpp) {
					setKpp(data.kpp)
				}
				if (data.ogrn) {
					setOgrn(data.ogrn)
				}
				if (data.address) {
					setLegalAddress(data.address)
				}

				// Проверяем активность
				if (!data.isActive) {
					setInnError(`⚠️ Организация ${data.status === 'LIQUIDATED' ? 'ликвидирована' : 'в процессе ликвидации/реорганизации'}`)
				}
			} else {
				setInnFound(false)
				setInnError(data.message || 'Организация не найдена')
			}
		} catch (error) {
			setInnError('Ошибка при проверке ИНН')
			setInnFound(false)
		} finally {
			setInnLoading(false)
		}
	}, [user?.accountType, token])

	// Обработчик изменения ИНН с debounce
	const handleInnChange = useCallback((value: string) => {
		const cleanValue = value.replace(/\D/g, '').slice(0, user?.accountType === 'COMPANY' ? 10 : 12)
		setInn(cleanValue)
		setInnFound(null)
		setInnError(null)

		// Отменяем предыдущий таймер
		if (innSearchTimeoutRef.current) {
			clearTimeout(innSearchTimeoutRef.current)
		}

		// Запускаем поиск с задержкой 500мс
		const expectedLength = user?.accountType === 'COMPANY' ? 10 : 12
		if (cleanValue.length === expectedLength) {
			innSearchTimeoutRef.current = setTimeout(() => {
				lookupInn(cleanValue)
			}, 500)
		}
	}, [user?.accountType, lookupInn])

	// Очистка таймера при размонтировании
	useEffect(() => {
		return () => {
			if (innSearchTimeoutRef.current) {
				clearTimeout(innSearchTimeoutRef.current)
			}
		}
	}, [])

	// Валидация в реальном времени
	const validateField = useCallback(
		(field: string, value: string | string[]) => {
			const errors: Record<string, string> = {}

			if (field === 'fullName' && typeof value === 'string') {
				if (!value.trim()) {
					errors.fullName = 'Имя обязательно для заполнения'
				} else if (value.trim().length < 2) {
					errors.fullName = 'Имя должно содержать минимум 2 символа'
				} else if (value.trim().length > 100) {
					errors.fullName = 'Имя не должно превышать 100 символов'
				}
			}

			if (
				field === 'description' &&
				typeof value === 'string' &&
				value.length > 1000
			) {
				errors.description = 'Описание не должно превышать 1000 символов'
			}

			if (field === 'skills' && Array.isArray(value) && value.length > 20) {
				errors.skills = 'Можно выбрать не более 20 навыков'
			}

			setValidationErrors(prev => ({ ...prev, ...errors }))
			return Object.keys(errors).length === 0
		},
		[]
	)

	// Мемоизация прогресса заполнения
	const completionProgress = useMemo(() => {
		let filled = 0
		// Для заказчиков не считаем навыки
		const total = user.role === 'executor' ? 4 : 3

		if (fullName.trim()) filled++
		if (description.trim()) filled++
		if (location.trim()) filled++
		if (user.role === 'executor' && skills.length > 0) filled++

		return Math.round((filled / total) * 100)
	}, [fullName, description, location, skills, user.role])

	// Блокировка прокрутки body когда модальное окно открыто
	useEffect(() => {
		if (isOpen) {
			const scrollbarWidth =
				window.innerWidth - document.documentElement.clientWidth
			document.body.style.overflow = 'hidden'
			document.body.style.paddingRight = `${scrollbarWidth}px`
		} else {
			document.body.style.overflow = ''
			document.body.style.paddingRight = ''
		}
		return () => {
			document.body.style.overflow = ''
			document.body.style.paddingRight = ''
		}
	}, [isOpen])

	useEffect(() => {
		if (user && isOpen) {
			setFullName(user.fullName || '')
			setDescription(user.description || '')
			setLocation(user.location || '')
			setSkills(
				Array.isArray(user.skills)
					? user.skills
					: (user.skills || '')
							.split(',')
							.map((s: string) => s.trim())
							.filter(Boolean)
			)
			if (user.avatarUrl) setAvatarPreview(user.avatarUrl)
			
			// B2B/B2C поля
			setCompanyName(user.companyName || '')
			setInn(user.inn || '')
			setKpp(user.kpp || '')
			setOgrn(user.ogrn || '')
			setLegalAddress(user.legalAddress || '')
		}
	}, [user, isOpen])

	const handleSave = useCallback(async () => {
		// Защита от повторных вызовов
		if (saving) return
		
		if (!token) return toast.error('Нет токена авторизации')

		// Валидация всех полей
		const isFullNameValid = validateField('fullName', fullName)
		const isDescriptionValid = validateField('description', description)
		// Для заказчиков не валидируем навыки
		const isSkillsValid =
			user.role === 'executor' ? validateField('skills', skills as any) : true

		if (!isFullNameValid || !isDescriptionValid || !isSkillsValid) {
			return toast.error('Исправьте ошибки в форме')
		}

		setSaving(true)
		const toastId = toast.loading('Сохраняем профиль...')

		try {
			const formData = new FormData()
			formData.append('fullName', fullName.trim())
			formData.append('role', user.role)
			formData.append('description', description.trim())
			formData.append('location', location.trim())
			formData.append('skills', skills.join(','))
			if (avatarFile) formData.append('avatar', avatarFile)
			
			// B2B/B2C поля (только если не физлицо)
			if (user.accountType && user.accountType !== 'INDIVIDUAL') {
				formData.append('companyName', companyName.trim())
				formData.append('inn', inn.trim())
				if (user.accountType === 'COMPANY') {
					formData.append('kpp', kpp.trim())
				}
				formData.append('ogrn', ogrn.trim())
				formData.append('legalAddress', legalAddress.trim())
			}

			const res = await fetch('/api/profile', {
				method: 'PATCH',
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			})

			const data = await res.json()
			if (!res.ok) {
				const errorMessage = data.details
					? `${data.error}: ${data.details}`
					: data.error || 'Ошибка при сохранении'
				throw new Error(errorMessage)
			}

			toast.success('Профиль обновлён', { id: toastId })
			setValidationErrors({})
			onSuccess()
			onClose()
		} catch (err: any) {
			console.error('Ошибка сохранения профиля:', err)
			const errorMessage = err.message || 'Ошибка сервера'
			toast.error(errorMessage, { id: toastId })
		} finally {
			setSaving(false)
		}
	}, [
		token,
		fullName,
		description,
		location,
		skills,
		avatarFile,
		user.role,
		user.accountType,
		companyName,
		inn,
		kpp,
		ogrn,
		legalAddress,
		validateField,
		onSuccess,
		onClose,
		saving,
	])

	const handleAvatarChange = useCallback((file: File) => {
		// Валидация размера файла (макс 5MB)
		if (file.size > 5 * 1024 * 1024) {
			toast.error('Размер файла не должен превышать 5MB')
			return
		}

		// Валидация типа файла
		if (!file.type.startsWith('image/')) {
			toast.error('Выберите изображение')
			return
		}

		setAvatarFile(file)
		setAvatarPreview(URL.createObjectURL(file))
	}, [])

	if (!mounted || !isOpen || typeof window === 'undefined') return null

	const isMobileView = window.innerWidth < 640

	return createPortal(
		<div
			className={`fixed inset-0 z-[10003] bg-black/70 backdrop-blur-sm flex ${isMobileView ? 'items-end' : 'items-center justify-center'} p-4 sm:p-6`}
			onClick={onClose}
			data-profile-modal
		>
			<div
				className={`relative w-full ${isMobileView ? 'max-w-full h-[90vh] rounded-t-3xl' : 'max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl rounded-lg sm:rounded-xl md:rounded-2xl'} mx-auto bg-gradient-to-br from-black via-gray-900 to-black border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col overflow-hidden`}
				style={{
					height: isMobileView ? '90vh' : 'calc(100vh - 3.5rem - 1rem)',
					maxHeight: isMobileView ? '90vh' : 'calc(100vh - 3rem - 1rem)',
					display: 'flex',
					flexDirection: 'column',
					boxShadow: isMobileView 
						? '0 -10px 40px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(16, 185, 129, 0.1), 0 0 50px rgba(16, 185, 129, 0.2)'
						: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(16, 185, 129, 0.1), 0 0 50px rgba(16, 185, 129, 0.2)',
				}}
				onClick={e => e.stopPropagation()}
			>
				{/* Заголовок */}
				<div className='flex-shrink-0 bg-black/40 backdrop-blur-md border-b border-emerald-500/30 p-2.5 sm:p-3 flex justify-between items-center rounded-none sm:rounded-t-xl'>
					<div className='flex items-center gap-2'>
						<Image
							src='/astro.png'
							alt='Космонавт'
							width={100}
							height={100}
							className='astro-icon w-10 h-10 sm:w-12 sm:h-12 object-contain'
						/>
						<h2 className='text-base sm:text-lg font-bold text-emerald-400'>
							Редактировать профиль
						</h2>
					</div>
					<button
						onClick={onClose}
						className='text-gray-400 hover:text-emerald-400 transition p-1.5 hover:bg-emerald-500/10 rounded-lg'
					>
						<FaTimes className='text-base sm:text-lg' />
					</button>
				</div>

				{/* Контент */}
				<div
					className='flex-1 overflow-y-auto p-4 sm:p-5 text-white custom-scrollbar'
					style={{ minHeight: 0 }}
				>
					{/* Индикатор заполнения */}
					<div className='mb-4 bg-black/40 border border-emerald-500/30 rounded-lg p-2.5 sm:p-3'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs sm:text-sm text-gray-300 font-medium'>
								Прогресс заполнения
							</span>
							<span className='text-xs sm:text-sm font-bold text-emerald-400'>
								{completionProgress}%
							</span>
						</div>
						<div className='w-full bg-gray-700/50 rounded-full h-2 overflow-hidden'>
							<div
								className='h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500'
								style={{ width: `${completionProgress}%` }}
							/>
						</div>
					</div>

					{/* Основная информация */}
					<div className='mb-4 space-y-3'>
						<h3 className='text-sm sm:text-base font-semibold text-emerald-400 mb-2 pb-1.5 border-b border-emerald-500/30'>
							Основная информация
						</h3>

						{/* Имя */}
						<div className='space-y-1.5'>
							<label className='flex items-center gap-1.5 text-emerald-400 font-medium text-xs sm:text-sm'>
								<FaFileSignature className='text-xs sm:text-sm' /> Имя
								<span className='text-red-400 text-xs'>*</span>
							</label>
							<div className='relative'>
								<input
									type='text'
									value={fullName}
									onChange={e => {
										setFullName(e.target.value)
										if (e.target.value.trim()) {
											validateField('fullName', e.target.value)
										}
									}}
									onBlur={() => validateField('fullName', fullName)}
									className={`w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition ${
										validationErrors.fullName
											? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/30'
											: 'border-emerald-500/30 focus:border-emerald-400 focus:ring-emerald-400/30'
									}`}
									placeholder='Введите ваше имя'
								/>
								{fullName.trim() && !validationErrors.fullName && (
									<FaCheckCircle className='absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-sm' />
								)}
								{validationErrors.fullName && (
									<FaExclamationCircle className='absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-sm' />
								)}
							</div>
							{validationErrors.fullName && (
								<p className='text-xs text-red-400 flex items-center gap-1'>
									<FaExclamationCircle className='text-xs' />
									{validationErrors.fullName}
								</p>
							)}
							{fullName.trim() && !validationErrors.fullName && (
								<p className='text-xs text-gray-500'>
									{fullName.trim().length}/100 символов
								</p>
							)}
						</div>

						{/* Описание */}
						<div className='space-y-1.5'>
							<label className='text-emerald-400 font-medium text-xs sm:text-sm'>
								Описание
								<span className='text-gray-500 text-xs ml-1.5 font-normal'>
									(необязательно)
								</span>
							</label>
							<div className='relative'>
								<textarea
									value={description}
									onChange={e => {
										setDescription(e.target.value)
										if (e.target.value) {
											validateField('description', e.target.value)
										}
									}}
									onBlur={() => validateField('description', description)}
									rows={3}
									placeholder='Расскажите немного о себе, своем опыте и специализации...'
									className={`w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition resize-none ${
										validationErrors.description
											? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/30'
											: 'border-emerald-500/30 focus:border-emerald-400 focus:ring-emerald-400/30'
									}`}
								/>
								{validationErrors.description && (
									<FaExclamationCircle className='absolute right-3 top-2.5 text-red-400 text-sm' />
								)}
							</div>
							{validationErrors.description && (
								<p className='text-xs text-red-400 flex items-center gap-1'>
									<FaExclamationCircle className='text-xs' />
									{validationErrors.description}
								</p>
							)}
							<p className='text-xs text-gray-500'>
								{description.length}/1000 символов
							</p>
						</div>

						{/* Город - автодополнение с выпадающим списком */}
						<div className='space-y-1.5'>
							<label className='flex items-center gap-1.5 text-emerald-400 font-medium text-xs sm:text-sm'>
								<FaCity className='text-xs sm:text-sm' /> Город
								<span className='text-gray-500 text-xs ml-1.5 font-normal'>
									(необязательно)
								</span>
							</label>
							<div className='relative' ref={cityDropdownRef}>
								<input
									ref={locationInputRef}
									type='text'
									value={location}
									onChange={e => {
										setLocation(e.target.value)
										setShowCityDropdown(true)
									}}
									onFocus={() => setShowCityDropdown(true)}
									onBlur={() => {
										setTimeout(() => setShowCityDropdown(false), 200)
									}}
									className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition'
									placeholder='Начните вводить название города...'
								/>
								{showCityDropdown && filteredCities.length > 0 && (
									<div className='absolute z-50 w-full mt-1 bg-gradient-to-br from-black via-gray-900 to-black border border-emerald-500/30 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] max-h-48 sm:max-h-60 overflow-y-auto custom-scrollbar'>
										{filteredCities.map(city => (
											<button
												key={city}
												type='button'
												onClick={() => handleCitySelect(city)}
												className='w-full px-3 sm:px-4 py-2 text-left text-sm sm:text-base text-white hover:bg-emerald-500/20 hover:text-emerald-300 transition border-b border-emerald-500/10 last:border-b-0'
											>
												{city}
											</button>
										))}
									</div>
								)}
							</div>
							<p className='text-xs text-gray-500'>
								Выберите из списка или введите свой город
							</p>
						</div>
					</div>

					{/* Данные компании/ИП - только для не-физлиц */}
					{user.accountType && user.accountType !== 'INDIVIDUAL' && (
						<div className='mb-4 space-y-3'>
							<h3 className='text-sm sm:text-base font-semibold text-emerald-400 mb-2 pb-1.5 border-b border-emerald-500/30 flex items-center gap-2'>
								<FaBuilding className='text-sm' />
								{user.accountType === 'SELF_EMPLOYED' && 'Данные самозанятого'}
								{user.accountType === 'SOLE_PROPRIETOR' && 'Данные ИП'}
								{user.accountType === 'COMPANY' && 'Данные компании'}
							</h3>

							{/* Название компании/ИП */}
							{(user.accountType === 'SOLE_PROPRIETOR' || user.accountType === 'COMPANY') && (
								<div className='space-y-1.5'>
									<label className='flex items-center gap-1.5 text-emerald-400 font-medium text-xs sm:text-sm'>
										<FaBuilding className='text-xs sm:text-sm' />
										{user.accountType === 'SOLE_PROPRIETOR' ? 'Название ИП' : 'Название компании'}
									</label>
									<input
										type='text'
										value={companyName}
										onChange={e => setCompanyName(e.target.value)}
										className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition'
										placeholder={user.accountType === 'SOLE_PROPRIETOR' ? 'ИП Иванов Иван Иванович' : 'ООО «Название компании»'}
									/>
								</div>
							)}

							{/* ИНН с автозаполнением */}
							<div className='space-y-1.5'>
								<label className='flex items-center gap-1.5 text-emerald-400 font-medium text-xs sm:text-sm'>
									<FaIdCard className='text-xs sm:text-sm' /> ИНН
									<span className='text-gray-500 text-xs ml-1.5 font-normal'>
										({user.accountType === 'COMPANY' ? '10 цифр' : '12 цифр'})
									</span>
									{innLoading && (
										<span className='ml-auto flex items-center gap-1 text-xs text-gray-400'>
											<span className='w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin' />
											Проверка...
										</span>
									)}
									{innFound === true && !innLoading && (
										<span className='ml-auto text-xs text-emerald-400'>✓ Найдено</span>
									)}
								</label>
								<div className='relative'>
									<input
										type='text'
										value={inn}
										onChange={e => handleInnChange(e.target.value)}
										className={`w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition ${
											innFound === true 
												? 'border-emerald-500 focus:border-emerald-400 focus:ring-emerald-400/30' 
												: innError 
													? 'border-amber-500/50 focus:border-amber-400 focus:ring-amber-400/30'
													: 'border-emerald-500/30 focus:border-emerald-400 focus:ring-emerald-400/30'
										}`}
										placeholder={user.accountType === 'COMPANY' ? '1234567890' : '123456789012'}
									/>
								</div>
								{innError && (
									<p className='text-xs text-amber-400 mt-1'>{innError}</p>
								)}
								{innFound === true && companyName && (
									<p className='text-xs text-emerald-400/80 mt-1'>
										{companyName}
									</p>
								)}
								<p className='text-xs text-gray-500 mt-1'>
									💡 Введите ИНН — данные организации заполнятся автоматически
								</p>
							</div>

							{/* КПП - только для ООО */}
							{user.accountType === 'COMPANY' && (
								<div className='space-y-1.5'>
									<label className='flex items-center gap-1.5 text-emerald-400 font-medium text-xs sm:text-sm'>
										<FaIdCard className='text-xs sm:text-sm' /> КПП
										<span className='text-gray-500 text-xs ml-1.5 font-normal'>(9 цифр)</span>
									</label>
									<input
										type='text'
										value={kpp}
										onChange={e => {
											const value = e.target.value.replace(/\D/g, '').slice(0, 9)
											setKpp(value)
										}}
										className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition'
										placeholder='123456789'
									/>
								</div>
							)}

							{/* ОГРН / ОГРНИП */}
							{(user.accountType === 'SOLE_PROPRIETOR' || user.accountType === 'COMPANY') && (
								<div className='space-y-1.5'>
									<label className='flex items-center gap-1.5 text-emerald-400 font-medium text-xs sm:text-sm'>
										<FaIdCard className='text-xs sm:text-sm' />
										{user.accountType === 'SOLE_PROPRIETOR' ? 'ОГРНИП' : 'ОГРН'}
										<span className='text-gray-500 text-xs ml-1.5 font-normal'>
											({user.accountType === 'SOLE_PROPRIETOR' ? '15 цифр' : '13 цифр'})
										</span>
									</label>
									<input
										type='text'
										value={ogrn}
										onChange={e => {
											const value = e.target.value.replace(/\D/g, '').slice(0, user.accountType === 'SOLE_PROPRIETOR' ? 15 : 13)
											setOgrn(value)
										}}
										className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition'
										placeholder={user.accountType === 'SOLE_PROPRIETOR' ? '123456789012345' : '1234567890123'}
									/>
								</div>
							)}

							{/* Юридический адрес */}
							{(user.accountType === 'SOLE_PROPRIETOR' || user.accountType === 'COMPANY') && (
								<div className='space-y-1.5'>
									<label className='flex items-center gap-1.5 text-emerald-400 font-medium text-xs sm:text-sm'>
										<FaMapMarkerAlt className='text-xs sm:text-sm' /> Юридический адрес
										<span className='text-gray-500 text-xs ml-1.5 font-normal'>(необязательно)</span>
									</label>
									<textarea
										value={legalAddress}
										onChange={e => setLegalAddress(e.target.value)}
										rows={2}
										className='w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition resize-none'
										placeholder='123456, г. Москва, ул. Примерная, д. 1, офис 100'
									/>
								</div>
							)}

							{/* Подсказка */}
							<div className='bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-300/80'>
								💡 Эти данные будут отображаться в вашем профиле и помогут другим пользователям идентифицировать вас как {user.accountType === 'SELF_EMPLOYED' ? 'самозанятого' : user.accountType === 'SOLE_PROPRIETOR' ? 'индивидуального предпринимателя' : 'компанию'}.
							</div>
						</div>
					)}

					{/* Аватар */}
					<div className='mb-4 space-y-3'>
						<h3 className='text-sm sm:text-base font-semibold text-emerald-400 mb-2 pb-1.5 border-b border-emerald-500/30'>
							Фото профиля
						</h3>
						<div className='space-y-2'>
							<label className='flex items-center gap-1.5 text-emerald-400 font-medium text-xs sm:text-sm'>
								<FaImage className='text-xs sm:text-sm' /> Аватар
								<span className='text-gray-500 text-xs ml-1.5 font-normal'>
									(необязательно)
								</span>
							</label>
							<div className='flex flex-col sm:flex-row items-start sm:items-center gap-3'>
								<label
									htmlFor='avatar-upload'
									className='px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer transition font-medium'
								>
									📷 Загрузить фото
								</label>
								<input
									id='avatar-upload'
									type='file'
									accept='image/*'
									onChange={e =>
										e.target.files?.[0] && handleAvatarChange(e.target.files[0])
									}
									className='hidden'
								/>
								{avatarPreview && (
									<div className='w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'>
										<img
											src={avatarPreview}
											alt='Аватар'
											className='w-full h-full object-cover'
										/>
									</div>
								)}
							</div>
							<p className='text-xs text-gray-500'>
								Рекомендуемый размер: квадрат, не более 5MB
							</p>
						</div>
					</div>

					{/* Навыки - только для исполнителей */}
					{user.role === 'executor' && (
						<div className='mb-4 space-y-3'>
							<h3 className='text-sm sm:text-base font-semibold text-emerald-400 mb-2 pb-1.5 border-b border-emerald-500/30'>
								Навыки и специализация
							</h3>
							<div className='space-y-2'>
								<label className='flex items-center gap-1.5 text-emerald-400 font-medium text-xs sm:text-sm'>
									<FaCode className='text-xs sm:text-sm' /> Ваши навыки
									<span className='text-gray-500 text-xs ml-1.5 font-normal'>
										(необязательно)
									</span>
								</label>
								<SkillsSelector
									skills={skills}
									setSkills={newSkills => {
										setSkills(newSkills)
										if (newSkills.length > 20) {
											validateField('skills', newSkills as any)
										} else {
											setValidationErrors(prev => {
												const next = { ...prev }
												delete next.skills
												return next
											})
										}
									}}
								/>
								{skills.length > 0 && (
									<p
										className={`text-xs font-medium ${
											skills.length > 20 ? 'text-red-400' : 'text-gray-400'
										}`}
									>
										Выбрано:{' '}
										<span
											className={
												skills.length > 20
													? 'text-red-400 font-bold'
													: 'text-emerald-400'
											}
										>
											{skills.length}
										</span>
										/20 навыков
									</p>
								)}
								{validationErrors.skills && (
									<p className='text-xs text-red-400 flex items-center gap-1'>
										<FaExclamationCircle className='text-xs' />
										{validationErrors.skills}
									</p>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Футер с кнопками */}
				<div className='flex-shrink-0 bg-black/40 backdrop-blur-md border-t border-emerald-500/30 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end rounded-none sm:rounded-b-xl'>
					<button
						onClick={onClose}
						className='w-full sm:w-auto px-4 sm:px-5 py-2 text-sm rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 transition font-medium'
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault()
							e.stopPropagation()
							handleSave()
						}}
						disabled={saving}
						className='w-full sm:w-auto px-4 sm:px-5 py-2 text-sm rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]'
					>
						{saving ? '💾 Сохраняем...' : '✅ Сохранить'}
					</button>
				</div>
			</div>
		</div>,
		document.body
	)
}
