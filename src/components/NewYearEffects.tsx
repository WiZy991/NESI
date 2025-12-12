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
// 📅 АВТОМАТИЧЕСКОЕ ОТКЛЮЧЕНИЕ: после 15 января 2026
//
// 🔧 РУЧНОЕ ОТКЛЮЧЕНИЕ:
// 1. Установи NEW_YEAR_EFFECTS_ENABLED = false (ниже)
// 2. Или удали <NewYearEffects /> из src/app/LayoutClient.tsx
// 3. Или удали этот файл целиком
//
// ============================================================

// ⚙️ НАСТРОЙКИ
const NEW_YEAR_EFFECTS_ENABLED = true
const AUTO_DISABLE_DATE = new Date('2026-01-15T23:59:59')

function isHolidaySeasonActive(): boolean {
	if (!NEW_YEAR_EFFECTS_ENABLED) return false
	const now = new Date()
	return now < AUTO_DISABLE_DATE
}

// Компонент снежинки
const Snowflake = memo(({ style }: { style: React.CSSProperties }) => (
	<div className="snowflake" style={style}>❄</div>
))
Snowflake.displayName = 'Snowflake'

// Снегопад - лёгкий, не мешает контенту
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
		// Меньше снежинок, более мелкие
		const flakes = Array.from({ length: 35 }, (_, i) => ({
			id: i,
			left: Math.random() * 100,
			animationDuration: 15 + Math.random() * 25, // Медленнее падают
			animationDelay: Math.random() * 15,
			fontSize: 6 + Math.random() * 12, // Меньше размер
			opacity: 0.2 + Math.random() * 0.4, // Более прозрачные
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

// Гирлянда - красивые лампочки под хедером
function GarlandEffect() {
	const lights = Array.from({ length: 25 }, (_, i) => i)
	// Праздничные цвета
	const colors = [
		'#ff4444', // красный
		'#ffdd44', // жёлтый
		'#44ff44', // зелёный
		'#44ddff', // голубой
		'#ff44ff', // розовый
		'#ff8844', // оранжевый
	]

	return (
		<div className="garland-container">
			{lights.map((i) => (
				<div
					key={i}
					className="garland-light"
					style={{
						backgroundColor: colors[i % colors.length],
						color: colors[i % colors.length],
						animationDelay: `${(i % 6) * 0.3}s`,
					}}
				/>
			))}
		</div>
	)
}

// Главный компонент
export default function NewYearEffects() {
	const [enabled, setEnabled] = useState(true)
	const [mounted, setMounted] = useState(false)
	const [isHolidaySeason, setIsHolidaySeason] = useState(true)

	useEffect(() => {
		setMounted(true)
		
		if (!isHolidaySeasonActive()) {
			setIsHolidaySeason(false)
			return
		}
		
		const savedState = localStorage.getItem('newYearEffects')
		if (savedState === 'disabled') {
			setEnabled(false)
		}
	}, [])

	const toggleEffects = useCallback(() => {
		setEnabled(prev => {
			const newState = !prev
			localStorage.setItem('newYearEffects', newState ? 'enabled' : 'disabled')
			return newState
		})
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
					{/* Снег на фоне */}
					<SnowfallEffect />
					
					{/* Гирлянда под хедером */}
					<GarlandEffect />
				</>
			)}
		</>
	)
}
