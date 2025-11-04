'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
	FaCity,
	FaCode,
	FaFileSignature,
	FaImage,
	FaTimes,
} from 'react-icons/fa'
import { toast } from 'sonner'

const cityOptions = [
	'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
	'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
	'Уфа', 'Красноярск', 'Пермь', 'Воронеж', 'Волгоград', 'Краснодар',
	'Саратов', 'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул', 'Ульяновск',
	'Иркутск', 'Хабаровск', 'Ярославль', 'Владивосток', 'Махачкала', 'Томск',
	'Оренбург', 'Кемерово', 'Новокузнецк', 'Рязань', 'Астрахань', 'Набережные Челны',
	'Пенза', 'Липецк', 'Киров', 'Чебоксары', 'Балашиха', 'Калининград',
	'Тула', 'Курск', 'Ставрополь', 'Улан-Удэ', 'Сочи', 'Тверь', 'Магнитогорск',
	'Иваново', 'Брянск', 'Белгород', 'Сургут', 'Владимир', 'Чита', 'Нижний Тагил',
	'Архангельск', 'Калуга', 'Симферополь', 'Смоленск', 'Волжский', 'Якутск',
	'Грозный', 'Подольск', 'Саранск', 'Череповец', 'Вологда', 'Орёл',
	'Владикавказ', 'Йошкар-Ола', 'Каменск-Уральский', 'Мытищи', 'Мурманск',
	'Нижневартовск', 'Новороссийск', 'Таганрог', 'Комсомольск-на-Амуре',
	'Петрозаводск', 'Нальчик', 'Стерлитамак', 'Кострома', 'Химки',
	'Каменск-Шахтинский', 'Тамбов', 'Курган', 'Энгельс', 'Благовещенск',
	'Севастополь', 'Сыктывкар', 'Нижнекамск', 'Шахты', 'Ногинск', 'Зеленоград',
	'Орск', 'Бийск', 'Димитровград', 'Новый Уренгой', 'Псков', 'Кисловодск',
	'Армавир', 'Рыбинск', 'Ангарск', 'Балашов', 'Элиста', 'Копейск',
	'Березники', 'Златоуст', 'Миасс', 'Абакан', 'Норильск', 'Сызрань',
	'Великий Новгород', 'Бердск', 'Салават', 'Арзамас', 'Коломна', 'Домодедово',
	'Жуковский', 'Одинцово', 'Кызыл', 'Ессентуки', 'Новочеркасск', 'Серпухов',
	'Нефтеюганск', 'Дербент', 'Каменка', 'Майкоп', 'Клин', 'Раменское',
	'Сергиев Посад', 'Новоуральск', 'Альметьевск', 'Находка', 'Обнинск',
	'Каменск', 'Хасавюрт', 'Каспийск', 'Назрань', 'Евпатория', 'Пятигорск',
	'Королёв', 'Люберцы', 'Щёлково', 'Красногорск', 'Электросталь',
	'Железнодорожный', 'Новомосковск', 'Сергиевск', 'Черкесск', 'Геленджик',
	'Минеральные Воды', 'Будённовск', 'Ковров', 'Саров', 'Егорьевск',
	'Уссурийск', 'Тобольск', 'Ноябрьск', 'Северск', 'Муром', 'Камышин',
	'Каспийский', 'Долгопрудный', 'Пушкино', 'Реутов', 'Нягань', 'Северодвинск',
	'Ачинск', 'Канск', 'Минусинск', 'Саянск', 'Усть-Илимск', 'Братск',
	'Ухта', 'Воркута', 'Печора', 'Сосногорск', 'Когалым', 'Радужный',
	'Мегион', 'Лангепас', 'Пыть-Ях', 'Советский', 'Белоярский', 'Урай',
	'Ханты-Мансийск', 'Югорск', 'Лабытнанги', 'Салехард', 'Надым',
	'Губкинский', 'Тарко-Сале', 'Южно-Сахалинск'
]

// Расширенный список навыков на основе категорий
const skillCategories: Record<string, string[]> = {
	'IT и программирование': [
		'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular',
		'Node.js', 'Express', 'Python', 'Django', 'Flask', 'FastAPI',
		'PHP', 'Laravel', 'Symfony', 'Java', 'Spring Boot', 'Kotlin',
		'C#', '.NET', 'ASP.NET', 'Go', 'Rust', 'Ruby', 'Ruby on Rails',
		'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
		'REST API', 'GraphQL', 'WebSocket', 'Docker', 'Kubernetes',
		'Git', 'Linux', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins',
		'Bitrix', 'WordPress', 'Drupal', 'Joomla', 'Frontend', 'Backend',
		'Fullstack', 'DevOps', 'Базы данных', 'Телеграм-боты',
		'Интеграции API', 'Тестирование', 'QA', 'Selenium', 'Jest',
		'AI / ML', 'Нейросети', 'TensorFlow', 'PyTorch', 'Игровая разработка',
		'Unity', 'Unreal Engine', 'Скрипты', 'Автоматизация'
	],
	'1С': [
		'1С: Бухгалтерия', '1С: УТ', '1С: ERP', '1С: ЗУП', '1С: Розница',
		'1С: Конфигурация', '1С: Внедрение', '1С: Обновление', '1С: Интеграция'
	],
	'Дизайн': [
		'UI/UX', 'Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator',
		'InDesign', 'After Effects', 'Premiere Pro', 'Адаптивный дизайн',
		'Логотипы', 'Фирменный стиль', 'Веб-дизайн', 'Мобильный дизайн',
		'Презентации', 'Инфографика', 'Анимация', 'Видео', '3D-графика',
		'Blender', 'Cinema 4D', 'Полиграфия', 'Иллюстрации', 'Иконки',
		'Моушн-дизайн', 'Интерактивный дизайн'
	],
	'Контент и копирайтинг': [
		'SEO', 'SMM', 'Маркетинг', 'Копирайтинг', 'Контент-маркетинг',
		'Редактура', 'Корректура', 'Написание статей', 'SEO-тексты',
		'Коммерческие тексты', 'Переводы', 'Нейминг', 'Слоганы',
		'Сценарии', 'Скрипты', 'Посты для соцсетей', 'Email-маркетинг',
		'Контент-план', 'Таргетированная реклама', 'Контекстная реклама'
	],
	'Бизнес и жизнь': [
		'Консалтинг', 'Бизнес-планы', 'Обучение', 'Коучинг', 'Менторинг',
		'Подбор персонала', 'HR', 'Юридические услуги', 'Документооборот',
		'Продажи', 'Переговоры', 'Проектный менеджмент', 'PM', 'Scrum',
		'Agile', 'Kanban', 'Аналитика', 'Бухгалтерия', 'Финансы'
	],
	'Аудио, видео, съёмка': [
		'Видеомонтаж', 'Монтаж', 'Цветокоррекция', 'Звукорежиссура',
		'Озвучка', 'Субтитры', 'Видеосъёмка', 'Фотосъёмка', 'Обработка фото',
		'Стриминг', 'YouTube', 'Подкасты', 'Музыка', 'Аудио-постпродакшн'
	],
	'Маркетплейсы': [
		'Wildberries', 'Ozon', 'Яндекс.Маркет', 'Авито', 'Юла',
		'Настройка карточек', 'SEO карточек', 'Продвижение', 'Аналитика',
		'Работа с отзывами', 'Логистика', 'Фулфилмент'
	],
	'Соцсети и мессенджеры': [
		'ВКонтакте', 'Telegram', 'WhatsApp', 'Instagram', 'Facebook',
		'Одноклассники', 'YouTube', 'TikTok', 'Настройка рекламы',
		'Ведение сообществ', 'Контент для соцсетей', 'Модерация'
	],
	'Разное': [
		'Вёрстка', 'HTML', 'CSS', 'SCSS', 'SASS', 'Tailwind CSS',
		'Bootstrap', 'Адаптивная вёрстка', 'Микроразметка', 'PWA',
		'Веб-аналитика', 'Google Analytics', 'Яндекс.Метрика',
		'Техническая поддержка', 'Администрирование', 'Безопасность',
		'Парсинг данных', 'Автоматизация процессов'
	]
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
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

	const addSkill = (skill: string) => {
		if (!skills.includes(skill)) {
			setSkills([...skills, skill])
		}
	}

	const removeSkill = (skill: string) => {
		setSkills(skills.filter(s => s !== skill))
	}

	const filteredCategories = Object.entries(skillCategories).filter(([category, items]) => {
		if (selectedCategory && category !== selectedCategory) return false
		if (!searchQuery) return true
		const query = searchQuery.toLowerCase()
		return category.toLowerCase().includes(query) || 
		       items.some(item => item.toLowerCase().includes(query))
	})

	const filteredSkills = (category: string) => {
		const items = skillCategories[category] || []
		if (!searchQuery) return items
		const query = searchQuery.toLowerCase()
		return items.filter(item => item.toLowerCase().includes(query))
	}

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
				{filteredCategories.map(([category, items]) => {
					const skillsToShow = filteredSkills(category)
					if (skillsToShow.length === 0) return null
					
					return (
						<div key={category}>
							<h3 className='text-emerald-400 text-xs sm:text-sm mb-1.5 sm:mb-2 font-medium'>
								{category}
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
	const locationInputRef = useRef<HTMLInputElement>(null)
	const cityDropdownRef = useRef<HTMLDivElement>(null)

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

	// Фильтрация городов
	const filteredCities = location.trim()
		? cityOptions.filter(city =>
				city.toLowerCase().includes(location.toLowerCase())
		  ).slice(0, 10)
		: cityOptions.slice(0, 10) // Если поле пустое, показываем первые 10 городов

	const handleCitySelect = (city: string) => {
		setLocation(city)
		setShowCityDropdown(false)
	}

	// Блокировка прокрутки body когда модальное окно открыто
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		return () => {
			document.body.style.overflow = 'unset'
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
		}
	}, [user, isOpen])

	const handleSave = async () => {
		if (!token) return toast.error('Нет токена авторизации')
		if (!fullName.trim()) return toast.error('Имя не может быть пустым')

		setSaving(true)
		const toastId = toast.loading('Сохраняем профиль...')

		try {
			const formData = new FormData()
			formData.append('fullName', fullName)
			formData.append('role', user.role)
			formData.append('description', description)
			formData.append('location', location)
			formData.append('skills', skills.join(','))
			if (avatarFile) formData.append('avatar', avatarFile)

			const res = await fetch('/api/profile', {
				method: 'PATCH',
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			})

			const data = await res.json()
			if (!res.ok) throw new Error(data.error || 'Ошибка при сохранении')

			toast.success('Профиль обновлён', { id: toastId })
			onSuccess()
			onClose()
		} catch (err: any) {
			toast.error(err.message || 'Ошибка сервера', { id: toastId })
		} finally {
			setSaving(false)
		}
	}

	const handleAvatarChange = (file: File) => {
		setAvatarFile(file)
		setAvatarPreview(URL.createObjectURL(file))
	}

	if (!mounted || !isOpen) return null

	return (
		<div
			className='fixed inset-0 z-[9999] flex items-start sm:items-center justify-center pt-16 sm:pt-0 p-0 sm:p-4 bg-black/80 backdrop-blur-sm'
			onClick={onClose}
		>
			<div
				className='relative w-full h-[calc(100vh-4rem)] sm:h-auto sm:max-w-4xl sm:max-h-[90vh] bg-gradient-to-br from-black via-gray-900 to-black border-0 sm:border border-emerald-500/30 rounded-none sm:rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col overflow-hidden'
				onClick={e => e.stopPropagation()}
			>
				{/* Заголовок */}
				<div className='flex-shrink-0 bg-black/40 backdrop-blur-md border-b border-emerald-500/30 p-4 sm:p-6 flex justify-between items-center rounded-none sm:rounded-t-2xl'>
					<div className='flex items-center gap-2 sm:gap-3'>
						<Image
							src='/astro.png'
							alt='Космонавт'
							width={100}
							height={100}
							className='astro-icon w-16 h-16 sm:w-20 sm:h-20 object-contain'
						/>
						<h2 className='text-xl sm:text-2xl font-bold text-emerald-400'>
							Редактировать профиль
						</h2>
					</div>
					<button
						onClick={onClose}
						className='text-gray-400 hover:text-emerald-400 transition p-2 hover:bg-emerald-500/10 rounded-lg'
					>
						<FaTimes className='text-lg sm:text-xl' />
					</button>
				</div>

				{/* Контент */}
				<div className='flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 text-white custom-scrollbar'>
					{/* Имя */}
					<div className='space-y-2'>
						<label className='flex items-center gap-2 text-emerald-400 font-medium text-sm sm:text-base'>
							<FaFileSignature className='text-sm sm:text-base' /> Имя
						</label>
						<input
							type='text'
							value={fullName}
							onChange={e => setFullName(e.target.value)}
							className='w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition'
							placeholder='Ваше имя'
						/>
					</div>

					{/* Описание */}
					<div className='space-y-2'>
						<label className='text-emerald-400 font-medium text-sm sm:text-base'>Описание</label>
						<textarea
							value={description}
							onChange={e => setDescription(e.target.value)}
							rows={3}
							placeholder='Расскажите немного о себе...'
							className='w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition resize-none'
						/>
					</div>

					{/* Город - автодополнение с выпадающим списком */}
					<div className='space-y-2'>
						<label className='flex items-center gap-2 text-emerald-400 font-medium text-sm sm:text-base'>
							<FaCity className='text-sm sm:text-base' /> Город
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
									// Закрываем с небольшой задержкой, чтобы onClick успел сработать
									setTimeout(() => setShowCityDropdown(false), 200)
								}}
								className='w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition'
								placeholder='Начните вводить город...'
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
						<p className='text-xs text-gray-500'>Выберите из списка или введите свой город</p>
					</div>

					{/* Аватар */}
					<div className='space-y-2'>
						<label className='flex items-center gap-2 text-emerald-400 font-medium text-sm sm:text-base'>
							<FaImage className='text-sm sm:text-base' /> Аватар
						</label>
						<div className='flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'>
							<label
								htmlFor='avatar-upload'
								className='px-3 sm:px-4 py-2 text-sm sm:text-base bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer transition'
							>
								Загрузить фото
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
					</div>

					{/* Навыки */}
					<div className='space-y-2'>
						<label className='flex items-center gap-2 text-emerald-400 font-medium text-sm sm:text-base'>
							<FaCode className='text-sm sm:text-base' /> Навыки
						</label>
						<SkillsSelector skills={skills} setSkills={setSkills} />
					</div>
				</div>

				{/* Футер с кнопками */}
				<div className='flex-shrink-0 bg-black/40 backdrop-blur-md border-t border-emerald-500/30 p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end rounded-none sm:rounded-b-2xl'>
					<button
						onClick={onClose}
						className='w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 transition font-semibold'
					>
						Отмена
					</button>
					<button
						onClick={handleSave}
						disabled={saving}
						className='w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
					>
						{saving ? '💾 Сохраняем...' : '✅ Сохранить'}
					</button>
				</div>
			</div>
		</div>
	)
}
