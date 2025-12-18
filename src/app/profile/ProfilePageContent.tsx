'use client'

import AccountTypeBadge from '@/components/AccountTypeBadge'
import BadgeIcon from '@/components/BadgeIcon'
import BadgesModal from '@/components/BadgesModal'
import EditProfileModal from '@/components/EditProfileModal'
import { LevelBadge } from '@/components/LevelBadge'
import { ProfileBackgroundSelector } from '@/components/ProfileBackgroundSelector'
import { useUser } from '@/context/UserContext'
import { getBackgroundById } from '@/lib/level/profileBackgrounds'
import { getLevelVisuals } from '@/lib/level/rewards'
import '@/styles/level-animations.css'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import {
	FaArrowDown,
	FaArrowUp,
	FaAward,
	FaBriefcase,
	FaCalculator,
	FaCamera,
	FaCalendarAlt,
	FaCertificate,
	FaChartLine,
	FaChevronRight,
	FaCode,
	FaComments,
	FaCreditCard,
	FaDatabase,
	FaEdit,
	FaFileAlt,
	FaGlobe,
	FaImage,
	FaInfoCircle,
	FaJs,
	FaMicrophone,
	FaMoneyBillWave,
	FaPalette,
	FaPaintBrush,
	FaPen,
	FaPython,
	FaSearch,
	FaShoppingCart,
	FaStar,
	FaStore,
	FaTasks,
	FaToolbox,
	FaTrophy,
	FaUserCircle,
	FaVideo,
	FaWallet,
} from 'react-icons/fa'

type Review = {
	id: string
	rating: number
	comment: string
	createdAt: string
	task: { title: string }
	fromUser: { fullName?: string; email: string }
}

type FullUser = {
	id: string
	fullName?: string
	email: string
	role: string
	isExecutor?: boolean
	description?: string
	location?: string
	skills?: string[]
	avatarUrl?: string
	balance?: number
	frozenBalance?: number
	xp?: number
	xpComputed?: number
	completedTasksCount?: number
	avgRating?: number
	// B2B/B2C
	accountType?: 'INDIVIDUAL' | 'SELF_EMPLOYED' | 'SOLE_PROPRIETOR' | 'COMPANY'
	companyName?: string
	inn?: string
	kpp?: string
	ogrn?: string
	legalAddress?: string
	level?: {
		id: string
		name: string
		description: string
		slug: string
	}
	badges?: Array<{
		id: string
		earnedAt: string
		badge: {
			id: string
			name: string
			description: string
			icon: string
		}
	}>
	certifications?: Array<{
		id: string
		level: string
		grantedAt: string
		subcategory: {
			id: string
			name: string
		}
	}>
	executedTasks?: Array<{
		id: string
		title: string
		description: string
		price?: number
		completedAt?: string
		customer: {
			id: string
			fullName?: string
			email: string
		}
		review?: {
			id: string
			rating: number
			comment: string
		}
	}>
	_count?: {
		executedTasks: number
		reviewsReceived: number
		responses: number
	}
	customerStats?: {
		createdTasks: number
		completedTasks: number
		totalSpent: number
		uniqueExecutors: number
	}
}

type Tab =
	| 'overview'
	| 'achievements'
	| 'reviews'
	| 'tasks'
	| 'wallet'
	| 'certifications'

const getSkillIcon = (skill: string) => {
	const lower = skill.toLowerCase()

	// 1С
	if (lower.includes('1с') || lower.includes('1c'))
		return <FaCalculator className='mr-1 text-blue-500' />

	// Языки программирования
	if (lower.includes('python'))
		return <FaPython className='mr-1 text-emerald-400' />
	if (
		lower.includes('js') ||
		lower.includes('javascript') ||
		lower.includes('typescript') ||
		lower.includes('node')
	)
		return <FaJs className='mr-1 text-yellow-400' />
	if (lower.includes('java')) return <FaCode className='mr-1 text-orange-400' />
	if (
		lower.includes('c#') ||
		lower.includes('csharp') ||
		lower.includes('.net')
	)
		return <FaCode className='mr-1 text-purple-400' />
	if (lower.includes('php')) return <FaCode className='mr-1 text-indigo-400' />
	if (lower.includes('go') || lower.includes('golang'))
		return <FaCode className='mr-1 text-cyan-400' />
	if (lower.includes('rust')) return <FaCode className='mr-1 text-orange-500' />
	if (lower.includes('ruby')) return <FaCode className='mr-1 text-red-400' />
	if (lower.includes('kotlin'))
		return <FaCode className='mr-1 text-purple-500' />

	// Фреймворки и библиотеки
	if (
		lower.includes('react') ||
		lower.includes('next.js') ||
		lower.includes('nextjs') ||
		lower.includes('next')
	)
		return <FaCode className='mr-1 text-blue-400' />
	if (lower.includes('vue') || lower.includes('vue.js'))
		return <FaCode className='mr-1 text-green-400' />
	if (lower.includes('angular')) return <FaCode className='mr-1 text-red-500' />
	if (
		lower.includes('node') ||
		lower.includes('nodejs') ||
		lower.includes('node.js')
	)
		return <FaCode className='mr-1 text-green-500' />
	if (
		lower.includes('django') ||
		lower.includes('flask') ||
		lower.includes('fastapi')
	)
		return <FaCode className='mr-1 text-emerald-500' />
	if (lower.includes('laravel') || lower.includes('symfony'))
		return <FaCode className='mr-1 text-red-500' />
	if (lower.includes('spring') || lower.includes('rails'))
		return <FaCode className='mr-1 text-green-500' />
	if (lower.includes('wordpress') || lower.includes('drupal') || lower.includes('joomla') || lower.includes('bitrix'))
		return <FaCode className='mr-1 text-blue-600' />

	// Базы данных
	if (lower.includes('postgresql') || lower.includes('postgres'))
		return <FaDatabase className='mr-1 text-blue-500' />
	if (lower.includes('mysql') || lower.includes('mariadb'))
		return <FaDatabase className='mr-1 text-blue-400' />
	if (lower.includes('mongodb') || lower.includes('mongo'))
		return <FaDatabase className='mr-1 text-green-500' />
	if (lower.includes('redis'))
		return <FaDatabase className='mr-1 text-red-500' />
	if (lower.includes('elasticsearch') || lower.includes('elastic'))
		return <FaDatabase className='mr-1 text-yellow-500' />
	if (
		(lower.includes('sql') ||
			lower.includes('db') ||
			lower.includes('database') ||
			lower.includes('базы данных')) &&
		!lower.includes('postgresql') &&
		!lower.includes('postgres') &&
		!lower.includes('mysql') &&
		!lower.includes('mariadb') &&
		!lower.includes('mongodb') &&
		!lower.includes('mongo') &&
		!lower.includes('elastic')
	)
		return <FaDatabase className='mr-1 text-blue-400' />

	// Сеть и инфраструктура
	if (
		lower.includes('docker') ||
		lower.includes('kubernetes') ||
		lower.includes('k8s')
	)
		return <FaGlobe className='mr-1 text-blue-400' />
	if (
		lower.includes('aws') ||
		lower.includes('azure') ||
		lower.includes('gcp') ||
		lower.includes('cloud')
	)
		return <FaGlobe className='mr-1 text-orange-400' />
	if (
		lower.includes('linux') ||
		lower.includes('git') ||
		lower.includes('ci/cd') ||
		lower.includes('jenkins') ||
		lower.includes('devops')
	)
		return <FaGlobe className='mr-1 text-indigo-400' />

	// Дизайн
	if (
		lower.includes('figma') ||
		lower.includes('adobe xd') ||
		lower.includes('sketch') ||
		lower.includes('ui/ux') ||
		lower.includes('ui') ||
		lower.includes('ux') ||
		lower.includes('дизайн') ||
		lower.includes('design') ||
		lower.includes('адаптивный дизайн') ||
		lower.includes('веб-дизайн') ||
		lower.includes('мобильный дизайн') ||
		lower.includes('интерактивный дизайн')
	)
		return <FaPalette className='mr-1 text-pink-400' />
	if (
		lower.includes('photoshop') ||
		lower.includes('illustrator') ||
		lower.includes('indesign') ||
		lower.includes('adobe')
	)
		return <FaImage className='mr-1 text-purple-400' />
	if (
		lower.includes('after effects') ||
		lower.includes('premiere') ||
		lower.includes('анимация') ||
		lower.includes('моушн') ||
		lower.includes('моушн-дизайн') ||
		lower.includes('видео')
	)
		return <FaVideo className='mr-1 text-red-400' />
	if (
		lower.includes('blender') ||
		lower.includes('cinema 4d') ||
		lower.includes('3d') ||
		lower.includes('3d-графика')
	)
		return <FaImage className='mr-1 text-cyan-400' />
	if (
		lower.includes('логотип') ||
		lower.includes('фирменный стиль') ||
		lower.includes('презентация') ||
		lower.includes('презентации') ||
		lower.includes('инфографика') ||
		lower.includes('полиграфия') ||
		lower.includes('иллюстрации') ||
		lower.includes('иконки')
	)
		return <FaPaintBrush className='mr-1 text-pink-500' />

	// Контент и копирайтинг
	if (
		lower.includes('копирайтинг') ||
		lower.includes('контент') ||
		lower.includes('контент-маркетинг') ||
		lower.includes('контент-план') ||
		lower.includes('текст') ||
		lower.includes('статья') ||
		lower.includes('написание статей') ||
		lower.includes('seo-тексты') ||
		lower.includes('коммерческие тексты') ||
		lower.includes('посты для соцсетей') ||
		lower.includes('редактур') ||
		lower.includes('корректур')
	)
		return <FaPen className='mr-1 text-yellow-500' />
	if (
		lower.includes('seo') ||
		lower.includes('smm') ||
		lower.includes('маркетинг') ||
		lower.includes('реклам') ||
		lower.includes('таргетированная реклама') ||
		lower.includes('контекстная реклама') ||
		lower.includes('email-маркетинг')
	)
		return <FaChartLine className='mr-1 text-green-500' />
	if (
		lower.includes('перевод') ||
		lower.includes('нейминг') ||
		lower.includes('слоган') ||
		lower.includes('сценарий') ||
		lower.includes('сценарии')
	)
		return <FaFileAlt className='mr-1 text-blue-400' />

	// Бизнес и жизнь
	if (
		lower.includes('консалтинг') ||
		lower.includes('бизнес') ||
		lower.includes('бизнес-планы') ||
		lower.includes('коучинг') ||
		lower.includes('менторинг') ||
		lower.includes('обучение')
	)
		return <FaBriefcase className='mr-1 text-indigo-400' />
	if (
		lower.includes('pm') ||
		lower.includes('проект') ||
		lower.includes('проектный менеджмент') ||
		lower.includes('scrum') ||
		lower.includes('agile') ||
		lower.includes('kanban')
	)
		return <FaChartLine className='mr-1 text-blue-500' />
	if (
		lower.includes('hr') ||
		lower.includes('персонал') ||
		lower.includes('подбор персонала') ||
		lower.includes('юридическ') ||
		lower.includes('бухгалтер') ||
		lower.includes('бухгалтерия') ||
		lower.includes('документооборот') ||
		lower.includes('продажи') ||
		lower.includes('переговоры') ||
		lower.includes('финансы')
	)
		return <FaBriefcase className='mr-1 text-gray-500' />

	// Аудио, видео, съёмка
	if (
		lower.includes('видео') ||
		lower.includes('видеомонтаж') ||
		lower.includes('монтаж') ||
		lower.includes('цветокоррекция') ||
		lower.includes('видеосъёмка')
	)
		return <FaVideo className='mr-1 text-red-500' />
	if (
		lower.includes('фото') ||
		lower.includes('фотосъёмка') ||
		lower.includes('съёмка') ||
		lower.includes('обработка фото')
	)
		return <FaCamera className='mr-1 text-purple-500' />
	if (
		lower.includes('звук') ||
		lower.includes('звукорежиссура') ||
		lower.includes('озвучка') ||
		lower.includes('субтитр') ||
		lower.includes('подкаст') ||
		lower.includes('подкасты') ||
		lower.includes('музыка') ||
		lower.includes('аудио-постпродакшн')
	)
		return <FaMicrophone className='mr-1 text-blue-400' />
	if (lower.includes('youtube') || lower.includes('стриминг'))
		return <FaVideo className='mr-1 text-red-600' />

	// Маркетплейсы
	if (
		lower.includes('wildberries') ||
		lower.includes('ozon') ||
		lower.includes('яндекс.маркет') ||
		lower.includes('авито') ||
		lower.includes('юла') ||
		lower.includes('маркетплейс')
	)
		return <FaShoppingCart className='mr-1 text-orange-500' />
	if (
		lower.includes('карточк') ||
		lower.includes('настройка карточек') ||
		lower.includes('seo карточек') ||
		lower.includes('продвижение') ||
		lower.includes('работа с отзывами') ||
		lower.includes('логистик') ||
		lower.includes('фулфилмент')
	)
		return <FaStore className='mr-1 text-green-600' />

	// Соцсети и мессенджеры
	if (
		lower.includes('вконтакте') ||
		lower.includes('vk') ||
		lower.includes('telegram') ||
		lower.includes('whatsapp') ||
		lower.includes('instagram') ||
		lower.includes('facebook') ||
		lower.includes('одноклассники') ||
		lower.includes('tiktok') ||
		lower.includes('соцсет') ||
		lower.includes('мессенджер')
	)
		return <FaComments className='mr-1 text-blue-500' />
	if (
		lower.includes('сообществ') ||
		lower.includes('модерация') ||
		lower.includes('контент для соцсетей')
	)
		return <FaComments className='mr-1 text-purple-500' />

	// Тестирование и QA
	if (
		lower.includes('тестирование') ||
		lower.includes('qa') ||
		lower.includes('selenium') ||
		lower.includes('jest')
	)
		return <FaCode className='mr-1 text-green-400' />

	// AI / ML
	if (
		lower.includes('ai') ||
		lower.includes('ml') ||
		lower.includes('нейросет') ||
		lower.includes('tensorflow') ||
		lower.includes('pytorch')
	)
		return <FaCode className='mr-1 text-purple-600' />

	// Игровая разработка
	if (
		lower.includes('игр') ||
		lower.includes('unity') ||
		lower.includes('unreal')
	)
		return <FaCode className='mr-1 text-indigo-500' />

	// Другие технологии
	if (
		lower.includes('html') ||
		lower.includes('css') ||
		lower.includes('sass') ||
		lower.includes('less') ||
		lower.includes('scss') ||
		lower.includes('tailwind') ||
		lower.includes('bootstrap') ||
		lower.includes('вёрстк') ||
		lower.includes('адаптивная вёрстка')
	)
		return <FaCode className='mr-1 text-orange-400' />
	if (lower.includes('graphql'))
		return <FaCode className='mr-1 text-pink-500' />
	if (
		lower.includes('rest') ||
		lower.includes('api') ||
		lower.includes('rest api') ||
		lower.includes('интеграции api') ||
		lower.includes('websocket')
	)
		return <FaCode className='mr-1 text-green-400' />
	if (
		lower.includes('frontend') ||
		lower.includes('backend') ||
		lower.includes('fullstack')
	)
		return <FaCode className='mr-1 text-cyan-500' />
	if (
		lower.includes('телеграм-бот') ||
		lower.includes('телеграм-боты') ||
		lower.includes('скрипт') ||
		lower.includes('скрипты') ||
		lower.includes('автоматизац') ||
		lower.includes('автоматизация') ||
		lower.includes('автоматизация процессов')
	)
		return <FaCode className='mr-1 text-yellow-500' />
	if (
		lower.includes('аналитик') ||
		lower.includes('аналитика') ||
		lower.includes('google analytics') ||
		lower.includes('метрика') ||
		lower.includes('яндекс.метрика') ||
		lower.includes('веб-аналитика')
	)
		return <FaChartLine className='mr-1 text-blue-600' />
	if (
		lower.includes('микроразметка') ||
		lower.includes('pwa') ||
		lower.includes('техническая поддержка') ||
		lower.includes('администрирование') ||
		lower.includes('безопасность') ||
		lower.includes('парсинг данных')
	)
		return <FaCode className='mr-1 text-gray-500' />

	// Общее
	return <FaToolbox className='mr-1 text-gray-400' />
}

export default function ProfilePageContent() {
	const { user, token, loading, login } = useUser()
	const [reviews, setReviews] = useState<Review[]>([])
	const [profile, setProfile] = useState<FullUser | null>(null)
	const [loadingProfile, setLoadingProfile] = useState(true)
	const [activeTab, setActiveTab] = useState<Tab>('overview')
	const [customerCompletedTasks, setCustomerCompletedTasks] = useState<any[]>(
		[]
	)
	const [loadingCustomerTasks, setLoadingCustomerTasks] = useState(false)

	const [transactions, setTransactions] = useState<any[]>([])
	const [transactionsLoaded, setTransactionsLoaded] = useState(false)
	const [amount, setAmount] = useState(1)
	const [depositPhone, setDepositPhone] = useState('')
	const [useTBank, setUseTBank] = useState(true) // Использовать Т-Банк по умолчанию
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [withdrawError, setWithdrawError] = useState<string | null>(null)
	const [withdrawLoading, setWithdrawLoading] = useState(false)
	const [withdrawPhone, setWithdrawPhone] = useState('')
	const [withdrawMethod, setWithdrawMethod] = useState<'sbp' | 'saved-card'>('sbp')
	const [sbpBanks, setSbpBanks] = useState<Array<{MemberId: string; MemberName: string; MemberNameRus: string}>>([])
	const [selectedBankId, setSelectedBankId] = useState<string>('')
	const [loadingBanks, setLoadingBanks] = useState(false)
	// Привязанные карты для вывода
	const [savedCards, setSavedCards] = useState<Array<{id: string; cardId: string; pan: string; expDate: string; isDefault: boolean}>>([])
	const [selectedCardId, setSelectedCardId] = useState<string>('')
	const [loadingCards, setLoadingCards] = useState(false)
	const [addingCard, setAddingCard] = useState(false)
	const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false)
	const [bankSearchQuery, setBankSearchQuery] = useState('')
	// Состояния для данных карты
	const [cardNumber, setCardNumber] = useState('')
	const [cardExpDate, setCardExpDate] = useState('')
	const [cardHolder, setCardHolder] = useState('')
	const [cardCvv, setCardCvv] = useState('')
	const amountInputRef = useRef<HTMLInputElement>(null)
	const previousAmountRef = useRef<number>(0)
	const depositAmountInputRef = useRef<HTMLInputElement>(null)
	const previousDepositAmountRef = useRef<number>(0)

	// Функция форматирования телефона в маску +7 (XXX) XXX-XX-XX
	const formatPhoneNumber = (value: string): string => {
		// Убираем все нецифровые символы кроме +
		const digitsOnly = value.replace(/[^\d+]/g, '')
		
		// Если начинается не с +7, добавляем +7
		if (!digitsOnly.startsWith('+7') && !digitsOnly.startsWith('7')) {
			const cleanDigits = digitsOnly.replace(/\+/g, '')
			if (cleanDigits.length === 0) return '+7'
			if (cleanDigits.startsWith('7')) {
				return `+7${cleanDigits.slice(1)}`
			}
			return `+7${cleanDigits}`
		}
		
		// Убираем + если есть, оставляем только цифры
		let phone = digitsOnly.replace(/\+/g, '')
		
		// Если начинается с 7, убираем её (будет добавлена +7)
		if (phone.startsWith('7')) {
			phone = phone.slice(1)
		}
		
		// Ограничиваем до 10 цифр (после +7)
		phone = phone.slice(0, 10)
		
		// Форматируем: +7 (XXX) XXX-XX-XX
		if (phone.length === 0) return '+7'
		if (phone.length <= 3) return `+7 (${phone}`
		if (phone.length <= 6) return `+7 (${phone.slice(0, 3)}) ${phone.slice(3)}`
		if (phone.length <= 8) return `+7 (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
		return `+7 (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6, 8)}-${phone.slice(8, 10)}`
	}

	// Функция для получения только цифр из отформатированного телефона
	const getPhoneDigits = (formattedPhone: string): string => {
		const digits = formattedPhone.replace(/\D/g, '')
		// Если начинается с 7, оставляем как есть, иначе добавляем 7
		if (digits.startsWith('7')) {
			return digits.slice(0, 11) // +7 и 10 цифр
		}
		return `7${digits.slice(0, 10)}` // Добавляем 7 и ограничиваем 10 цифрами
	}

	// Функция форматирования номера карты (добавляет пробелы каждые 4 цифры)
	const formatCardNumber = (value: string): string => {
		const digitsOnly = value.replace(/\D/g, '').slice(0, 16)
		return digitsOnly.replace(/(.{4})/g, '$1 ').trim()
	}

	// Функция форматирования срока действия карты (MM/YY)
	const formatCardExpDate = (value: string): string => {
		const digitsOnly = value.replace(/\D/g, '').slice(0, 4)
		if (digitsOnly.length <= 2) return digitsOnly
		return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}`
	}

	// Функция форматирования CVV (только 3 цифры)
	const formatCardCvv = (value: string): string => {
		return value.replace(/\D/g, '').slice(0, 3)
	}

	// Функция создания CardData строки для отправки в Т-Банк
	const createCardDataString = (): string => {
		const pan = cardNumber.replace(/\D/g, '')
		const expDate = cardExpDate.replace(/\D/g, '')
		const cardHolderName = cardHolder.trim().toUpperCase()
		const cvv = cardCvv.replace(/\D/g, '')

		const parts: string[] = []
		if (pan) parts.push(`PAN=${pan}`)
		if (expDate.length === 4) parts.push(`ExpDate=${expDate}`)
		if (cardHolderName) parts.push(`CardHolder=${cardHolderName}`)
		if (cvv) parts.push(`CVV=${cvv}`)

		return parts.join(';')
	}

	// Состояния для пополнения баланса
	const [depositAmount, setDepositAmount] = useState(1000)
	const [depositLoading, setDepositLoading] = useState(false)
	const [depositError, setDepositError] = useState<string | null>(null)
	const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)
	const [checkingPayment, setCheckingPayment] = useState(false)
	const [manualPaymentId, setManualPaymentId] = useState('')
	const [showManualCheck, setShowManualCheck] = useState(false)
	const [checkingBadges, setCheckingBadges] = useState(false)
	const [badgesModalOpen, setBadgesModalOpen] = useState(false)
	const [lockedBadges, setLockedBadges] = useState<any[]>([])
	const [backgroundSelectorOpen, setBackgroundSelectorOpen] = useState(false)
	const [profileBackground, setProfileBackground] = useState<string | null>(
		null
	)
	const [userLevel, setUserLevel] = useState(1)

	const fetchProfile = async () => {
		if (!token) return
		try {
			const res = await fetch('/api/profile', {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!res.ok) throw new Error('Ошибка загрузки профиля')
			const data = await res.json()
			console.log('Профиль загружен:', {
				skills: data.user?.skills,
				role: data.user?.role,
			})
			setProfile(data.user)
			login(data.user, token)

			// Загружаем фон профиля
			const bgRes = await fetch('/api/profile/background', {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (bgRes.ok) {
				const bgData = await bgRes.json()
				setProfileBackground(bgData.backgroundId || 'default')
			}

			// Получаем уровень через API (так как getLevelFromXP использует Prisma и работает только на сервере)
			const levelRes = await fetch('/api/users/me/level', {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (levelRes.ok) {
				const levelData = await levelRes.json()
				setUserLevel(levelData.level || 1)
			} else {
				// Fallback: используем уровень из профиля или дефолтный
				setUserLevel(parseInt(data.user?.level?.slug || '1') || 1)
			}
		} catch (err) {
			console.error('Ошибка загрузки профиля:', err)
		} finally {
			setLoadingProfile(false)
		}
	}

	// Ленивая загрузка транзакций только при открытии вкладки wallet
	useEffect(() => {
		const fetchTransactions = async () => {
			if (!token || activeTab !== 'wallet') return
			try {
				const txRes = await fetch('/api/wallet/transactions', {
					headers: { Authorization: `Bearer ${token}` },
				})
				if (txRes.ok) {
					const txData = await txRes.json()
					console.log('📊 Загружены транзакции:', txData.transactions?.length || 0)
					setTransactions(txData.transactions || [])
					setTransactionsLoaded(true)
				} else {
					console.error('Ошибка загрузки транзакций:', txRes.status)
				}
			} catch (txErr) {
				console.error('Ошибка загрузки транзакций:', txErr)
			}
		}
		// Загружаем транзакции каждый раз при открытии вкладки wallet
		if (activeTab === 'wallet' && !transactionsLoaded) {
			fetchTransactions()
		}
	}, [token, activeTab, transactionsLoaded])

	useEffect(() => {
		fetchProfile()
		// Восстанавливаем последний PaymentId из localStorage
		const savedPaymentId = localStorage.getItem('lastTBankPaymentId')
		if (savedPaymentId) {
			setLastPaymentId(savedPaymentId)
		}
	}, [token])

	// Загрузка списка банков для СБП
	useEffect(() => {
		const loadBanks = async () => {
			if (!token || activeTab !== 'wallet') return
			setLoadingBanks(true)
			try {
				const res = await fetch('/api/wallet/tbank/get-sbp-banks', {
					headers: { Authorization: `Bearer ${token}` },
				})
				const data = await res.json()
				if (data.success && data.banks && data.banks.length > 0) {
					setSbpBanks(data.banks)
					if (!selectedBankId && data.banks.length > 0) {
						setSelectedBankId(data.banks[0].MemberId)
					}
				} else {
					// Fallback банки
					const fallbackBanks = [
						{ MemberId: '100000000004', MemberName: 'Tinkoff', MemberNameRus: 'Т-Банк' },
						{ MemberId: '100000000111', MemberName: 'Sberbank', MemberNameRus: 'Сбербанк' },
						{ MemberId: '100000000005', MemberName: 'VTB', MemberNameRus: 'ВТБ' },
						{ MemberId: '100000000008', MemberName: 'Alfa-Bank', MemberNameRus: 'Альфа-Банк' },
					]
					setSbpBanks(fallbackBanks)
					if (!selectedBankId) {
						setSelectedBankId(fallbackBanks[0].MemberId)
					}
				}
			} catch (err) {
				console.error('Ошибка загрузки банков:', err)
				// Fallback банки при ошибке
				const fallbackBanks = [
					{ MemberId: '100000000004', MemberName: 'Tinkoff', MemberNameRus: 'Т-Банк' },
					{ MemberId: '100000000111', MemberName: 'Sberbank', MemberNameRus: 'Сбербанк' },
					{ MemberId: '100000000005', MemberName: 'VTB', MemberNameRus: 'ВТБ' },
					{ MemberId: '100000000008', MemberName: 'Alfa-Bank', MemberNameRus: 'Альфа-Банк' },
				]
				setSbpBanks(fallbackBanks)
				if (!selectedBankId) {
					setSelectedBankId(fallbackBanks[0].MemberId)
				}
			} finally {
				setLoadingBanks(false)
			}
		}
		loadBanks()
	}, [token, activeTab])

	// Загрузка привязанных карт
	useEffect(() => {
		const loadCards = async () => {
			if (!token || activeTab !== 'wallet') return
			setLoadingCards(true)
			try {
				const res = await fetch('/api/wallet/tbank/cards', {
					headers: { Authorization: `Bearer ${token}` },
				})
				const data = await res.json()
				if (data.success && data.cards) {
					setSavedCards(data.cards)
					const defaultCard = data.cards.find((c: any) => c.isDefault)
					if (defaultCard) {
						setSelectedCardId(defaultCard.cardId)
					} else if (data.cards.length > 0) {
						setSelectedCardId(data.cards[0].cardId)
					}
				}
			} catch (err) {
				console.error('Ошибка загрузки карт:', err)
			} finally {
				setLoadingCards(false)
			}
		}
		loadCards()
	}, [token, activeTab])

	// Привязка новой карты
	const handleAddCard = async () => {
		setAddingCard(true)
		setWithdrawError(null)
		try {
			const res = await fetch('/api/wallet/tbank/add-card', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			})
			const data = await res.json()
			
			if (data.success && data.paymentURL) {
				window.location.href = data.paymentURL
			} else {
				setWithdrawError(data.error || 'Не удалось начать привязку карты')
			}
		} catch (err) {
			setWithdrawError('Ошибка при привязке карты')
		} finally {
			setAddingCard(false)
		}
	}

	// Удаление карты
	const handleDeleteCard = async (cardId: string) => {
		if (!confirm('Удалить эту карту?')) return
		
		try {
			const res = await fetch(`/api/wallet/tbank/cards?cardId=${cardId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			})
			const data = await res.json()
			
			if (data.success) {
				setSavedCards(cards => cards.filter(c => c.cardId !== cardId))
				if (selectedCardId === cardId) {
					const remaining = savedCards.filter(c => c.cardId !== cardId)
					setSelectedCardId(remaining[0]?.cardId || '')
				}
				toast.success('Карта удалена')
			} else {
				toast.error(data.error || 'Не удалось удалить карту')
			}
		} catch (err) {
			toast.error('Ошибка при удалении карты')
		}
	}

	// Обработка URL параметра после привязки карты
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search)
		const cardAdded = urlParams.get('cardAdded')
		
		if (cardAdded === 'success') {
			toast.success('Карта успешно привязана!')
			// Очищаем параметр из URL
			window.history.replaceState({}, '', window.location.pathname)
			// Обновляем список карт
			setWithdrawMethod('saved-card')
			setLoadingCards(true)
			fetch('/api/wallet/tbank/cards', {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			})
				.then(res => res.json())
				.then(data => {
					if (data.success && data.cards) {
						setSavedCards(data.cards)
						const defaultCard = data.cards.find((c: any) => c.isDefault)
						if (defaultCard) {
							setSelectedCardId(defaultCard.cardId)
						} else if (data.cards.length > 0) {
							setSelectedCardId(data.cards[0].cardId)
						}
					}
				})
				.finally(() => setLoadingCards(false))
		} else if (cardAdded === 'fail') {
			toast.error('Не удалось привязать карту. Попробуйте еще раз.')
			window.history.replaceState({}, '', window.location.pathname)
		}
	}, [token])

	// Телефон будет вводиться пользователем вручную

	// Функция для ручной проверки платежа
	const handleCheckPayment = async (paymentIdToCheck?: string) => {
		const paymentId =
			paymentIdToCheck || lastPaymentId || manualPaymentId.trim()

		if (!paymentId) {
			alert('Введите PaymentId для проверки')
			return
		}

		setCheckingPayment(true)
		try {
			const res = await fetch('/api/wallet/tbank/check-payment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ paymentId }),
			})

			const data = await res.json()

			if (!res.ok) {
				setWithdrawError(
					data.error || data.details || 'Ошибка при проверке платежа'
				)
				return
			}

			if (data.alreadyProcessed) {
				alert('Платеж уже обработан ранее')
				setManualPaymentId('')
				setShowManualCheck(false)
			} else if (data.success) {
				alert(`✅ Средства начислены! Новый баланс: ${data.newBalance} ₽`)
				await fetchProfile()
				localStorage.removeItem('lastTBankPaymentId')
				setLastPaymentId(null)
				setManualPaymentId('')
				setShowManualCheck(false)
			} else {
				alert(`Платеж в статусе: ${data.status || 'неизвестно'}`)
			}
		} catch (err: any) {
			setWithdrawError('Ошибка при проверке платежа: ' + err.message)
		} finally {
			setCheckingPayment(false)
		}
	}

	// Загружаем отзывы только когда открыта вкладка reviews (ленивая загрузка)
	useEffect(() => {
		const fetchReviews = async () => {
			if (!user || activeTab !== 'reviews' || reviews.length > 0) return
			try {
				const res = await fetch('/api/reviews/me', {
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
				})
				const data = await res.json()
				setReviews(data.reviews || [])
			} catch (err) {
				console.error('Ошибка загрузки отзывов:', err)
			}
		}

		fetchReviews()
	}, [user, token, activeTab])

	// Закрываем модальное окно выбора фона при переключении вкладок
	const prevActiveTabRef = useRef<Tab>(activeTab)
	useEffect(() => {
		if (prevActiveTabRef.current !== activeTab && backgroundSelectorOpen) {
			setBackgroundSelectorOpen(false)
		}
		prevActiveTabRef.current = activeTab
	}, [activeTab, backgroundSelectorOpen])

	// Загружаем завершенные задачи для заказчика
	useEffect(() => {
		const fetchCustomerTasks = async () => {
			if (!user || user.role !== 'customer' || activeTab !== 'tasks') return
			if (loadingCustomerTasks) return // Предотвращаем повторные запросы
			try {
				setLoadingCustomerTasks(true)
				const res = await fetch('/api/tasks?mine=true&status=completed', {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})
				if (res.ok) {
					const data = await res.json()
					setCustomerCompletedTasks(data.tasks || [])
				}
			} catch (err) {
				console.error('Ошибка загрузки задач заказчика:', err)
			} finally {
				setLoadingCustomerTasks(false)
			}
		}

		fetchCustomerTasks()
	}, [user, token, activeTab])

	// Автоматическая проверка достижений при открытии вкладки (как у исполнителей на странице /level)
	useEffect(() => {
		if (activeTab === 'achievements' && token && !checkingBadges) {
			const checkBadges = async () => {
				setCheckingBadges(true)
				try {
					await fetch('/api/badges/check', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
					})
					// Обновляем профиль после проверки
					fetchProfile()
				} catch (badgeError) {
					console.error('Ошибка проверки достижений:', badgeError)
				} finally {
					setCheckingBadges(false)
				}
			}
			checkBadges()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, token])

	// Загрузка скрытых достижений при открытии вкладки достижений
	useEffect(() => {
		if (activeTab === 'achievements' && token) {
			const fetchLockedBadges = async () => {
				try {
					const res = await fetch('/api/badges/all', {
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
					})
					if (res.ok) {
						const data = await res.json()
						setLockedBadges(data.locked || [])
					}
				} catch (err) {
					console.error('Ошибка загрузки скрытых достижений:', err)
				}
			}
			fetchLockedBadges()
		}
	}, [activeTab, token])

	const handleDeposit = async () => {
		if (!depositAmount || depositAmount < 100) {
			setDepositError('Минимальная сумма пополнения: 100 ₽')
			return
		}

		if (depositAmount > 300000) {
			setDepositError('Максимальная сумма пополнения: 300,000 ₽')
			return
		}

		setDepositError(null)
		setDepositLoading(true)

		try {
			const res = await fetch('/api/wallet/tbank/create-payment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ amount: depositAmount }),
			})

			const data = await res.json()

			if (!res.ok) {
				setDepositError(data.error || 'Не удалось создать платеж')
				return
			}

			// Сохраняем PaymentId для возможной ручной проверки
			if (data.paymentId) {
				setLastPaymentId(data.paymentId)
				// Сохраняем в localStorage на случай перезагрузки страницы
				localStorage.setItem('lastTBankPaymentId', data.paymentId)
			}

			// Перенаправляем на страницу оплаты Т-Банка
			if (data.paymentUrl) {
				window.location.href = data.paymentUrl
			} else {
				setDepositError('Не получена ссылка на оплату')
			}
		} catch (err: any) {
			setDepositError(err.message || 'Ошибка при создании платежа')
		} finally {
			setDepositLoading(false)
		}
	}

	const handleWithdraw = async () => {
		if (!amount || amount <= 0) {
			setWithdrawError('Укажите сумму для вывода')
			return
		}

		if (amount < 1) {
			setWithdrawError('Минимальная сумма вывода: 1 ₽')
			return
		}

		// Валидация в зависимости от способа вывода
		if (withdrawMethod === 'sbp') {
			if (!withdrawPhone.trim()) {
				setWithdrawError('Укажите номер телефона для выплаты через СБП')
				return
			}

			const phoneDigits = getPhoneDigits(withdrawPhone)
			if (phoneDigits.length !== 11 || !phoneDigits.startsWith('7')) {
				setWithdrawError('Номер телефона должен быть в формате +7 (XXX) XXX-XX-XX')
				return
			}

			if (!selectedBankId) {
				setWithdrawError('Выберите банк для вывода')
				return
			}
		} else if (withdrawMethod === 'saved-card') {
			if (!selectedCardId) {
				setWithdrawError('Выберите карту для вывода')
				return
			}
		}

		setWithdrawError(null)
		setWithdrawLoading(true)

		try {
			// Формируем данные для выплаты
			const withdrawalData: any = {
				amount,
			}

			if (withdrawMethod === 'sbp') {
				const phoneDigitsForRequest = getPhoneDigits(withdrawPhone)
				withdrawalData.phone = phoneDigitsForRequest
				withdrawalData.sbpMemberId = selectedBankId
			} else if (withdrawMethod === 'saved-card') {
				withdrawalData.cardId = selectedCardId
			}

			const res = await fetch('/api/wallet/tbank/create-withdrawal', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(withdrawalData),
			})

			const data = await res.json()

			if (!res.ok) {
				setWithdrawError(
					data.error || data.details || 'Не удалось вывести средства'
				)
				return
			}

			await fetchProfile()
			setAmount(1)
			setWithdrawError(null)

			// Показываем успешное сообщение
			alert(
				'Заявка на вывод средств создана. Средства поступят в течение нескольких минут.'
			)
		} catch (err: any) {
			setWithdrawError(err.message || 'Ошибка при выводе средств')
		} finally {
			setWithdrawLoading(false)
		}
	}

	const handleProfileUpdateSuccess = () => {
		fetchProfile()
	}

	if (loading || !user || loadingProfile || !profile) {
		return (
			<div className='flex items-center justify-center min-h-[60vh]'>
				<div className='text-center'>
					<div className='w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4' />
					<p className='text-gray-400'>Загрузка профиля...</p>
				</div>
			</div>
		)
	}

	const avatarSrc = profile.avatarUrl
		? profile.avatarUrl.startsWith('http')
			? profile.avatarUrl
			: `${typeof window !== 'undefined' ? window.location.origin : ''}${
					profile.avatarUrl
			  }`
		: null

	const tabs: Array<{
		id: Tab
		label: string
		icon: React.ReactNode
		count?: number
	}> = [
		{ id: 'overview', label: 'Обзор', icon: <FaUserCircle /> },
		{
			id: 'achievements',
			label: 'Достижения',
			icon: <FaTrophy />,
			count: profile.badges?.length,
		},
		{
			id: 'reviews',
			label: 'Отзывы',
			icon: <FaStar />,
			count: profile._count?.reviewsReceived,
		},
		{
			id: 'tasks',
			label: 'Задачи',
			icon: <FaTasks />,
			count:
				user.role === 'executor' ? profile.executedTasks?.length : undefined,
		},
		...(user.role === 'executor'
			? [
					{
						id: 'certifications' as Tab,
						label: 'Сертификации',
						icon: <FaCertificate />,
						count: profile.certifications?.length,
					},
			  ]
			: []),
		{ id: 'wallet', label: 'Кошелёк', icon: <FaWallet /> },
	]

	// Получаем градиент фона
	const background = profileBackground
		? getBackgroundById(profileBackground)
		: null
	const backgroundStyle = background
		? { background: background.gradient }
		: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }

	// Определяем, нужна ли анимация (для премиум фонов уровня 5+)
	const shouldAnimate = background?.isPremium && background?.unlockLevel >= 5
	const backgroundClass = shouldAnimate ? 'level-legendary-gradient' : ''

	// Добавляем декоративные элементы для всех фонов
	const decorativeClass = background?.id ? `${background.id}-background` : ''

	return (
		<div className='max-w-7xl mx-auto p-3 sm:p-4 md:p-6 overflow-x-hidden w-full'>
			{/* Компактный Header профиля */}
			<div
				className={`rounded-xl md:rounded-2xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] p-4 md:p-6 mb-4 md:mb-6 relative overflow-hidden ${backgroundClass} ${decorativeClass}`}
				style={backgroundStyle}
			>
				{/* Overlay для читаемости текста (более прозрачный для премиум фонов) */}
				<div
					className={`absolute inset-0 pointer-events-none z-[2] ${
						shouldAnimate ? 'bg-black/30' : 'bg-black/40'
					}`}
				/>
				<div className='relative z-10'>
					<div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
						{/* Аватар */}
						<div className='relative'>
							{(() => {
								const visuals =
									userLevel > 0 ? getLevelVisuals(userLevel) : null
								const borderClass =
									visuals?.borderClass || 'border-emerald-500/50'
								return avatarSrc ? (
									<Image
										src={avatarSrc}
										alt='Аватар'
										width={80}
										height={80}
										className={`w-20 h-20 rounded-full border-2 ${borderClass} shadow-[0_0_15px_rgba(16,185,129,0.5)] object-cover`}
									/>
								) : (
									<div
										className={`w-20 h-20 rounded-full border-2 ${borderClass} bg-gray-800 flex items-center justify-center`}
									>
										<FaUserCircle className='text-4xl text-gray-600' />
									</div>
								)
							})()}
						</div>

						{/* Основная информация */}
						<div className='flex-1 min-w-0'>
							<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
								<div>
									<div className='flex items-center gap-2 flex-wrap mb-1'>
										<h1 className='text-2xl sm:text-3xl font-bold text-white truncate'>
											{profile.fullName || 'Без имени'}
										</h1>
										{userLevel > 0 && (
											<LevelBadge level={userLevel} size='md' />
										)}
										{profile.accountType && profile.accountType !== 'INDIVIDUAL' && (
											<AccountTypeBadge accountType={profile.accountType} />
										)}
									</div>
									{/* Название компании для ООО/ИП */}
									{profile.companyName && profile.accountType !== 'INDIVIDUAL' && (
										<p className='text-sm text-emerald-400/80 mb-1'>
											{profile.companyName}
										</p>
									)}
									<p className='text-gray-400 text-sm truncate'>
										{profile.email}
									</p>
									{profile.location && (
										<p className='text-emerald-300 text-sm mt-1'>
											📍 {profile.location}
										</p>
									)}
								</div>
								<div className='flex flex-wrap gap-2'>
									{/* Кнопка изменения фона только для исполнителей */}
									{user.role === 'executor' && (
										<button
											onClick={() => setBackgroundSelectorOpen(true)}
											className='flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black transition font-semibold text-xs md:text-sm whitespace-nowrap'
											title='Выбрать фон профиля'
										>
											🎨 <span className="hidden sm:inline">Фон</span>
										</button>
									)}
									<button
										onClick={() => setIsEditModalOpen(true)}
										className='flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold text-xs md:text-sm whitespace-nowrap'
									>
										<FaEdit />
										<span className="hidden sm:inline">Редактировать</span>
									</button>
								</div>
							</div>

							{/* Быстрая статистика */}
							{user.role === 'executor' && (
								<div className='flex flex-wrap gap-4 mt-4'>
									<div className='flex items-center gap-2 text-sm'>
										<FaChartLine className='text-emerald-400' />
										<span className='text-gray-300'>
											{profile.xpComputed ?? profile.xp ?? 0} XP
										</span>
									</div>
									<div className='flex items-center gap-2 text-sm'>
										<FaTasks className='text-blue-400' />
										<span className='text-gray-300'>
											{profile._count?.executedTasks || 0} задач
										</span>
									</div>
									<div className='flex items-center gap-2 text-sm'>
										<FaStar className='text-yellow-400' />
										<span className='text-gray-300'>
											{profile.avgRating != null
												? Number(profile.avgRating).toFixed(1)
												: '—'}{' '}
											/ 5
										</span>
									</div>
									<div className='flex items-center gap-2 text-sm'>
										<FaWallet className='text-green-400' />
										<span className='text-gray-300'>
											{Number(profile.balance ?? 0).toFixed(2)} ₽
										</span>
									</div>
								</div>
							)}
							{/* Быстрая статистика для заказчиков */}
							{user.role === 'customer' && (
								<div className='flex flex-wrap gap-4 mt-4'>
									{profile.avgRating && (
										<div className='flex items-center gap-2 text-sm'>
											<FaStar className='text-yellow-400' />
											<span className='text-gray-300'>
												{Number(profile.avgRating).toFixed(1)} / 5 (
												{profile._count?.reviewsReceived || 0} отзывов)
											</span>
										</div>
									)}
									{profile.customerStats && (
										<>
											<div className='flex items-center gap-2 text-sm'>
												<FaTasks className='text-blue-400' />
												<span className='text-gray-300'>
													{profile.customerStats.completedTasks || 0} завершено
												</span>
											</div>
											<div className='flex items-center gap-2 text-sm'>
												<FaWallet className='text-green-400' />
												<span className='text-gray-300'>
													{Number(profile.balance ?? 0).toFixed(2)} ₽
												</span>
											</div>
										</>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Табы */}
			<div className='flex gap-2 mb-4 md:mb-6 overflow-x-auto overflow-y-visible pt-2 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'>
				{tabs.map(tab => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg font-medium text-xs md:text-sm whitespace-nowrap transition-all hover:-translate-y-1 ${
							activeTab === tab.id
								? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
								: 'bg-black/40 border border-gray-700/50 text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400'
						}`}
					>
						<span className="text-sm md:text-base">{tab.icon}</span>
						<span className="hidden sm:inline">{tab.label}</span>
						{tab.count !== undefined && tab.count > 0 && (
							<span className='bg-emerald-500/20 text-emerald-300 px-1.5 md:px-2 py-0.5 rounded-full text-xs font-semibold'>
								{tab.count}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Контент табов */}
			<div className='space-y-6'>
				{/* Обзор */}
				{activeTab === 'overview' && (
					<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
						{/* Левая колонка */}
						<div className='lg:col-span-1 space-y-4'>
							{/* Описание */}
							{profile.description && (
								<div className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'>
									<h3 className='text-lg font-semibold text-emerald-400 mb-2'>
										О себе
									</h3>
									<p className='text-gray-300 text-sm leading-relaxed'>
										{profile.description}
									</p>
								</div>
							)}

							{/* Навыки - только для исполнителей */}
							{user.role === 'executor' &&
								profile.skills &&
								Array.isArray(profile.skills) &&
								profile.skills.length > 0 && (
									<div className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'>
										<h3 className='text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2'>
											<FaToolbox />
											Навыки
										</h3>
										<div className='flex flex-wrap gap-2'>
											{profile.skills
												.filter(skill => skill && skill.trim())
												.map((skill, index) => (
													<div
														key={index}
														className='flex items-center px-3 py-1.5 rounded-full text-xs border border-emerald-500/40 bg-black/60'
													>
														{getSkillIcon(skill)}
														<span>{skill.trim()}</span>
													</div>
												))}
										</div>
									</div>
								)}

							{/* Быстрые действия */}
							<div className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'>
								<h3 className='text-lg font-semibold text-emerald-400 mb-3'>
									⚡ Быстрые действия
								</h3>
								<div className='space-y-2'>
									<Link
										href='/analytics'
										className='flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:border-purple-400/50 transition group'
									>
										<div className='flex items-center gap-3'>
											<span className='text-xl'>📊</span>
											<span className='text-white font-medium'>Аналитика</span>
										</div>
										<FaChevronRight className='text-gray-400 group-hover:text-purple-400 transition' />
									</Link>
									{/* Портфолио - только для исполнителей */}
									{user.role === 'executor' && (
										<Link
											href='/portfolio'
											className='flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:border-blue-400/50 transition group'
										>
											<div className='flex items-center gap-3'>
												<span className='text-xl'>💼</span>
												<span className='text-white font-medium'>
													Портфолио
												</span>
											</div>
											<FaChevronRight className='text-gray-400 group-hover:text-blue-400 transition' />
										</Link>
									)}
									{profile.isExecutor && (
										<Link
											href='/level'
											className='flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:border-indigo-400/50 transition group'
										>
											<div className='flex items-center gap-3'>
												<span className='text-xl'>⭐</span>
												<span className='text-white font-medium'>
													Мой уровень
												</span>
											</div>
											<FaChevronRight className='text-gray-400 group-hover:text-indigo-400 transition' />
										</Link>
									)}
								</div>
							</div>
						</div>

						{/* Правая колонка */}
						<div className='lg:col-span-2 space-y-4'>
							{/* Статистика для исполнителей */}
							{user.role === 'executor' && (
								<div className='bg-black/40 p-5 rounded-xl border border-emerald-500/30'>
									<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
										<FaChartLine />
										Статистика
									</h3>
									<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
										<div className='text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20'>
											<div className='text-2xl font-bold text-emerald-300'>
												{profile._count?.executedTasks || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>
												Задач выполнено
											</div>
										</div>
										<div className='text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20'>
											<div className='text-2xl font-bold text-blue-300'>
												{profile._count?.reviewsReceived || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>Отзывов</div>
										</div>
										<div className='text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20'>
											<div className='text-2xl font-bold text-yellow-300'>
												{profile.avgRating != null
													? Number(profile.avgRating).toFixed(1)
													: '—'}
											</div>
											<div className='text-xs text-gray-400 mt-1'>Рейтинг</div>
										</div>
										<div className='text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20'>
											<div className='text-2xl font-bold text-purple-300'>
												{profile._count?.responses || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>Откликов</div>
										</div>
									</div>
								</div>
							)}

							{/* Статистика для заказчиков */}
							{user.role === 'customer' && profile.customerStats && (
								<div className='bg-black/40 p-5 rounded-xl border border-emerald-500/30'>
									<h3 className='text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2'>
										<FaChartLine />
										Статистика
									</h3>
									<div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
										{profile.avgRating && (
											<div className='text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20'>
												<div className='text-2xl font-bold text-yellow-300'>
													{Number(profile.avgRating).toFixed(1)}
												</div>
												<div className='text-xs text-gray-400 mt-1'>
													Рейтинг
												</div>
											</div>
										)}
										<div className='text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20'>
											<div className='text-2xl font-bold text-blue-300'>
												{profile._count?.reviewsReceived || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>Отзывов</div>
										</div>
										<div className='text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20'>
											<div className='text-2xl font-bold text-emerald-300'>
												{profile.customerStats.createdTasks || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>
												Созданных задач
											</div>
										</div>
										<div className='text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20'>
											<div className='text-2xl font-bold text-purple-300'>
												{profile.customerStats.completedTasks || 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>
												Завершено
											</div>
										</div>
										<div className='text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20'>
											<div className='text-2xl font-bold text-orange-300'>
												{profile.customerStats.totalSpent
													? Math.round(
															profile.customerStats.totalSpent
													  ).toLocaleString('ru-RU')
													: 0}
											</div>
											<div className='text-xs text-gray-400 mt-1'>
												Потрачено ₽
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Достижения */}
				{activeTab === 'achievements' && (
					<div>
						{checkingBadges && (
							<div className='mb-4 text-center py-2'>
								<div className='inline-flex items-center gap-2 text-emerald-400 text-sm'>
									<div className='w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin'></div>
									<span>Проверка достижений...</span>
								</div>
							</div>
						)}

						{profile.badges &&
						Array.isArray(profile.badges) &&
						profile.badges.length > 0 ? (
							<div className='space-y-6'>
								<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
									{profile.badges.map(userBadge => (
										<div
											key={userBadge.id}
											className='group relative overflow-hidden bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-900/90 border-2 border-gray-700/50 rounded-xl p-5 transition-all duration-300 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02] cursor-default'
										>
											{/* Декоративный фон */}
											<div className='absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
											<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500'></div>

											<div className='relative z-10'>
												<div className='flex items-start gap-4 mb-4'>
													{/* Игровая иконка бейджа */}
													<div className='flex-shrink-0'>
														<BadgeIcon
															icon={userBadge.badge.icon}
															name={userBadge.badge.name}
															size='md'
															className='group-hover:scale-110'
														/>
													</div>

													{/* Название и дата */}
													<div className='flex-1 min-w-0 pt-1'>
														<h4 className='font-bold text-white text-base mb-1 group-hover:text-emerald-300 transition line-clamp-2'>
															{userBadge.badge.name}
														</h4>
														<p className='text-xs text-gray-400'>
															{new Date(userBadge.earnedAt).toLocaleDateString(
																'ru-RU',
																{
																	day: 'numeric',
																	month: 'long',
																	year: 'numeric',
																}
															)}
														</p>
													</div>
												</div>

												{/* Описание */}
												<div className='bg-black/30 border border-gray-800/50 rounded-lg p-3'>
													<p className='text-xs text-gray-300 leading-relaxed'>
														{userBadge.badge.description}
													</p>
												</div>
											</div>

											{/* Блестящий эффект сверху */}
											<div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
										</div>
									))}
								</div>

								{/* Кнопка показать скрытые достижения */}
								{lockedBadges.length > 0 && (
									<button
										onClick={() => setBadgesModalOpen(true)}
										className='w-full py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl text-gray-400 hover:text-gray-300 hover:border-gray-600/50 transition-all text-base font-semibold flex items-center justify-center gap-2'
									>
										<span>🔒</span>
										<span>
											Показать скрытые достижения ({lockedBadges.length})
										</span>
									</button>
								)}
							</div>
						) : (
							<div className='space-y-4'>
								<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
									<FaTrophy className='text-6xl text-gray-600 mx-auto mb-4' />
									<p className='text-gray-400'>Пока нет достижений</p>
									{user.role === 'customer' && (
										<p className='text-gray-500 text-sm mt-2'>
											Создавайте задачи, завершайте их и получайте достижения!
										</p>
									)}
									{user.role === 'executor' && (
										<p className='text-gray-500 text-sm mt-2'>
											Выполняйте задачи и получайте достижения!
										</p>
									)}
								</div>

								{/* Кнопка показать скрытые достижения */}
								{lockedBadges.length > 0 && (
									<button
										onClick={() => setBadgesModalOpen(true)}
										className='w-full py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl text-gray-400 hover:text-gray-300 hover:border-gray-600/50 transition-all text-base font-semibold flex items-center justify-center gap-2'
									>
										<span>🔒</span>
										<span>
											Показать скрытые достижения ({lockedBadges.length})
										</span>
									</button>
								)}
							</div>
						)}
					</div>
				)}

				{/* Отзывы */}
				{activeTab === 'reviews' && (
					<div>
						{reviews.length > 0 ? (
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{reviews.map(review => (
									<div
										key={review.id}
										className='bg-black/40 p-4 rounded-xl border border-emerald-500/30'
									>
										<div className='flex justify-between items-center mb-3'>
											<h4 className='font-semibold text-white text-sm'>
												{review.task?.title || 'Без названия'}
											</h4>
											<div className='flex items-center gap-1'>
												{[...Array(5)].map((_, i) => (
													<FaStar
														key={i}
														className={`text-xs ${
															i < review.rating
																? 'text-yellow-400'
																: 'text-gray-600'
														}`}
													/>
												))}
											</div>
										</div>
										<p className='text-gray-300 text-sm italic mb-3'>
											"{review.comment?.trim() || 'Без комментария'}"
										</p>
										<div className='flex justify-between text-xs text-gray-400'>
											<span>
												{review.fromUser?.fullName || review.fromUser?.email}
											</span>
											<span>
												{new Date(review.createdAt).toLocaleDateString('ru-RU')}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
								<FaStar className='text-6xl text-gray-600 mx-auto mb-4' />
								<p className='text-gray-400'>Пока нет отзывов</p>
							</div>
						)}
					</div>
				)}

				{/* Сертификации */}
				{activeTab === 'certifications' && (
					<div>
						{profile.certifications && profile.certifications.length > 0 ? (
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
								{profile.certifications.map(cert => (
									<div
										key={cert.id}
										className='bg-gradient-to-br from-black/40 via-emerald-900/20 to-black/40 p-5 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
									>
										<div className='flex items-center gap-3 mb-3'>
											<div className='w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-500/20 border border-yellow-400/30 flex items-center justify-center'>
												<FaAward className='text-2xl text-yellow-400' />
											</div>
											<div className='flex-1 min-w-0'>
												<h4 className='font-bold text-emerald-300 text-base truncate'>
													{cert.subcategory.name}
												</h4>
												<p className='text-xs text-gray-400'>
													Уровень: {cert.level}
												</p>
											</div>
										</div>
										<div className='pt-3 border-t border-emerald-500/20'>
											<div className='flex items-center gap-2 text-xs text-gray-400'>
												<FaCalendarAlt className='text-emerald-400' />
												<span>
													Получено:{' '}
													{new Date(cert.grantedAt).toLocaleDateString(
														'ru-RU',
														{
															day: 'numeric',
															month: 'long',
															year: 'numeric',
														}
													)}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-16 bg-black/40 rounded-xl border border-emerald-500/30'>
								<FaCertificate className='text-6xl text-gray-600 mx-auto mb-4 opacity-50' />
								<p className='text-gray-400 text-lg font-medium'>
									Пока нет сертификаций
								</p>
								<p className='text-gray-500 text-sm mt-2'>
									Пройдите тесты по категориям, чтобы получить сертификацию
								</p>
							</div>
						)}
					</div>
				)}

				{/* Задачи */}
				{activeTab === 'tasks' && (
					<div>
						{user.role === 'executor' ? (
							// Для исполнителя - выполненные задачи
							profile.executedTasks && profile.executedTasks.length > 0 ? (
								<div className='space-y-3'>
									{profile.executedTasks.map(task => (
										<Link
											key={task.id}
											href={`/tasks/${task.id}`}
											className='block bg-black/40 p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all'
										>
											<div className='flex justify-between items-start mb-2'>
												<h4 className='font-semibold text-white'>
													{task.title}
												</h4>
												{task.price && (
													<span className='text-emerald-300 font-semibold text-sm'>
														{task.price} ₽
													</span>
												)}
											</div>
											<p className='text-gray-300 text-sm mb-3 line-clamp-2'>
												{task.description}
											</p>
											<div className='flex justify-between items-center text-xs text-gray-400'>
												<span>
													Заказчик:{' '}
													{task.customer.fullName || task.customer.email}
												</span>
												{task.completedAt && (
													<span className='flex items-center gap-1'>
														<FaCalendarAlt />
														{new Date(task.completedAt).toLocaleDateString()}
													</span>
												)}
											</div>
										</Link>
									))}
								</div>
							) : (
								<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
									<FaTasks className='text-6xl text-gray-600 mx-auto mb-4' />
									<p className='text-gray-400'>Пока нет выполненных задач</p>
									<Link
										href='/tasks'
										className='mt-4 inline-block text-emerald-400 hover:text-emerald-300 underline'
									>
										Перейти к задачам
									</Link>
								</div>
							)
						) : // Для заказчика - завершенные задачи
						loadingCustomerTasks ? (
							<div className='text-center py-12'>
								<div className='w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4' />
								<p className='text-gray-400'>Загрузка задач...</p>
							</div>
						) : customerCompletedTasks.length > 0 ? (
							<div className='space-y-3'>
								{customerCompletedTasks.map((task: any) => (
									<Link
										key={task.id}
										href={`/tasks/${task.id}`}
										className='block bg-black/40 p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all'
									>
										<div className='flex justify-between items-start mb-2'>
											<h4 className='font-semibold text-white'>{task.title}</h4>
											{task.price && (
												<span className='text-emerald-300 font-semibold text-sm'>
													{Number(task.price).toFixed(2)} ₽
												</span>
											)}
										</div>
										<p className='text-gray-300 text-sm mb-3 line-clamp-2'>
											{task.description}
										</p>
										<div className='flex justify-between items-center text-xs text-gray-400'>
											<span>
												Исполнитель:{' '}
												{task.executor?.fullName ||
													task.executor?.email ||
													'Не назначен'}
											</span>
											{task.completedAt && (
												<span className='flex items-center gap-1'>
													<FaCalendarAlt />
													{new Date(task.completedAt).toLocaleDateString()}
												</span>
											)}
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className='text-center py-12 bg-black/40 rounded-xl border border-emerald-500/30'>
								<FaTasks className='text-6xl text-gray-600 mx-auto mb-4' />
								<p className='text-gray-400'>Пока нет завершенных задач</p>
								<Link
									href='/tasks'
									className='mt-4 inline-block text-emerald-400 hover:text-emerald-300 underline'
								>
									Перейти к задачам
								</Link>
							</div>
						)}
					</div>
				)}

				{/* Кошелёк */}
				{activeTab === 'wallet' && (
					<div className='space-y-6'>
						{/* Карточка баланса */}
						<div className='bg-gradient-to-br from-emerald-900/40 via-black/40 to-emerald-950/40 p-6 rounded-2xl border border-emerald-500/30 shadow-xl'>
							<div className='flex items-center justify-between mb-6'>
								<h3 className='text-2xl font-bold text-white flex items-center gap-3'>
									<div className='bg-emerald-500/20 p-3 rounded-xl'>
										<FaWallet className='text-emerald-400 text-2xl' />
									</div>
									Мой кошелек
								</h3>
							</div>

							<div className='bg-black/40 backdrop-blur-sm p-6 rounded-xl border border-emerald-500/20 mb-4'>
								<div className='flex items-baseline gap-2 mb-3'>
									<span className='text-gray-400 text-sm font-medium'>
										Общий баланс
									</span>
								</div>
								<div className='flex items-baseline gap-2'>
									<span className='text-5xl font-bold text-white'>
										{Number(profile.balance ?? 0).toFixed(2)}
									</span>
									<span className='text-2xl text-emerald-400 font-semibold'>
										₽
									</span>
								</div>

								{profile.frozenBalance && Number(profile.frozenBalance) > 0 && (
									<div className='mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-2 gap-4'>
										<div className='flex items-center gap-2'>
											<div className='bg-yellow-500/10 p-2 rounded-lg'>
												<FaInfoCircle className='text-yellow-400' />
											</div>
											<div>
												<p className='text-xs text-gray-500'>Заморожено</p>
												<p className='text-sm font-semibold text-yellow-400'>
													{Number(profile.frozenBalance).toFixed(2)} ₽
												</p>
											</div>
										</div>
										<div className='flex items-center gap-2'>
											<div className='bg-emerald-500/10 p-2 rounded-lg'>
												<FaMoneyBillWave className='text-emerald-400' />
											</div>
											<div>
												<p className='text-xs text-gray-500'>Доступно</p>
												<p className='text-sm font-semibold text-emerald-400'>
													{(
														Number(profile.balance ?? 0) -
														Number(profile.frozenBalance)
													).toFixed(2)}{' '}
													₽
												</p>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Операции с балансом */}
						<div className={`grid gap-6 ${profile.role === 'executor' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
							{/* Пополнение - только для заказчиков, не для исполнителей */}
							{profile.role !== 'executor' && (
							<div className='bg-black/40 backdrop-blur-sm p-6 rounded-2xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all'>
								<div className='flex items-center gap-3 mb-5'>
									<div className='bg-emerald-500/20 p-3 rounded-xl'>
										<FaArrowDown className='text-emerald-400 text-xl' />
									</div>
									<div>
										<h4 className='text-xl font-bold text-white'>
											Пополнить баланс
										</h4>
										<p className='text-xs text-gray-500'>Минимум 100 ₽</p>
									</div>
								</div>

								{/* Предустановленные суммы */}
								<div className='grid grid-cols-4 gap-2 mb-4'>
									{[100, 500, 1000, 5000].map(preset => (
										<button
											key={preset}
											onClick={() => {
												setDepositAmount(preset)
												if (depositError) setDepositError(null)
											}}
											disabled={depositLoading}
											className={`py-3 px-2 rounded-lg text-sm font-semibold transition-all ${
												depositAmount === preset
													? 'bg-emerald-500 text-black'
													: 'bg-black/60 text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-400 border border-emerald-500/20'
											} disabled:opacity-50 disabled:cursor-not-allowed`}
										>
											{preset} ₽
										</button>
									))}
								</div>

								{/* Поле ввода суммы */}
								<div className='mb-4'>
									<label className='block text-sm text-gray-400 mb-2 font-medium'>
										Или укажите свою сумму
									</label>
									<div className='relative'>
										<input
											type='text'
											inputMode='numeric'
											ref={depositAmountInputRef}
											value={depositAmount === 0 ? '' : depositAmount.toString()}
											onChange={e => {
												const value = e.target.value
												// Убираем все нецифровые символы
												const digitsOnly = value.replace(/\D/g, '')
												
												// Если поле пустое
												if (digitsOnly === '') {
													setDepositAmount(0)
													previousDepositAmountRef.current = 0
												} else {
													const numValue = parseInt(digitsOnly, 10)
													const newAmount = isNaN(numValue) ? 0 : numValue
													
													// Если предыдущее значение было 0 или пустое, и пользователь вводит новую цифру
													// то заменяем значение, а не добавляем к 0
													if (previousDepositAmountRef.current === 0 && digitsOnly.length === 1 && newAmount > 0) {
														setDepositAmount(newAmount)
													} else {
														// Иначе просто парсим (автоматически убирает ведущие нули)
														setDepositAmount(newAmount)
													}
													previousDepositAmountRef.current = newAmount
												}
												if (depositError) setDepositError(null)
											}}
											onBlur={e => {
												// Если поле пустое при потере фокуса, ставим 0
												const currentValue = e.target.value.trim()
												if (currentValue === '' || currentValue === '0' || parseInt(currentValue, 10) === 0) {
													setDepositAmount(0)
													previousDepositAmountRef.current = 0
												}
											}}
											className='w-full bg-black/60 border border-emerald-500/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
											placeholder='Введите сумму'
											disabled={depositLoading}
										/>
										<span className='absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-lg pointer-events-none'>
											₽
										</span>
									</div>
								</div>

								{/* Кнопка пополнения */}
								<button
									onClick={handleDeposit}
									disabled={
										depositLoading || !depositAmount || depositAmount < 100
									}
									className='w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2'
								>
									{depositLoading ? (
										<>
											<span className='w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin' />
											<span>Обработка...</span>
										</>
									) : (
										<>
											<FaCreditCard className='text-xl' />
											<span>Пополнить баланс</span>
										</>
									)}
								</button>

								{/* Ошибка пополнения */}
								{depositError && (
									<div className='mt-4 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3'>
										<FaInfoCircle className='text-red-400 text-lg flex-shrink-0 mt-0.5' />
										<div>
											<p className='font-semibold text-red-400 text-sm'>
												Ошибка
											</p>
											<p className='text-red-300/90 text-sm mt-1'>
												{depositError}
											</p>
										</div>
									</div>
								)}

							</div>
							)}

							{/* Вывод средств */}
							<div className='bg-black/40 backdrop-blur-sm p-6 rounded-2xl border border-red-500/30 hover:border-red-500/50 transition-all'>
								<div className='flex items-center gap-3 mb-5'>
									<div className='bg-red-500/20 p-3 rounded-xl'>
										<FaArrowUp className='text-red-400 text-xl' />
									</div>
									<div>
										<h4 className='text-xl font-bold text-white'>
											Вывод средств
										</h4>
										<p className='text-xs text-gray-500'>
											Доступно:{' '}
											{(
												Number(profile.balance ?? 0) -
												Number(profile.frozenBalance ?? 0)
											).toFixed(2)}{' '}
											₽
										</p>
									</div>
								</div>


								{/* Предустановленные суммы */}
								<div className='grid grid-cols-4 gap-2 mb-4'>
									{[100, 500, 1000, 5000].map(preset => (
										<button
											key={preset}
											onClick={() => {
												setAmount(preset)
												if (withdrawError) setWithdrawError(null)
											}}
											disabled={withdrawLoading}
											className={`py-3 px-2 rounded-lg text-sm font-semibold transition-all ${
												amount === preset
													? 'bg-red-500 text-white'
													: 'bg-black/60 text-gray-300 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20'
											} disabled:opacity-50 disabled:cursor-not-allowed`}
										>
											{preset} ₽
										</button>
									))}
								</div>

								{/* Выбор способа вывода */}
								<div className='mb-4'>
									<label className='block text-sm text-red-300 mb-2 font-semibold'>
										Способ вывода
									</label>
									<div className='grid grid-cols-2 gap-2'>
										<button
											type='button'
											onClick={() => {
												setWithdrawMethod('sbp')
												setWithdrawError(null)
											}}
											disabled={withdrawLoading}
											className={`py-3 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
												withdrawMethod === 'sbp'
													? 'bg-red-500/30 text-white border-2 border-red-400'
													: 'bg-black/60 text-gray-300 hover:bg-red-500/20 border border-red-500/30'
											} disabled:opacity-50`}
										>
											<span>📱</span>
											СБП
										</button>
										<button
											type='button'
											onClick={() => {
												setWithdrawMethod('saved-card')
												setWithdrawError(null)
											}}
											disabled={withdrawLoading}
											className={`py-3 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
												withdrawMethod === 'saved-card'
													? 'bg-red-500/30 text-white border-2 border-red-400'
													: 'bg-black/60 text-gray-300 hover:bg-red-500/20 border border-red-500/30'
											} disabled:opacity-50`}
										>
											<FaCreditCard />
											На карту
											{savedCards.length > 0 && (
												<span className='bg-red-500/50 px-1.5 rounded text-xs'>
													{savedCards.length}
												</span>
											)}
										</button>
									</div>
								</div>

								{/* Поля для СБП */}
								{withdrawMethod === 'sbp' && (
									<>
										{/* Выбор банка */}
										<div className='mb-4'>
											<label className='block text-sm text-red-300 mb-2 font-semibold flex items-center gap-2'>
												<span className='text-base'></span>
												<span>Банк получателя</span>
												{loadingBanks && (
													<span className='ml-auto text-xs text-red-400/60 flex items-center gap-1'>
														<span className='w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin' />
														загрузка...
													</span>
												)}
											</label>
											{loadingBanks ? (
												<div className='text-center py-6 bg-gradient-to-br from-red-900/20 via-black/40 to-black/40 border border-red-500/30 rounded-xl'>
													<span className='w-6 h-6 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin inline-block mb-2' />
													<p className='text-sm text-red-300/80 mt-2'>Загрузка списка банков...</p>
												</div>
											) : sbpBanks.length > 0 ? (
												<div className='relative bank-dropdown-container'>
													{/* Кастомный dropdown */}
													<button
														type='button'
														onClick={(e) => {
															e.stopPropagation()
															setIsBankDropdownOpen(!isBankDropdownOpen)
															if (!isBankDropdownOpen) {
																setBankSearchQuery('')
															}
														}}
														disabled={withdrawLoading}
														className='w-full bg-gradient-to-br from-red-900/20 via-black/60 to-black/60 border-2 border-red-500/40 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400 transition-all duration-300 hover:border-red-400/60 hover:bg-red-900/30 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between'
													>
														<span className='truncate'>
															{sbpBanks.find(b => b.MemberId === selectedBankId)?.MemberNameRus || 
															 sbpBanks.find(b => b.MemberId === selectedBankId)?.MemberName || 
															 'Выберите банк'}
														</span>
														<svg
															className={`w-5 h-5 text-red-400 transition-transform duration-300 flex-shrink-0 ml-2 ${isBankDropdownOpen ? 'rotate-180' : ''}`}
															fill='none'
															stroke='currentColor'
															viewBox='0 0 24 24'
															xmlns='http://www.w3.org/2000/svg'
														>
															<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
														</svg>
													</button>
													
													{/* Выпадающий список */}
													{isBankDropdownOpen && (
														<div 
															className='absolute z-50 w-full mt-2 bg-gradient-to-br from-red-900/30 via-black/80 to-black/80 border-2 border-red-500/40 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.3)] backdrop-blur-md overflow-hidden'
															style={{
																animation: 'slideDown 0.2s ease-out forwards'
															}}
														>
															{/* Поле поиска */}
															<div className='p-3 border-b border-red-500/30'>
																<div className='relative'>
																	<FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />
																	<input
																		type='text'
																		value={bankSearchQuery}
																		onChange={(e) => {
																			e.stopPropagation()
																			setBankSearchQuery(e.target.value)
																		}}
																		onClick={(e) => e.stopPropagation()}
																		placeholder='Поиск банка...'
																		className='w-full bg-black/60 border border-red-500/40 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400 transition-all placeholder:text-gray-500 text-sm'
																	/>
																	{bankSearchQuery && (
																		<button
																			type='button'
																			onClick={(e) => {
																				e.stopPropagation()
																				setBankSearchQuery('')
																			}}
																			className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors'
																		>
																			×
																		</button>
																	)}
																</div>
															</div>
															<div className='max-h-60 overflow-y-auto custom-scrollbar'>
																{sbpBanks
																	.filter(bank => {
																		if (!bankSearchQuery.trim()) return true
																		const query = bankSearchQuery.toLowerCase()
																		const nameRus = (bank.MemberNameRus || '').toLowerCase()
																		const name = (bank.MemberName || '').toLowerCase()
																		return nameRus.includes(query) || name.includes(query)
																	})
																	.map(bank => (
																		<button
																			key={bank.MemberId}
																			type='button'
																			onClick={(e) => {
																				e.stopPropagation()
																				setSelectedBankId(bank.MemberId)
																				setIsBankDropdownOpen(false)
																				setBankSearchQuery('')
																				if (withdrawError) setWithdrawError(null)
																			}}
																			className={`w-full text-left px-4 py-3 transition-all duration-200 ${
																				selectedBankId === bank.MemberId
																					? 'bg-red-500/30 text-white border-l-4 border-red-400 font-semibold'
																					: 'text-gray-300 hover:bg-red-500/20 hover:text-white'
																			}`}
																		>
																			{bank.MemberNameRus || bank.MemberName}
																		</button>
																	))}
																{sbpBanks.filter(bank => {
																	if (!bankSearchQuery.trim()) return false
																	const query = bankSearchQuery.toLowerCase()
																	const nameRus = (bank.MemberNameRus || '').toLowerCase()
																	const name = (bank.MemberName || '').toLowerCase()
																	return nameRus.includes(query) || name.includes(query)
																}).length === 0 && bankSearchQuery.trim() && (
																	<div className='px-4 py-6 text-center text-gray-400 text-sm'>
																		Банки не найдены
																	</div>
																)}
															</div>
														</div>
													)}
												</div>
											) : (
												<div className='text-sm text-red-300/70 p-4 bg-gradient-to-br from-red-900/20 via-black/40 to-black/40 rounded-xl border border-red-500/30 flex items-center gap-2'>
													<span className='text-lg'>⚠️</span>
													<span>Не удалось загрузить список банков. Попробуйте позже.</span>
												</div>
											)}
											<p className='text-xs text-red-300/60 mt-2 flex items-center gap-1'>
												<span>💡</span>
												<span>Выберите банк, в который нужно вывести средства через СБП</span>
											</p>
										</div>
										{/* Номер телефона */}
										<div className='mb-4'>
											<label className='block text-sm text-red-300 mb-2 font-semibold flex items-center gap-2'>
												<span className='text-base'></span>
												<span>Номер телефона для вывода (СБП)</span>
											</label>
											<input
												type='tel'
												value={withdrawPhone}
												onChange={e => {
													const formatted = formatPhoneNumber(e.target.value)
													setWithdrawPhone(formatted)
													if (withdrawError) setWithdrawError(null)
												}}
												onBlur={e => {
													// При потере фокуса проверяем, что номер полный
													const digits = getPhoneDigits(e.target.value)
													if (digits.length < 11) {
														// Если номер неполный, оставляем как есть (пользователь может еще вводить)
													}
												}}
												className='w-full bg-gradient-to-br from-red-900/20 via-black/60 to-black/60 border-2 border-red-500/40 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400 transition-all duration-300 hover:border-red-400/60 hover:bg-red-900/30 placeholder:text-gray-500'
												placeholder='+7 (999) 123-45-67'
												disabled={withdrawLoading}
												maxLength={18} // +7 (999) 123-45-67 = 18 символов
											/>
											<p className='text-xs text-red-300/60 mt-2 flex items-center gap-1'>
												<span>💡</span>
												<span>Вывод будет выполнен через СБП на указанный номер</span>
											</p>
										</div>
									</>
								)}

								{/* Форма для карт */}
								{withdrawMethod === 'saved-card' && (
									<div className='mb-4'>
										{loadingCards ? (
											<div className='text-center py-6 bg-gradient-to-br from-red-900/20 via-black/40 to-black/40 border border-red-500/30 rounded-xl'>
												<span className='w-6 h-6 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin inline-block mb-2' />
												<p className='text-sm text-red-300/80 mt-2'>Загрузка карт...</p>
											</div>
										) : savedCards.length > 0 ? (
											<>
												<label className='block text-sm text-red-300 mb-2 font-semibold'>
													Выберите карту
												</label>
												<div className='space-y-2'>
													{savedCards.map(card => (
														<div
															key={card.cardId}
															onClick={() => {
																setSelectedCardId(card.cardId)
																setWithdrawError(null)
															}}
															className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
																selectedCardId === card.cardId
																	? 'bg-red-500/30 border-2 border-red-400'
																	: 'bg-black/60 border border-red-500/30 hover:border-red-400/50'
															}`}
														>
															<div className='flex items-center gap-3'>
																<FaCreditCard className='text-red-400 text-xl' />
																<div>
																	<p className='text-white font-medium'>
																		{card.pan}
																	</p>
																	<p className='text-xs text-gray-400'>
																		{card.expDate?.slice(0, 2)}/{card.expDate?.slice(2)}
																		{card.isDefault && (
																			<span className='ml-2 text-red-400'>• Основная</span>
																		)}
																	</p>
																</div>
															</div>
															<button
																type='button'
																onClick={(e) => {
																	e.stopPropagation()
																	handleDeleteCard(card.cardId)
																}}
																className='text-gray-500 hover:text-red-400 transition-colors p-1'
																title='Удалить карту'
															>
																<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
																	<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
																</svg>
															</button>
														</div>
													))}
												</div>
											</>
										) : (
											<div className='text-center py-6 bg-gradient-to-br from-red-900/20 via-black/40 to-black/40 border border-red-500/30 rounded-xl'>
												<FaCreditCard className='text-3xl text-gray-500 mx-auto mb-2' />
												<p className='text-sm text-gray-400'>Нет привязанных карт</p>
											</div>
										)}
										
										{/* Кнопка привязки новой карты */}
										<button
											type='button'
											onClick={handleAddCard}
											disabled={addingCard || withdrawLoading}
											className='w-full mt-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all bg-black/60 text-red-400 hover:bg-red-500/20 border border-red-500/30 hover:border-red-400 flex items-center justify-center gap-2 disabled:opacity-50'
										>
											{addingCard ? (
												<>
													<span className='w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin' />
													Открываем форму...
												</>
											) : (
												<>
													<span>+</span>
													Привязать новую карту
												</>
											)}
										</button>
										<p className='text-xs text-red-300/60 mt-2 flex items-center gap-1'>
											<span>💡</span>
											<span>Привязав карту, вы сможете выводить средства мгновенно</span>
										</p>
									</div>
								)}

								{/* Поле ввода суммы */}
								<div className='mb-4'>
									<label className='block text-sm text-gray-400 mb-2 font-medium'>
										Или укажите свою сумму
									</label>
									<div className='relative'>
										<input
											type='text'
											inputMode='numeric'
											ref={amountInputRef}
											value={amount === 0 ? '' : amount.toString()}
											onChange={e => {
												const value = e.target.value
												// Убираем все нецифровые символы
												const digitsOnly = value.replace(/\D/g, '')
												
												// Если поле пустое
												if (digitsOnly === '') {
													setAmount(0)
													previousAmountRef.current = 0
												} else {
													const numValue = parseInt(digitsOnly, 10)
													const newAmount = isNaN(numValue) ? 0 : numValue
													
													// Если предыдущее значение было 0 или пустое, и пользователь вводит новую цифру
													// то заменяем значение, а не добавляем к 0
													if (previousAmountRef.current === 0 && digitsOnly.length === 1 && newAmount > 0) {
														setAmount(newAmount)
													} else {
														// Иначе просто парсим (автоматически убирает ведущие нули)
														setAmount(newAmount)
													}
													previousAmountRef.current = newAmount
												}
												if (withdrawError) setWithdrawError(null)
											}}
											onBlur={e => {
												// Если поле пустое при потере фокуса, ставим 0
												const currentValue = e.target.value.trim()
												if (currentValue === '' || currentValue === '0' || parseInt(currentValue, 10) === 0) {
													setAmount(0)
													previousAmountRef.current = 0
												}
											}}
											className='w-full bg-black/60 border border-red-500/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
											placeholder='Введите сумму'
											disabled={withdrawLoading}
										/>
										<span className='absolute right-4 top-1/2 -translate-y-1/2 text-red-400 font-bold text-lg pointer-events-none'>
											₽
										</span>
									</div>
								</div>

								{/* Кнопка вывода */}
								<button
									onClick={handleWithdraw}
									disabled={withdrawLoading || !amount || amount <= 0}
									className='w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-red-500/20 flex items-center justify-center gap-2'
								>
									{withdrawLoading ? (
										<>
											<span className='w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin' />
											<span>Обработка...</span>
										</>
									) : (
										<>
											<FaMoneyBillWave className='text-xl' />
											<span>Вывести средства</span>
										</>
									)}
								</button>

								{/* Ошибка вывода */}
								{withdrawError && (
									<div className='mt-4 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3'>
										<FaInfoCircle className='text-red-400 text-lg flex-shrink-0 mt-0.5' />
										<div>
											<p className='font-semibold text-red-400 text-sm'>
												Ошибка
											</p>
											<p className='text-red-300/90 text-sm mt-1'>
												{withdrawError}
											</p>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* История транзакций */}
						<div className='bg-black/40 backdrop-blur-sm p-6 rounded-2xl border border-emerald-500/30'>
							<h3 className='text-xl font-bold text-white mb-5 flex items-center gap-3'>
								<div className='bg-emerald-500/20 p-2.5 rounded-xl'>
									<FaChartLine className='text-emerald-400' />
								</div>
								История транзакций
							</h3>
							{transactions.length === 0 ? (
								<div className='text-center py-12'>
									<div className='bg-gray-800/40 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'>
										<FaWallet className='text-4xl text-gray-600' />
									</div>
									<p className='text-gray-400 font-medium'>
										Пока нет транзакций
									</p>
									<p className='text-gray-600 text-sm mt-1'>
										Ваши операции появятся здесь
									</p>
								</div>
							) : (
								<div className='space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar'>
									{transactions.map(t => (
										<div
											key={t.id}
											className='flex justify-between items-center p-4 bg-black/60 rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 transition-all group'
										>
											<div className='flex items-center gap-3 flex-1 min-w-0'>
												<div
													className={`p-2.5 rounded-lg ${
														t.amount > 0
															? 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
															: 'bg-red-500/10 group-hover:bg-red-500/20'
													} transition-colors`}
												>
													{t.amount > 0 ? (
														<FaArrowDown className='text-emerald-400' />
													) : (
														<FaArrowUp className='text-red-400' />
													)}
												</div>
												<div className='flex-1 min-w-0'>
													<p className='text-sm font-semibold text-gray-200 truncate'>
														{t.reason}
													</p>
													<p className='text-xs text-gray-500 mt-0.5'>
														{new Date(t.createdAt).toLocaleDateString('ru-RU', {
															day: 'numeric',
															month: 'long',
															year: 'numeric',
															hour: '2-digit',
															minute: '2-digit',
														})}
													</p>
												</div>
											</div>
											<div className='ml-4 text-right'>
												<span
													className={`font-bold text-lg ${
														t.amount > 0 ? 'text-emerald-400' : 'text-red-400'
													}`}
												>
													{t.amount > 0 ? '+' : ''}
													{Number(t.amount).toFixed(2)}
												</span>
												<span
													className={`ml-1 text-sm ${
														t.amount > 0
															? 'text-emerald-400/70'
															: 'text-red-400/70'
													}`}
												>
													₽
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Модальное окно редактирования профиля */}
			{token && (
				<EditProfileModal
					isOpen={isEditModalOpen}
					onClose={() => setIsEditModalOpen(false)}
					user={profile}
					token={token}
					onSuccess={handleProfileUpdateSuccess}
				/>
			)}

			{/* Модальное окно выбора фона профиля - только для исполнителей */}
			{backgroundSelectorOpen && user.role === 'executor' && (
				<ProfileBackgroundSelector
					currentLevel={userLevel}
					onClose={() => {
						setBackgroundSelectorOpen(false)
						// Обновляем фон после выбора
						if (token) {
							fetch('/api/profile/background', {
								headers: { Authorization: `Bearer ${token}` },
							})
								.then(res => res.json())
								.then(data =>
									setProfileBackground(data.backgroundId || 'default')
								)
								.catch(() => {})
						}
					}}
				/>
			)}

			{/* Модальное окно всех достижений */}
			{token && (
				<BadgesModal
					isOpen={badgesModalOpen}
					onClose={() => setBadgesModalOpen(false)}
					earnedBadges={
						profile?.badges?.map(ub => ({
							id: ub.badge.id,
							name: ub.badge.name,
							description: ub.badge.description,
							icon: ub.badge.icon,
							earned: true,
						})) || []
					}
				/>
			)}

		</div>
	)
}
