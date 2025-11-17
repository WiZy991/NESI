'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'

interface ExternalPriceData {
	source: string
	averagePrice: number
	minPrice: number
	maxPrice: number
	sampleSize: number
}

interface PriceComparisonWidgetProps {
	subcategoryId: string | null
	responsePrice: number | null
}

export default function PriceComparisonWidget({
	subcategoryId,
	responsePrice,
}: PriceComparisonWidgetProps) {
	const { token } = useUser()
	const [priceData, setPriceData] = useState<{
		internal: {
			averagePrice: number
			minPrice: number
			maxPrice: number
		}
		external: ExternalPriceData[]
		comparison: {
			internalAverage: number
			externalAverage: number
		}
	} | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!token || !subcategoryId) {
			setLoading(false)
			return
		}

		const fetchPriceStats = async () => {
			try {
				const res = await fetch(`/api/analytics/price-stats?subcategoryId=${subcategoryId}`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				if (res.ok) {
					const data = await res.json()
					setPriceData(data)
				}
			} catch (err) {
				console.error('Ошибка загрузки статистики цен:', err)
			} finally {
				setLoading(false)
			}
		}

		fetchPriceStats()
	}, [token, subcategoryId])

	if (loading || !priceData || !responsePrice) {
		return null
	}

	const externalAverage = priceData.comparison.externalAverage
	const internalAverage = priceData.comparison.internalAverage
	const marketAverage = externalAverage > 0 ? externalAverage : internalAverage

	// Вычисляем разницу между ценой отклика и рыночной средней
	const difference = responsePrice - marketAverage
	const differencePercent = marketAverage > 0 ? (difference / marketAverage) * 100 : 0

	// Определяем статус цены
	const getPriceStatus = () => {
		if (differencePercent <= -20) return { text: 'Очень выгодно', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50' }
		if (differencePercent <= -10) return { text: 'Выгодно', color: 'text-green-300', bg: 'bg-green-500/15', border: 'border-green-500/40' }
		if (differencePercent <= 10) return { text: 'Справедливо', color: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/40' }
		if (differencePercent <= 30) return { text: 'Дорого', color: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40' }
		return { text: 'Очень дорого', color: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-500/40' }
	}

	const status = getPriceStatus()

	return (
		<div className={`mt-3 p-3 rounded-lg border ${status.border} ${status.bg}`}>
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-medium text-gray-400">Сравнение с рынком</span>
				<span className={`text-xs font-semibold ${status.color}`}>{status.text}</span>
			</div>
			
			<div className="space-y-1.5">
				<div className="flex justify-between items-center text-xs">
					<span className="text-gray-400">Цена отклика:</span>
					<span className="text-white font-semibold">{responsePrice.toLocaleString('ru-RU')} ₽</span>
				</div>
				
				<div className="flex justify-between items-center text-xs">
					<span className="text-gray-400">Рыночная средняя:</span>
					<span className="text-emerald-300">{Math.round(marketAverage).toLocaleString('ru-RU')} ₽</span>
				</div>
				
				<div className="flex justify-between items-center text-xs pt-1 border-t border-gray-700/50">
					<span className="text-gray-400">Разница:</span>
					<span className={`font-semibold ${difference >= 0 ? 'text-red-300' : 'text-green-300'}`}>
						{difference >= 0 ? '+' : ''}{Math.round(difference).toLocaleString('ru-RU')} ₽ 
						({differencePercent >= 0 ? '+' : ''}{Math.round(differencePercent)}%)
					</span>
				</div>
			</div>

			{/* Данные из внешних источников */}
			{priceData.external.length > 0 && (
				<div className="mt-3 pt-2 border-t border-gray-700/50">
					<div className="text-xs text-gray-400 mb-1.5">Данные с других площадок:</div>
					<div className="space-y-1">
						{priceData.external.slice(0, 3).map((source, idx) => (
							<div key={idx} className="flex justify-between items-center text-xs">
								<span className="text-gray-500">{source.source}:</span>
								<span className="text-gray-300">
									{Math.round(source.averagePrice).toLocaleString('ru-RU')} ₽
									<span className="text-gray-500 ml-1">({source.sampleSize} задач)</span>
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

