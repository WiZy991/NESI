'use client'

import ResponseForm from '../ResponseForm'

type ResponseFormSectionProps = {
	taskId: string
	minPrice: number
	isCertified: boolean
	subcategoryId?: string
	subcategoryName?: string
	loadingActive: boolean
	hasActive: boolean
	isCertChecking: boolean
}

export function ResponseFormSection({
	taskId,
	minPrice,
	isCertified,
	subcategoryId,
	subcategoryName,
	loadingActive,
	hasActive,
	isCertChecking,
}: ResponseFormSectionProps) {
	return (
		<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
			<div className='flex items-center gap-3 mb-4'>
				<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
					<span className='text-sm'>✍️</span>
				</div>
				<h3 className='text-lg font-semibold text-emerald-300'>
					Откликнуться на задачу
				</h3>
			</div>

			{loadingActive ? (
				<div className='flex items-center gap-3 text-gray-400'>
					<div className='w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin'></div>
					<span>Проверка доступности отклика…</span>
				</div>
			) : hasActive ? (
				<div className='bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4'>
					<div className='flex items-center gap-3 text-yellow-300'>
						<span className='text-lg'>⚠️</span>
						<span>
							Вы достигли лимита активных задач. Завершите текущие задачи, чтобы откликнуться на новые.
						</span>
					</div>
				</div>
			) : isCertChecking ? (
				<div className='flex items-center gap-3 text-gray-400'>
					<div className='w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin'></div>
					<span>Проверка сертификации…</span>
				</div>
			) : (
				<ResponseForm
					taskId={taskId}
					minPrice={minPrice}
					isCertified={isCertified}
					subcategoryId={subcategoryId}
					subcategoryName={subcategoryName}
				/>
			)}
		</div>
	)
}

