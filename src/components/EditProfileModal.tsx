'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	FaCity,
	FaCode,
	FaFileSignature,
	FaImage,
	FaSearch,
	FaTimes,
} from 'react-icons/fa'
import { toast } from 'sonner'

const cityOptions = [
	{ value: 'Москва', label: 'Москва' },
	{ value: 'Санкт-Петербург', label: 'Санкт-Петербург' },
	{ value: 'Новосибирск', label: 'Новосибирск' },
	{ value: 'Екатеринбург', label: 'Екатеринбург' },
	{ value: 'Казань', label: 'Казань' },
	{ value: 'Нижний Новгород', label: 'Нижний Новгород' },
	{ value: 'Челябинск', label: 'Челябинск' },
	{ value: 'Самара', label: 'Самара' },
	{ value: 'Омск', label: 'Омск' },
	{ value: 'Ростов-на-Дону', label: 'Ростов-на-Дону' },
	{ value: 'Уфа', label: 'Уфа' },
	{ value: 'Красноярск', label: 'Красноярск' },
	{ value: 'Пермь', label: 'Пермь' },
	{ value: 'Воронеж', label: 'Воронеж' },
	{ value: 'Волгоград', label: 'Волгоград' },
	{ value: 'Краснодар', label: 'Краснодар' },
	{ value: 'Саратов', label: 'Саратов' },
	{ value: 'Тюмень', label: 'Тюмень' },
	{ value: 'Тольятти', label: 'Тольятти' },
	{ value: 'Ижевск', label: 'Ижевск' },
	{ value: 'Барнаул', label: 'Барнаул' },
	{ value: 'Ульяновск', label: 'Ульяновск' },
	{ value: 'Иркутск', label: 'Иркутск' },
	{ value: 'Хабаровск', label: 'Хабаровск' },
	{ value: 'Ярославль', label: 'Ярославль' },
	{ value: 'Владивосток', label: 'Владивосток' },
	{ value: 'Махачкала', label: 'Махачкала' },
	{ value: 'Томск', label: 'Томск' },
	{ value: 'Оренбург', label: 'Оренбург' },
	{ value: 'Кемерово', label: 'Кемерово' },
	{ value: 'Новокузнецк', label: 'Новокузнецк' },
	{ value: 'Рязань', label: 'Рязань' },
	{ value: 'Астрахань', label: 'Астрахань' },
	{ value: 'Набережные Челны', label: 'Набережные Челны' },
	{ value: 'Пенза', label: 'Пенза' },
	{ value: 'Липецк', label: 'Липецк' },
	{ value: 'Киров', label: 'Киров' },
	{ value: 'Чебоксары', label: 'Чебоксары' },
	{ value: 'Балашиха', label: 'Балашиха' },
	{ value: 'Калининград', label: 'Калининград' },
	{ value: 'Тула', label: 'Тула' },
	{ value: 'Курск', label: 'Курск' },
	{ value: 'Ставрополь', label: 'Ставрополь' },
	{ value: 'Улан-Удэ', label: 'Улан-Удэ' },
	{ value: 'Сочи', label: 'Сочи' },
	{ value: 'Тверь', label: 'Тверь' },
	{ value: 'Магнитогорск', label: 'Магнитогорск' },
	{ value: 'Иваново', label: 'Иваново' },
	{ value: 'Брянск', label: 'Брянск' },
	{ value: 'Белгород', label: 'Белгород' },
	{ value: 'Сургут', label: 'Сургут' },
	{ value: 'Владимир', label: 'Владимир' },
	{ value: 'Чита', label: 'Чита' },
	{ value: 'Нижний Тагил', label: 'Нижний Тагил' },
	{ value: 'Архангельск', label: 'Архангельск' },
	{ value: 'Калуга', label: 'Калуга' },
	{ value: 'Симферополь', label: 'Симферополь' },
	{ value: 'Смоленск', label: 'Смоленск' },
	{ value: 'Волжский', label: 'Волжский' },
	{ value: 'Якутск', label: 'Якутск' },
	{ value: 'Грозный', label: 'Грозный' },
	{ value: 'Подольск', label: 'Подольск' },
	{ value: 'Саранск', label: 'Саранск' },
	{ value: 'Череповец', label: 'Череповец' },
	{ value: 'Вологда', label: 'Вологда' },
	{ value: 'Орёл', label: 'Орёл' },
	{ value: 'Владикавказ', label: 'Владикавказ' },
	{ value: 'Йошкар-Ола', label: 'Йошкар-Ола' },
	{ value: 'Каменск-Уральский', label: 'Каменск-Уральский' },
	{ value: 'Мытищи', label: 'Мытищи' },
	{ value: 'Мурманск', label: 'Мурманск' },
	{ value: 'Нижневартовск', label: 'Нижневартовск' },
	{ value: 'Новороссийск', label: 'Новороссийск' },
	{ value: 'Таганрог', label: 'Таганрог' },
	{ value: 'Комсомольск-на-Амуре', label: 'Комсомольск-на-Амуре' },
	{ value: 'Петрозаводск', label: 'Петрозаводск' },
	{ value: 'Нальчик', label: 'Нальчик' },
	{ value: 'Стерлитамак', label: 'Стерлитамак' },
	{ value: 'Кострома', label: 'Кострома' },
	{ value: 'Химки', label: 'Химки' },
	{ value: 'Каменск-Шахтинский', label: 'Каменск-Шахтинский' },
	{ value: 'Тамбов', label: 'Тамбов' },
	{ value: 'Курган', label: 'Курган' },
	{ value: 'Энгельс', label: 'Энгельс' },
	{ value: 'Благовещенск', label: 'Благовещенск' },
	{ value: 'Севастополь', label: 'Севастополь' },
	{ value: 'Сыктывкар', label: 'Сыктывкар' },
	{ value: 'Нижнекамск', label: 'Нижнекамск' },
	{ value: 'Шахты', label: 'Шахты' },
	{ value: 'Ногинск', label: 'Ногинск' },
	{ value: 'Зеленоград', label: 'Зеленоград' },
	{ value: 'Орск', label: 'Орск' },
	{ value: 'Бийск', label: 'Бийск' },
	{ value: 'Димитровград', label: 'Димитровград' },
	{ value: 'Новый Уренгой', label: 'Новый Уренгой' },
	{ value: 'Псков', label: 'Псков' },
	{ value: 'Кисловодск', label: 'Кисловодск' },
	{ value: 'Армавир', label: 'Армавир' },
	{ value: 'Рыбинск', label: 'Рыбинск' },
	{ value: 'Ангарск', label: 'Ангарск' },
	{ value: 'Балашов', label: 'Балашов' },
	{ value: 'Элиста', label: 'Элиста' },
	{ value: 'Копейск', label: 'Копейск' },
	{ value: 'Березники', label: 'Березники' },
	{ value: 'Златоуст', label: 'Златоуст' },
	{ value: 'Миасс', label: 'Миасс' },
	{ value: 'Абакан', label: 'Абакан' },
	{ value: 'Норильск', label: 'Норильск' },
	{ value: 'Сызрань', label: 'Сызрань' },
	{ value: 'Великий Новгород', label: 'Великий Новгород' },
	{ value: 'Бердск', label: 'Бердск' },
	{ value: 'Салават', label: 'Салават' },
	{ value: 'Арзамас', label: 'Арзамас' },
	{ value: 'Коломна', label: 'Коломна' },
	{ value: 'Домодедово', label: 'Домодедово' },
	{ value: 'Жуковский', label: 'Жуковский' },
	{ value: 'Одинцово', label: 'Одинцово' },
	{ value: 'Кызыл', label: 'Кызыл' },
	{ value: 'Ессентуки', label: 'Ессентуки' },
	{ value: 'Новочеркасск', label: 'Новочеркасск' },
	{ value: 'Серпухов', label: 'Серпухов' },
	{ value: 'Нефтеюганск', label: 'Нефтеюганск' },
	{ value: 'Дербент', label: 'Дербент' },
	{ value: 'Каменка', label: 'Каменка' },
	{ value: 'Майкоп', label: 'Майкоп' },
	{ value: 'Клин', label: 'Клин' },
	{ value: 'Раменское', label: 'Раменское' },
	{ value: 'Сергиев Посад', label: 'Сергиев Посад' },
	{ value: 'Новоуральск', label: 'Новоуральск' },
	{ value: 'Альметьевск', label: 'Альметьевск' },
	{ value: 'Находка', label: 'Находка' },
	{ value: 'Обнинск', label: 'Обнинск' },
	{ value: 'Каменск', label: 'Каменск' },
	{ value: 'Хасавюрт', label: 'Хасавюрт' },
	{ value: 'Каспийск', label: 'Каспийск' },
	{ value: 'Назрань', label: 'Назрань' },
	{ value: 'Евпатория', label: 'Евпатория' },
	{ value: 'Пятигорск', label: 'Пятигорск' },
	{ value: 'Королёв', label: 'Королёв' },
	{ value: 'Люберцы', label: 'Люберцы' },
	{ value: 'Щёлково', label: 'Щёлково' },
	{ value: 'Красногорск', label: 'Красногорск' },
	{ value: 'Электросталь', label: 'Электросталь' },
	{ value: 'Железнодорожный', label: 'Железнодорожный' },
	{ value: 'Новомосковск', label: 'Новомосковск' },
	{ value: 'Сергиевск', label: 'Сергиевск' },
	{ value: 'Черкесск', label: 'Черкесск' },
	{ value: 'Геленджик', label: 'Геленджик' },
	{ value: 'Минеральные Воды', label: 'Минеральные Воды' },
	{ value: 'Будённовск', label: 'Будённовск' },
	{ value: 'Ковров', label: 'Ковров' },
	{ value: 'Саров', label: 'Саров' },
	{ value: 'Егорьевск', label: 'Егорьевск' },
	{ value: 'Уссурийск', label: 'Уссурийск' },
	{ value: 'Тобольск', label: 'Тобольск' },
	{ value: 'Ноябрьск', label: 'Ноябрьск' },
	{ value: 'Северск', label: 'Северск' },
	{ value: 'Муром', label: 'Муром' },
	{ value: 'Камышин', label: 'Камышин' },
	{ value: 'Каспийский', label: 'Каспийский' },
	{ value: 'Долгопрудный', label: 'Долгопрудный' },
	{ value: 'Пушкино', label: 'Пушкино' },
	{ value: 'Реутов', label: 'Реутов' },
	{ value: 'Нягань', label: 'Нягань' },
	{ value: 'Северодвинск', label: 'Северодвинск' },
	{ value: 'Ачинск', label: 'Ачинск' },
	{ value: 'Канск', label: 'Канск' },
	{ value: 'Минусинск', label: 'Минусинск' },
	{ value: 'Саянск', label: 'Саянск' },
	{ value: 'Усть-Илимск', label: 'Усть-Илимск' },
	{ value: 'Братск', label: 'Братск' },
	{ value: 'Ухта', label: 'Ухта' },
	{ value: 'Воркута', label: 'Воркута' },
	{ value: 'Печора', label: 'Печора' },
	{ value: 'Сосногорск', label: 'Сосногорск' },
	{ value: 'Когалым', label: 'Когалым' },
	{ value: 'Радужный', label: 'Радужный' },
	{ value: 'Мегион', label: 'Мегион' },
	{ value: 'Лангепас', label: 'Лангепас' },
	{ value: 'Пыть-Ях', label: 'Пыть-Ях' },
	{ value: 'Советский', label: 'Советский' },
	{ value: 'Белоярский', label: 'Белоярский' },
	{ value: 'Урай', label: 'Урай' },
	{ value: 'Ханты-Мансийск', label: 'Ханты-Мансийск' },
	{ value: 'Югорск', label: 'Югорск' },
	{ value: 'Лабытнанги', label: 'Лабытнанги' },
	{ value: 'Салехард', label: 'Салехард' },
	{ value: 'Надым', label: 'Надым' },
	{ value: 'Губкинский', label: 'Губкинский' },
	{ value: 'Тарко-Сале', label: 'Тарко-Сале' },
	{ value: 'Южно-Сахалинск', label: 'Южно-Сахалинск' },
]

// --- Навыки
const skillCategories: Record<string, string[]> = {
	'IT и программирование': [
		'JavaScript',
		'TypeScript',
		'React',
		'Next.js',
		'Node.js',
		'Python',
		'Django',
		'Bitrix',
		'PostgreSQL',
		'REST API',
		'Docker',
		'Git',
		'Linux',
	],
	Дизайн: ['UI/UX', 'Figma', 'Photoshop', 'Illustrator', 'Адаптив'],
	'Контент и копирайтинг': [
		'SEO',
		'Маркетинг',
		'Копирайтинг',
		'Редактура',
		'SMM',
	],
}

// --- Компонент выбора навыков
function SkillsSelector({
	skills,
	setSkills,
}: {
	skills: string[]
	setSkills: (s: string[]) => void
}) {
	const addSkill = (skill: string) => {
		if (!skills.includes(skill)) setSkills([...skills, skill])
	}

	const removeSkill = (skill: string) => {
		setSkills(skills.filter(s => s !== skill))
	}

	return (
		<div className='space-y-5'>
			<div className='flex flex-wrap gap-2 p-3 neon-box'>
				{skills.map(skill => (
					<span
						key={skill}
						className='px-3 py-1 bg-emerald-800/40 text-emerald-200 text-sm rounded-full border border-emerald-700 flex items-center gap-2'
					>
						{skill}
						<button
							type='button'
							onClick={() => removeSkill(skill)}
							className='text-red-400 hover:text-red-500 transition'
						>
							✕
						</button>
					</span>
				))}
				<input
					type='text'
					placeholder='Добавить...'
					className='bg-transparent text-emerald-300 focus:outline-none px-2 w-32'
					onKeyDown={e => {
						if (e.key === 'Enter' && e.currentTarget.value.trim()) {
							addSkill(e.currentTarget.value.trim())
							e.currentTarget.value = ''
						}
					}}
				/>
			</div>

			{Object.entries(skillCategories).map(([category, items]) => (
				<div key={category}>
					<h3 className='text-emerald-500 text-sm mb-2 font-medium'>
						{category}
					</h3>
					<div className='flex flex-wrap gap-2'>
						{items.map(skill => (
							<button
								key={skill}
								type='button'
								onClick={() => addSkill(skill)}
								className={`px-3 py-1 text-sm rounded-full border transition-all duration-300 ${
									skills.includes(skill)
										? 'bg-emerald-700 text-white border-emerald-600 shadow-[0_0_10px_rgba(0,255,150,0.4)]'
										: 'bg-[#0a0f0e]/60 text-emerald-300 border-emerald-800 hover:border-emerald-600'
								}`}
							>
								{skill}
							</button>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

// --- Неоновый поиск города
function NeonCitySelect({
	value,
	options,
	onChange,
}: {
	value: string
	options: { value: string; label: string }[]
	onChange: (val: string) => void
}) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [rect, setRect] = useState<DOMRect | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const filtered = options.filter(o =>
		o.label.toLowerCase().includes(query.toLowerCase())
	)

	const measure = () => {
		if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect())
	}

	useEffect(() => {
		if (open) {
			measure()
			inputRef.current?.focus()
		}
	}, [open])

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			)
				setOpen(false)
		}
		const onScrollResize = () => open && measure()
		document.addEventListener('mousedown', handleClick)
		window.addEventListener('resize', onScrollResize)
		window.addEventListener('scroll', onScrollResize, true)
		return () => {
			document.removeEventListener('mousedown', handleClick)
			window.removeEventListener('resize', onScrollResize)
			window.removeEventListener('scroll', onScrollResize, true)
		}
	}, [open])

	return (
		<div ref={containerRef} className='relative z-[200]'>
			<button
				ref={buttonRef}
				type='button'
				onClick={() => setOpen(v => !v)}
				className={`neon-select-btn w-full flex justify-between items-center ${
					open ? 'border-emerald-500 shadow-[0_0_15px_rgba(0,255,150,0.3)]' : ''
				}`}
			>
				<span className={value ? '' : 'text-emerald-600/70'}>
					{value || 'Выберите или введите город...'}
				</span>
				<FaCity className='text-emerald-400' />
			</button>

			{open &&
				rect &&
				createPortal(
					<div
						style={{
							position: 'absolute',
							left: rect.left + window.scrollX,
							top: rect.bottom + window.scrollY + 6,
							width: rect.width,
							zIndex: 9999,
						}}
						className='bg-[#00120c]/95 border border-emerald-700 rounded-lg shadow-[0_0_25px_rgba(0,255,150,0.2)]'
					>
						<div className='flex items-center gap-2 px-3 py-2 border-b border-emerald-800'>
							<FaSearch className='text-emerald-400 shrink-0' />
							<input
								ref={inputRef}
								type='text'
								value={query}
								onChange={e => setQuery(e.target.value)}
								placeholder='Начните вводить город...'
								className='w-full bg-transparent text-emerald-200 placeholder-emerald-600 focus:outline-none'
							/>
						</div>

						<div className='max-h-56 overflow-y-auto custom-scrollbar'>
							{filtered.length ? (
								filtered.map(opt => (
									<button
										key={opt.value}
										type='button'
										onClick={() => {
											onChange(opt.value)
											setQuery('')
											setOpen(false)
										}}
										className={`w-full text-left px-4 py-2 transition ${
											opt.value === value
												? 'bg-emerald-700/40 text-white'
												: 'text-emerald-200 hover:bg-emerald-700/20'
										}`}
									>
										{opt.label}
									</button>
								))
							) : (
								<div className='px-4 py-3 text-emerald-500 text-sm'>
									Не найдено
								</div>
							)}
						</div>
					</div>,
					document.body
				)}
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

	useEffect(() => {
		setMounted(true)
	}, [])

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

	return createPortal(
		<div
			className='fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'
			onClick={onClose}
		>
			<div
				className='relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-gray-900 to-black border border-emerald-500/30 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col'
				onClick={e => e.stopPropagation()}
			>
				<div className='flex-shrink-0 bg-gray-900/95 backdrop-blur-md border-b border-emerald-500/30 p-6 flex justify-between items-center rounded-t-2xl'>
					<div className='flex items-center gap-3'>
						<img src='/astro.png' alt='Космонавт' className='w-10 h-10' />
						<h2 className='text-2xl font-bold text-emerald-400'>
							Редактировать профиль
						</h2>
					</div>
					<button
						onClick={onClose}
						className='text-gray-400 hover:text-white transition p-2 hover:bg-gray-800 rounded-lg'
					>
						<FaTimes className='text-2xl' />
					</button>
				</div>

				<div className='flex-1 overflow-y-auto p-6 space-y-6 text-white custom-scrollbar'>
					{/* === ИМЯ === */}
					<div className='neon-box'>
						<label className='label flex items-center gap-2'>
							<FaFileSignature /> Имя
						</label>
						<input
							type='text'
							value={fullName}
							onChange={e => setFullName(e.target.value)}
							className='input w-full'
						/>
					</div>

					{/* === ОПИСАНИЕ === */}
					<div className='neon-box'>
						<label className='label'>Описание</label>
						<textarea
							value={description}
							onChange={e => setDescription(e.target.value)}
							rows={3}
							placeholder='Расскажите немного о себе...'
							className='input h-24 resize-none w-full'
						/>
					</div>

					{/* === ГОРОД === */}
					<div className='neon-box relative z-40 overflow-visible'>
						<label className='label flex items-center gap-2'>
							<FaCity /> Город
						</label>
						<NeonCitySelect
							value={location}
							options={cityOptions}
							onChange={val => setLocation(val)}
						/>
					</div>

					{/* === АВАТАР === */}
					<div className='neon-box flex flex-col sm:flex-row items-center gap-6'>
						<div className='flex-1'>
							<label className='label flex items-center gap-2'>
								<FaImage /> Аватар
							</label>
							<label
								htmlFor='avatar-upload'
								className='upload-btn inline-block cursor-pointer'
							>
								📷 Загрузить
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
						</div>
						{avatarPreview && (
							<div className='w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-600 shadow-[0_0_20px_rgba(0,255,150,0.4)]'>
								<img
									src={avatarPreview}
									alt='Аватар'
									className='w-full h-full object-cover'
								/>
							</div>
						)}
					</div>

					{/* === НАВЫКИ === */}
					<div className='neon-box'>
						<label className='label flex items-center gap-2'>
							<FaCode /> Навыки
						</label>
						<SkillsSelector skills={skills} setSkills={setSkills} />
					</div>
				</div>

				<div className='flex-shrink-0 bg-gray-900/95 backdrop-blur-md border-t border-emerald-500/30 p-6 flex gap-4 justify-end rounded-b-2xl'>
					<button
						onClick={onClose}
						className='px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition font-semibold'
					>
						Отмена
					</button>
					<button
						onClick={handleSave}
						disabled={saving}
						className='px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]'
					>
						{saving ? '💾 Сохраняем...' : '✅ Сохранить изменения'}
					</button>
				</div>
			</div>
		</div>,
		document.body
	)
}
