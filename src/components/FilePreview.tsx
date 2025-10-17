'use client'

import Image from 'next/image'
import { useState } from 'react'

type FilePreviewProps = {
	fileUrl: string
	fileName?: string
	mimeType?: string
	className?: string
}

export default function FilePreview({
	fileUrl,
	fileName,
	mimeType,
	className = '',
}: FilePreviewProps) {
	const [isExpanded, setIsExpanded] = useState(false)
	const [imageError, setImageError] = useState(false)

	// Определяем тип файла
	const getFileType = () => {
		if (mimeType) {
			if (mimeType.startsWith('image/')) return 'image'
			if (mimeType.startsWith('video/')) return 'video'
			if (mimeType.startsWith('audio/')) return 'audio'
			if (mimeType === 'application/pdf') return 'pdf'
			if (mimeType.includes('text/')) return 'text'
			if (
				mimeType.includes('application/zip') ||
				mimeType.includes('application/x-rar')
			)
				return 'archive'
			if (
				mimeType.includes('application/msword') ||
				mimeType.includes('application/vnd.openxmlformats')
			)
				return 'document'
		}

		// Fallback по расширению файла
		if (fileName) {
			const ext = fileName.toLowerCase().split('.').pop()
			if (
				['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext || '')
			)
				return 'image'
			if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext || ''))
				return 'video'
			if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext || ''))
				return 'audio'
			if (ext === 'pdf') return 'pdf'
			if (['txt', 'md', 'json', 'xml', 'csv'].includes(ext || '')) return 'text'
			if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || ''))
				return 'archive'
			if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || ''))
				return 'document'
		}

		return 'unknown'
	}

	const fileType = getFileType()
	const displayName = fileName || 'Файл'

	const renderPreview = () => {
		switch (fileType) {
			case 'image':
				if (imageError) {
					return (
						<div className='flex items-center justify-center w-full h-32 bg-gray-800 rounded-lg border border-gray-700'>
							<span className='text-gray-400'>
								🖼️ Ошибка загрузки изображения
							</span>
						</div>
					)
				}
				return (
					<div className='relative w-full max-w-xs'>
						<Image
							src={fileUrl}
							alt={displayName}
							width={300}
							height={200}
							className='rounded-lg border border-gray-700 cursor-pointer hover:opacity-90 transition'
							style={{ objectFit: 'cover' }}
							onError={() => setImageError(true)}
							onClick={() => setIsExpanded(true)}
						/>
						{isExpanded && (
							<div
								className='fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4'
								onClick={() => setIsExpanded(false)}
							>
								<div className='relative max-w-4xl max-h-full'>
									<Image
										src={fileUrl}
										alt={displayName}
										width={1200}
										height={800}
										className='rounded-lg'
										style={{ objectFit: 'contain' }}
									/>
									<button
										onClick={() => setIsExpanded(false)}
										className='absolute top-4 right-4 bg-gray-800 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-700'
									>
										✕
									</button>
								</div>
							</div>
						)}
					</div>
				)

			case 'video':
				return (
					<div className='w-full max-w-md'>
						<video
							controls
							className='w-full rounded-lg border border-gray-700'
							preload='metadata'
						>
							<source src={fileUrl} type={mimeType} />
							Ваш браузер не поддерживает видео.
						</video>
					</div>
				)

			case 'audio':
				return (
					<div className='w-full max-w-md'>
						<audio controls className='w-full'>
							<source src={fileUrl} type={mimeType} />
							Ваш браузер не поддерживает аудио.
						</audio>
					</div>
				)

			case 'pdf':
				return (
					<div className='w-full max-w-md h-64 bg-gray-800 rounded-lg border border-gray-700 flex flex-col'>
						<div className='flex items-center justify-between p-3 border-b border-gray-700'>
							<span className='text-emerald-400 font-medium'>
								📄 PDF документ
							</span>
							<a
								href={fileUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='text-emerald-300 hover:text-emerald-200 text-sm underline'
							>
								Открыть
							</a>
						</div>
						<div className='flex-1 flex items-center justify-center'>
							<iframe
								src={fileUrl}
								className='w-full h-full rounded-b-lg'
								title={displayName}
							/>
						</div>
					</div>
				)

			case 'text':
				return (
					<div className='w-full max-w-md'>
						<div className='bg-gray-800 rounded-lg border border-gray-700 p-3'>
							<div className='flex items-center justify-between mb-2'>
								<span className='text-emerald-400 font-medium'>
									📝 Текстовый файл
								</span>
								<a
									href={fileUrl}
									target='_blank'
									rel='noopener noreferrer'
									className='text-emerald-300 hover:text-emerald-200 text-sm underline'
								>
									Открыть
								</a>
							</div>
							<p className='text-gray-300 text-sm'>{displayName}</p>
						</div>
					</div>
				)

			case 'document':
				return (
					<div className='w-full max-w-md'>
						<div className='bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center space-x-3'>
							<span className='text-2xl'>📄</span>
							<div className='flex-1'>
								<p className='text-white font-medium'>{displayName}</p>
								<p className='text-gray-400 text-sm'>Документ Office</p>
							</div>
							<a
								href={fileUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='text-emerald-300 hover:text-emerald-200 text-sm underline'
							>
								Открыть
							</a>
						</div>
					</div>
				)

			case 'archive':
				return (
					<div className='w-full max-w-md'>
						<div className='bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center space-x-3'>
							<span className='text-2xl'>📦</span>
							<div className='flex-1'>
								<p className='text-white font-medium'>{displayName}</p>
								<p className='text-gray-400 text-sm'>Архив</p>
							</div>
							<a
								href={fileUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='text-emerald-300 hover:text-emerald-200 text-sm underline'
							>
								Скачать
							</a>
						</div>
					</div>
				)

			default:
				return (
					<div className='w-full max-w-md'>
						<div className='bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center space-x-3'>
							<span className='text-2xl'>📎</span>
							<div className='flex-1'>
								<p className='text-white font-medium'>{displayName}</p>
								<p className='text-gray-400 text-sm'>Файл</p>
							</div>
							<a
								href={fileUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='text-emerald-300 hover:text-emerald-200 text-sm underline'
							>
								Скачать
							</a>
						</div>
					</div>
				)
		}
	}

	return <div className={`mt-2 ${className}`}>{renderPreview()}</div>
}
