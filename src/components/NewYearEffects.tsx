'use client'

import { useEffect, useState, useCallback, memo } from 'react'
import '@/styles/new-year-effects.css'

// ============================================================
// 🎄 НОВОГОДНИЕ ЭФФЕКТЫ - ВРЕМЕННЫЙ КОМПОНЕНТ
// ============================================================
// 
// Этот компонент добавляет праздничное оформление.
// Он ПОЛНОСТЬЮ ИЗОЛИРОВАН и НЕ МЕНЯЕТ существующие стили.
//
// 📅 АВТОМАТИЧЕСКОЕ ОТКЛЮЧЕНИЕ: после 15 января 2025
//
// 🔧 РУЧНОЕ ОТКЛЮЧЕНИЕ:
// 1. Установи NEW_YEAR_EFFECTS_ENABLED = false (ниже)
// 2. Или удали <NewYearEffects /> из src/app/LayoutClient.tsx
// 3. Или удали этот файл целиком
//
// ============================================================

// ⚙️ НАСТРОЙКИ - измени здесь для управления эффектами
const NEW_YEAR_EFFECTS_ENABLED = true // Установи false чтобы отключить
const AUTO_DISABLE_DATE = new Date('2026-01-15T23:59:59') // Автоотключение после этой даты

// Проверка, активны ли праздники
function isHolidaySeasonActive(): boolean {
	if (!NEW_YEAR_EFFECTS_ENABLED) return false
	
	const now = new Date()
	return now < AUTO_DISABLE_DATE
}

// Компонент снежинки
const Snowflake = memo(({ style }: { style: React.CSSProperties }) => (
	<div className="snowflake" style={style}>
		❄
	</div>
))
Snowflake.displayName = 'Snowflake'

// Основной компонент снегопада
function SnowfallEffect() {
	const [snowflakes, setSnowflakes] = useState<Array<{
		id: number
		left: number
		animationDuration: number
		animationDelay: number
		fontSize: number
		opacity: number
	}>>([])

	useEffect(() => {
		// Создаём снежинки
		const flakes = Array.from({ length: 50 }, (_, i) => ({
			id: i,
			left: Math.random() * 100,
			animationDuration: 10 + Math.random() * 20,
			animationDelay: Math.random() * 10,
			fontSize: 8 + Math.random() * 16,
			opacity: 0.3 + Math.random() * 0.5,
		}))
		setSnowflakes(flakes)
	}, [])

	return (
		<div className="snowfall-container">
			{snowflakes.map((flake) => (
				<Snowflake
					key={flake.id}
					style={{
						left: `${flake.left}%`,
						animationDuration: `${flake.animationDuration}s`,
						animationDelay: `${flake.animationDelay}s`,
						fontSize: `${flake.fontSize}px`,
						opacity: flake.opacity,
					}}
				/>
			))}
		</div>
	)
}

// Гирлянда для хедера
function GarlandEffect() {
	const lights = Array.from({ length: 20 }, (_, i) => i)
	const colors = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff6600']

	return (
		<div className="garland-container">
			{lights.map((i) => (
				<div
					key={i}
					className="garland-light"
					style={{
						backgroundColor: colors[i % colors.length],
						animationDelay: `${i * 0.15}s`,
					}}
				/>
			))}
		</div>
	)
}

// Новогодний баннер
function NewYearBanner({ onClose }: { onClose: () => void }) {
	return (
		<div className="new-year-banner">
			<div className="new-year-banner-content">
				<span className="new-year-emoji">🎄</span>
				<span className="new-year-text">
					С наступающим Новым Годом! Желаем успешных проектов в 2025! 
				</span>
				<span className="new-year-emoji">🎅</span>
			</div>
			<button
				onClick={onClose}
				className="new-year-close"
				aria-label="Закрыть баннер"
			>
				✕
			</button>
		</div>
	)
}

// Главный компонент новогодних эффектов
export default function NewYearEffects() {
	const [enabled, setEnabled] = useState(true)
	const [showBanner, setShowBanner] = useState(true)
	const [mounted, setMounted] = useState(false)
	const [isHolidaySeason, setIsHolidaySeason] = useState(true)

	useEffect(() => {
		setMounted(true)
		
		// Проверяем, активен ли праздничный сезон
		if (!isHolidaySeasonActive()) {
			setIsHolidaySeason(false)
			return
		}
		
		// Проверяем localStorage
		const savedState = localStorage.getItem('newYearEffects')
		const bannerClosed = localStorage.getItem('newYearBannerClosed')
		
		if (savedState === 'disabled') {
			setEnabled(false)
		}
		if (bannerClosed === 'true') {
			setShowBanner(false)
		}
	}, [])

	const toggleEffects = useCallback(() => {
		setEnabled(prev => {
			const newState = !prev
			localStorage.setItem('newYearEffects', newState ? 'enabled' : 'disabled')
			return newState
		})
	}, [])

	const closeBanner = useCallback(() => {
		setShowBanner(false)
		localStorage.setItem('newYearBannerClosed', 'true')
	}, [])

	// Не рендерим ничего если:
	// - Компонент ещё не смонтирован
	// - Праздничный сезон закончился
	if (!mounted || !isHolidaySeason) return null

	return (
		<>
			{/* Кнопка переключения эффектов */}
			<button
				onClick={toggleEffects}
				className="new-year-toggle"
				title={enabled ? 'Отключить новогодние эффекты' : 'Включить новогодние эффекты'}
				aria-label={enabled ? 'Отключить новогодние эффекты' : 'Включить новогодние эффекты'}
			>
				{enabled ? '❄️' : '☀️'}
			</button>

			{enabled && (
				<>
					{/* Падающий снег */}
					<SnowfallEffect />
					
					{/* Гирлянда в хедере */}
					<GarlandEffect />
					
					{/* Новогодний баннер */}
					{showBanner && <NewYearBanner onClose={closeBanner} />}
				</>
			)}
		</>
	)
}
