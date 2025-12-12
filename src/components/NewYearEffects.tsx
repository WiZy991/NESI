'use client'

import { useEffect, useState, useCallback, memo } from 'react'

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
const AUTO_DISABLE_DATE = new Date('2025-01-15T23:59:59') // Автоотключение после этой даты

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

			{/* CSS стили */}
			<style jsx global>{`
				/* Контейнер снегопада */
				.snowfall-container {
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					pointer-events: none;
					z-index: 9999;
					overflow: hidden;
				}

				/* Снежинка */
				.snowflake {
					position: absolute;
					top: -20px;
					color: #fff;
					animation: snowfall linear infinite;
					text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
					user-select: none;
				}

				@keyframes snowfall {
					0% {
						transform: translateY(0) rotate(0deg);
					}
					100% {
						transform: translateY(100vh) rotate(360deg);
					}
				}

				/* Гирлянда */
				.garland-container {
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 4px;
					display: flex;
					justify-content: space-around;
					z-index: 10000;
					pointer-events: none;
				}

				.garland-light {
					width: 8px;
					height: 8px;
					border-radius: 50%;
					animation: garland-blink 1.5s ease-in-out infinite;
					box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
				}

				@keyframes garland-blink {
					0%, 100% {
						opacity: 1;
						transform: scale(1);
					}
					50% {
						opacity: 0.3;
						transform: scale(0.8);
					}
				}

				/* Новогодний баннер */
				.new-year-banner {
					position: fixed;
					top: 8px;
					left: 50%;
					transform: translateX(-50%);
					background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%);
					border: 2px solid #c41e3a;
					border-radius: 12px;
					padding: 8px 40px 8px 16px;
					z-index: 10001;
					box-shadow: 
						0 4px 20px rgba(196, 30, 58, 0.3),
						0 0 40px rgba(255, 215, 0, 0.1);
					animation: banner-appear 0.5s ease-out;
				}

				@keyframes banner-appear {
					from {
						opacity: 0;
						transform: translateX(-50%) translateY(-20px);
					}
					to {
						opacity: 1;
						transform: translateX(-50%) translateY(0);
					}
				}

				.new-year-banner-content {
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.new-year-emoji {
					font-size: 20px;
					animation: emoji-bounce 2s ease-in-out infinite;
				}

				.new-year-emoji:last-child {
					animation-delay: 0.5s;
				}

				@keyframes emoji-bounce {
					0%, 100% {
						transform: translateY(0);
					}
					50% {
						transform: translateY(-5px);
					}
				}

				.new-year-text {
					color: #ffd700;
					font-size: 14px;
					font-weight: 500;
					text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
				}

				.new-year-close {
					position: absolute;
					top: 50%;
					right: 8px;
					transform: translateY(-50%);
					background: none;
					border: none;
					color: #fff;
					font-size: 16px;
					cursor: pointer;
					opacity: 0.7;
					transition: opacity 0.2s;
					padding: 4px;
				}

				.new-year-close:hover {
					opacity: 1;
				}

				/* Кнопка переключения */
				.new-year-toggle {
					position: fixed;
					bottom: 80px;
					right: 20px;
					width: 44px;
					height: 44px;
					border-radius: 50%;
					background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%);
					border: 2px solid #c41e3a;
					font-size: 20px;
					cursor: pointer;
					z-index: 10002;
					display: flex;
					align-items: center;
					justify-content: center;
					transition: all 0.3s ease;
					box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
				}

				.new-year-toggle:hover {
					transform: scale(1.1);
					box-shadow: 0 6px 20px rgba(196, 30, 58, 0.4);
				}

				/* Адаптив для мобильных */
				@media (max-width: 640px) {
					.new-year-banner {
						left: 8px;
						right: 8px;
						transform: none;
						padding: 6px 32px 6px 12px;
					}

					.new-year-text {
						font-size: 12px;
					}

					.new-year-emoji {
						font-size: 16px;
					}

					.snowfall-container .snowflake {
						font-size: 10px !important;
					}

					.new-year-toggle {
						bottom: 70px;
						right: 12px;
						width: 40px;
						height: 40px;
					}
				}

				/* Уменьшаем интенсивность снега на слабых устройствах */
				@media (prefers-reduced-motion: reduce) {
					.snowflake {
						animation: none;
						display: none;
					}
					
					.garland-light {
						animation: none;
					}
				}
			`}</style>
		</>
	)
}

