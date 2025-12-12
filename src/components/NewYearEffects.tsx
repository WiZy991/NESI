'use client'

import { useEffect, useState, useCallback, memo } from 'react'
import '@/styles/new-year-effects.css'

// ============================================================
// 🎄 НОВОГОДНИЕ ЭФФЕКТЫ - ВРЕМЕННЫЙ КОМПОНЕНТ
// ============================================================
// 
// 📅 АВТОМАТИЧЕСКОЕ ОТКЛЮЧЕНИЕ: после 15 января 2026
//
// 🔧 РУЧНОЕ ОТКЛЮЧЕНИЕ:
// 1. Установи NEW_YEAR_EFFECTS_ENABLED = false
// 2. Или удали <NewYearEffects /> из src/app/LayoutClient.tsx
//
// ============================================================

const NEW_YEAR_EFFECTS_ENABLED = true
const AUTO_DISABLE_DATE = new Date('2026-01-15T23:59:59')

function isHolidaySeasonActive(): boolean {
	if (!NEW_YEAR_EFFECTS_ENABLED) return false
	const now = new Date()
	return now < AUTO_DISABLE_DATE
}

// Снежинка
const Snowflake = memo(({ style }: { style: React.CSSProperties }) => (
	<div className="snowflake" style={style}>❄</div>
))
Snowflake.displayName = 'Snowflake'

// Снегопад
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
		const flakes = Array.from({ length: 35 }, (_, i) => ({
			id: i,
			left: Math.random() * 100,
			animationDuration: 15 + Math.random() * 25,
			animationDelay: Math.random() * 15,
			fontSize: 6 + Math.random() * 12,
			opacity: 0.2 + Math.random() * 0.4,
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

// Гирлянда
function GarlandEffect() {
	const lights = Array.from({ length: 30 }, (_, i) => i)
	const colors = ['#ff4444', '#ffdd44', '#44ff44', '#44ddff', '#ff44ff', '#ff8844']

	return (
		<div className="garland-container">
			{lights.map((i) => (
				<div
					key={i}
					className="garland-light"
					style={{
						backgroundColor: colors[i % colors.length],
						color: colors[i % colors.length],
						animationDelay: `${(i % 6) * 0.25}s`,
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
					С наступающим 2026 годом! Желаем успешных проектов!
				</span>
				<span className="new-year-emoji">🎅</span>
			</div>
			<button
				onClick={onClose}
				className="new-year-close"
				aria-label="Закрыть"
			>
				✕
			</button>
		</div>
	)
}

// Главный компонент
export default function NewYearEffects() {
	const [enabled, setEnabled] = useState(true)
	const [showBanner, setShowBanner] = useState(true)
	const [mounted, setMounted] = useState(false)
	const [isHolidaySeason, setIsHolidaySeason] = useState(true)

	useEffect(() => {
		setMounted(true)
		
		if (!isHolidaySeasonActive()) {
			setIsHolidaySeason(false)
			return
		}
		
		const savedState = localStorage.getItem('newYearEffects')
		const bannerClosed = localStorage.getItem('newYearBanner2026Closed')
		
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
		localStorage.setItem('newYearBanner2026Closed', 'true')
	}, [])

	if (!mounted || !isHolidaySeason) return null

	return (
		<>
			{/* Кнопка переключения */}
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
					<SnowfallEffect />
					<GarlandEffect />
					{showBanner && <NewYearBanner onClose={closeBanner} />}
				</>
			)}
		</>
	)
}
