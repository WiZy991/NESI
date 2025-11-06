'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export type BadgeData = {
	id: string
	name: string
	icon: string
	description?: string
}

type BadgeUnlockedModalProps = {
	badge: BadgeData | null
	onClose: () => void
}

export function BadgeUnlockedModal({ badge, onClose }: BadgeUnlockedModalProps) {
	const [isVisible, setIsVisible] = useState(false)
	const [showSparkles, setShowSparkles] = useState(false)

	useEffect(() => {
		if (badge) {
			setIsVisible(true)
			// Запускаем блестки после небольшой задержки
			setTimeout(() => setShowSparkles(true), 300)
			
			// Автоматически закрываем через 5 секунд
			const timer = setTimeout(() => {
				handleClose()
			}, 5000)

			return () => clearTimeout(timer)
		}
	}, [badge])

	const handleClose = () => {
		setIsVisible(false)
		setShowSparkles(false)
		setTimeout(onClose, 500) // Даем время на анимацию исчезновения
	}

	if (!badge) return null

	return (
		<AnimatePresence>
			{isVisible && (
				<>
					{/* Затемнение фона */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
						className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
						onClick={handleClose}
						data-nextjs-scroll-focus-boundary={false}
					>
						{/* Модальное окно с достижением */}
						<motion.div
							initial={{ scale: 0.5, opacity: 0, y: 50 }}
							animate={{ scale: 1, opacity: 1, y: 0 }}
							exit={{ scale: 0.5, opacity: 0, y: 50 }}
							transition={{
								type: 'spring',
								stiffness: 300,
								damping: 25,
								duration: 0.5,
							}}
							className="relative bg-gradient-to-br from-emerald-900/95 via-black/95 to-emerald-900/95 border-2 border-emerald-500/50 rounded-3xl p-8 sm:p-12 max-w-md w-full mx-4 shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Блестящие эффекты вокруг */}
							{showSparkles && (
								<>
									<motion.div
										initial={{ scale: 0, rotate: 0 }}
										animate={{ scale: [1, 1.2, 1], rotate: 360 }}
										transition={{
											duration: 2,
											repeat: Infinity,
											ease: 'easeInOut',
										}}
										className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-emerald-400/30 to-transparent rounded-full blur-xl"
									/>
									<motion.div
										initial={{ scale: 0, rotate: 0 }}
										animate={{ scale: [1, 1.3, 1], rotate: -360 }}
										transition={{
											duration: 2.5,
											repeat: Infinity,
											ease: 'easeInOut',
											delay: 0.3,
										}}
										className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-emerald-300/20 to-transparent rounded-full blur-2xl"
									/>
									{/* Блестки */}
									{[...Array(6)].map((_, i) => (
										<motion.div
											key={i}
											initial={{ scale: 0, opacity: 0 }}
											animate={{
												scale: [0, 1, 0],
												opacity: [0, 1, 0],
												x: [
													0,
													Math.cos((i * Math.PI * 2) / 6) * 100,
													Math.cos((i * Math.PI * 2) / 6) * 150,
												],
												y: [
													0,
													Math.sin((i * Math.PI * 2) / 6) * 100,
													Math.sin((i * Math.PI * 2) / 6) * 150,
												],
											}}
											transition={{
												duration: 1.5,
												repeat: Infinity,
												delay: i * 0.2,
												ease: 'easeOut',
											}}
											className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/80"
											style={{
												transform: 'translate(-50%, -50%)',
											}}
										/>
									))}
								</>
							)}

							{/* Светящаяся рамка */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: [0.5, 1, 0.5] }}
								transition={{
									duration: 2,
									repeat: Infinity,
									ease: 'easeInOut',
								}}
								className="absolute inset-0 rounded-3xl border-2 border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.6)]"
							/>

							{/* Иконка достижения */}
							<div className="flex flex-col items-center text-center space-y-6 relative z-10">
								<motion.div
									initial={{ scale: 0, rotate: -180 }}
									animate={{ scale: 1, rotate: 0 }}
									transition={{
										type: 'spring',
										stiffness: 200,
										damping: 15,
										delay: 0.2,
									}}
									className="relative"
								>
									{/* Светящийся фон иконки */}
									<motion.div
										animate={{
											boxShadow: [
												'0 0 20px rgba(16, 185, 129, 0.5)',
												'0 0 40px rgba(16, 185, 129, 0.8)',
												'0 0 20px rgba(16, 185, 129, 0.5)',
											],
										}}
										transition={{
											duration: 2,
											repeat: Infinity,
											ease: 'easeInOut',
										}}
										className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 rounded-full blur-2xl scale-150"
									/>
									<div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center text-6xl sm:text-7xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 rounded-full border-4 border-emerald-400/50 backdrop-blur-sm">
										{badge.icon}
									</div>
								</motion.div>

								{/* Заголовок */}
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.4, duration: 0.5 }}
									className="space-y-2"
								>
									<div className="text-sm sm:text-base font-semibold text-emerald-400/80 uppercase tracking-wider">
										Достижение разблокировано!
									</div>
									<h3 className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
										{badge.name}
									</h3>
									{badge.description && (
										<p className="text-sm sm:text-base text-gray-300 mt-2 max-w-xs">
											{badge.description}
										</p>
									)}
								</motion.div>

								{/* Кнопка закрытия */}
								<motion.button
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ delay: 0.6 }}
									onClick={handleClose}
									className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
								>
									Отлично! 🎉
								</motion.button>
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}
