'use client'

import type { Task } from './types'

interface TaskFilesProps {
	files: Task['files']
}

export function TaskFiles({ files }: TaskFilesProps) {
	if (!files || files.length === 0) return null

	return (
		<div className='bg-black/40 rounded-xl p-4 md:p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]'>
			<div className='flex items-center gap-3 mb-4'>
				<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
					<span className='text-sm'>📎</span>
				</div>
				<h3 className='text-lg font-semibold text-emerald-300'>Файлы</h3>
			</div>
			<div className='space-y-3'>
				{files.map(file => {
					const isImage = file.mimetype.startsWith('image/')
					return isImage ? (
						<div key={file.id} className='flex items-center gap-3'>
							<img
								src={`/api/files/${file.id}`}
								alt={file.filename}
								className='w-16 h-16 rounded-lg object-cover border border-slate-700/60'
							/>
							<p className='text-sm text-gray-300 font-medium'>{file.filename}</p>
						</div>
					) : (
						<div key={file.id} className='flex items-center gap-3'>
							<div className='w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center'>
								<span className='text-lg'>📄</span>
							</div>
							<div className='flex-1'>
								<a
									href={`/api/files/${file.id}`}
									download={file.filename}
									className='text-emerald-300 hover:text-emerald-200 font-medium transition-colors block'
								>
									{file.filename}
								</a>
								<p className='text-xs text-gray-400'>
									{Math.round(file.size / 1024)} КБ
								</p>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

