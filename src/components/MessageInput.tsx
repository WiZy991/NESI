'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'

type VoiceMetadata = {
	duration: number
	waveform: number[]
}

const WAVEFORM_SAMPLES = 36

async function extractWaveform(
	blob: Blob,
	sampleCount: number = WAVEFORM_SAMPLES
): Promise<VoiceMetadata> {
	const audioContext = new AudioContext()
	const arrayBuffer = await blob.arrayBuffer()
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

	const rawData = audioBuffer.getChannelData(0)
	const blockSize = Math.floor(rawData.length / sampleCount)

	const waveform: number[] = []
	for (let i = 0; i < sampleCount; i++) {
		let sum = 0
		for (let j = 0; j < blockSize; j++) {
			const sample = rawData[i * blockSize + j]
			sum += Math.abs(sample)
		}

		waveform.push(Math.min(1, sum / blockSize))
	}

	audioContext.close().catch(() => undefined)

	return {
		duration: audioBuffer.duration,
		waveform,
	}
}

function formatDuration(seconds: number) {
	const totalSeconds = Math.max(0, Math.round(seconds))
	const mins = Math.floor(totalSeconds / 60)
	const secs = totalSeconds % 60
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function MessageInput({
	taskId,
	onSend,
}: {
	taskId: string
	onSend: (message: any) => void
}) {
	const { token } = useUser()
	const [content, setContent] = useState('')
	const [file, setFile] = useState<File | null>(null)
	const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	const [isRecording, setIsRecording] = useState(false)
	const [recordingTime, setRecordingTime] = useState(0)
	const [voiceMetadata, setVoiceMetadata] = useState<VoiceMetadata | null>(null)
	const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)

	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])
	const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
	const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

	const hasAttachment = useMemo(() => Boolean(file), [file])
	const isVoiceMessage = useMemo(
		() => Boolean(file && voiceMetadata),
		[file, voiceMetadata]
	)

	useEffect(() => {
		return () => {
			if (recordingTimerRef.current) {
				clearInterval(recordingTimerRef.current)
			}
			if (audioPreviewUrl) {
				URL.revokeObjectURL(audioPreviewUrl)
			}
			if (filePreviewUrl) {
				URL.revokeObjectURL(filePreviewUrl)
			}
			if (audioPreviewRef.current) {
				audioPreviewRef.current.src = ''
			}
		}
	}, [audioPreviewUrl, filePreviewUrl])

	const resetAttachmentState = useCallback(() => {
		setFile(null)
		setVoiceMetadata(null)
		if (filePreviewUrl) {
			URL.revokeObjectURL(filePreviewUrl)
			setFilePreviewUrl(null)
		}
		if (audioPreviewUrl) {
			URL.revokeObjectURL(audioPreviewUrl)
			setAudioPreviewUrl(null)
		}
	}, [audioPreviewUrl, filePreviewUrl])

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault()
		if ((!content.trim() && !hasAttachment) || !token) return

		setLoading(true)

		try {
			const formData = new FormData()

			const contentToSend = isVoiceMessage
				? JSON.stringify({
						type: 'voice',
						duration: voiceMetadata?.duration || 0,
						waveform: voiceMetadata?.waveform || [],
				  })
				: content

			formData.append('content', contentToSend || '')

			if (file) {
				formData.append('file', file)
			}

			const res = await fetch(`/api/tasks/${taskId}/messages`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			})

			const data = await res.json()
			if (res.ok) {
				onSend(data.message)
				setContent('')
				resetAttachmentState()
			} else {
				toast.error(data.error || 'Не удалось отправить сообщение')
			}
		} catch (err) {
			console.error('Ошибка отправки сообщения:', err)
			toast.error('Ошибка при отправке сообщения')
		} finally {
			setLoading(false)
		}
	}

	const handleFileChange = (fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return
		const selected = fileList[0]
		resetAttachmentState()
		setFile(selected)
		if (selected.type.startsWith('image/')) {
			const preview = URL.createObjectURL(selected)
			setFilePreviewUrl(preview)
		}
	}

	const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
		const items = event.clipboardData?.items
		if (!items) return

		for (const item of items) {
			if (item.kind === 'file' && item.type.startsWith('image/')) {
				const pastedFile = item.getAsFile()
				if (pastedFile) {
					const fileName = pastedFile.name || `screenshot-${Date.now()}.png`
					const normalized = new File([pastedFile], fileName, {
						type: pastedFile.type,
					})
					resetAttachmentState()
					setFile(normalized)
					const preview = URL.createObjectURL(normalized)
					setFilePreviewUrl(preview)
					toast.success('Скриншот добавлен к сообщению')
					event.preventDefault()
					return
				}
			}
		}
	}

	const stopRecordingInternal = useCallback(
		async (send: boolean) => {
			if (recordingTimerRef.current) {
				clearInterval(recordingTimerRef.current)
				recordingTimerRef.current = null
			}

			setIsRecording(false)

			const mediaRecorder = mediaRecorderRef.current
			if (!mediaRecorder) return

			mediaRecorder.ondataavailable = null
			mediaRecorder.onstop = null
			mediaRecorderRef.current = null

			mediaRecorder.stream.getTracks().forEach(track => track.stop())

			if (!send) {
				audioChunksRef.current = []
				setRecordingTime(0)
				return
			}

			try {
				const blob = new Blob(audioChunksRef.current, {
					type: 'audio/webm',
				})
				audioChunksRef.current = []

				if (blob.size === 0) {
					toast.error('Не удалось записать голосовое сообщение')
					return
				}

				const fileName = `voice-${Date.now()}.webm`
				const voiceFile = new File([blob], fileName, { type: 'audio/webm' })

				const metadata = await extractWaveform(blob)

				resetAttachmentState()
				setFile(voiceFile)
				setVoiceMetadata(metadata)

				const previewUrl = URL.createObjectURL(blob)
				setAudioPreviewUrl(previewUrl)
				setRecordingTime(Math.round(metadata.duration))
			} catch (error) {
				console.error('Ошибка обработки голосового сообщения:', error)
				toast.error('Не удалось сохранить голосовое сообщение')
			}
		},
		[resetAttachmentState]
	)

	const startRecording = useCallback(async () => {
		if (!navigator.mediaDevices?.getUserMedia) {
			toast.error('Запись голоса не поддерживается в вашем браузере')
			return
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			const recorder = new MediaRecorder(stream, {
				mimeType:
					MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ?
						'audio/webm;codecs=opus' :
						'audio/webm',
			})
			mediaRecorderRef.current = recorder
			audioChunksRef.current = []
			setRecordingTime(0)
			setIsRecording(true)

			recorder.ondataavailable = event => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data)
				}
			}

			recorder.onstop = () => {
				// результат обрабатывается в stopRecordingInternal
			}

			recorder.start(200)
			recordingTimerRef.current = setInterval(() => {
				setRecordingTime(prev => prev + 1)
			}, 1000)
		} catch (error: any) {
			console.error('Ошибка доступа к микрофону:', error)
			if (error?.name === 'NotAllowedError') {
				toast.error(
					'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.'
				)
			} else {
				toast.error('Не удалось получить доступ к микрофону')
			}
		}
	}, [])

	const stopRecording = useCallback(
		async (send: boolean) => {
			const recorder = mediaRecorderRef.current
			if (recorder && recorder.state !== 'inactive') {
				recorder.stop()
			}
			await stopRecordingInternal(send)
		},
		[stopRecordingInternal]
	)

	const removeAttachment = () => {
		resetAttachmentState()
		setRecordingTime(0)
	}

	return (
		<form
			onSubmit={handleSubmit}
			className='flex flex-col gap-3 border border-emerald-500/40 rounded-xl bg-black/40 p-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
		>
			{/* Поле ввода */}
			<input
				className='flex-1 px-3 py-2 bg-transparent text-white placeholder-gray-500 border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm'
				placeholder={
					isVoiceMessage
						? 'Голосовое сообщение будет отправлено'
						: 'Введите сообщение...'
				}
				value={content}
				onChange={e => setContent(e.target.value)}
				onPaste={handlePaste}
				disabled={isRecording}
			/>

			{/* Превью вложений */}
			{file && !isVoiceMessage && (
				<div className='flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-200'>
					<div className='flex items-center gap-2 min-w-0'>
						<span className='flex-shrink-0'>📎</span>
						<span className='truncate'>{file.name}</span>
					</div>
					<button
						type='button'
						onClick={removeAttachment}
						className='text-emerald-200/80 hover:text-emerald-100 transition'
					>
						Убрать
					</button>
				</div>
			)}

			{filePreviewUrl && (
				<div className='relative max-w-xs'>
					<img
						src={filePreviewUrl}
						alt='Превью вложения'
						className='rounded-lg border border-emerald-500/30 object-contain max-h-40'
					/>
				</div>
			)}

			{isVoiceMessage && (
				<div className='p-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.25)]'>
					<div className='flex items-center gap-3'>
						<button
							type='button'
							onClick={() => {
								if (!audioPreviewRef.current) return
								if (audioPreviewRef.current.paused) {
									audioPreviewRef.current.play().catch(() => undefined)
								} else {
									audioPreviewRef.current.pause()
								}
							}}
							className='w-9 h-9 rounded-full border border-emerald-400 flex items-center justify-center text-sm hover:bg-emerald-400 hover:text-black transition'
						>
							▶️
						</button>
						<div className='flex-1'>
							<div className='flex items-end gap-[3px] h-14'>
								{voiceMetadata?.waveform.map((value, index) => (
									<div
										key={index}
										className='w-[4px] rounded-full bg-emerald-400/70'
										style={{
											height: `${Math.max(10, value * 48)}px`,
										}}
									/>
								))}
							</div>
							<div className='text-xs text-emerald-200/80 mt-1 text-right'>
								{formatDuration(voiceMetadata?.duration || recordingTime)}
							</div>
						</div>
					</div>
					<button
						type='button'
						onClick={removeAttachment}
						className='mt-2 text-xs text-emerald-200/80 hover:text-emerald-100 transition'
					>
						Удалить голосовое сообщение
					</button>
					{audioPreviewUrl && (
						<audio
							ref={audioPreviewRef}
							src={audioPreviewUrl}
							preload='metadata'
							className='hidden'
						/>
					)}
				</div>
			)}

			{/* Управление записями и файлами */}
			<div className='flex items-center gap-3 flex-wrap'>
				<label
					htmlFor='file-upload'
					className='cursor-pointer px-3 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition text-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]'
				>
					📎 Прикрепить файл
				</label>
				<input
					id='file-upload'
					type='file'
					onChange={e => handleFileChange(e.target.files)}
					accept='.doc,.docx,.xls,.xlsx,.pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov,.ogg,.mp3,.wav'
					className='hidden'
				/>

				<button
					type='button'
					onClick={() => {
						if (isRecording) {
							stopRecording(true)
						} else {
							startRecording()
						}
					}}
					className={`px-3 py-2 rounded-lg border text-sm transition shadow-[0_0_10px_rgba(16,185,129,0.3)] ${
						isRecording
							? 'border-red-400 text-red-300 hover:bg-red-400/20'
							: 'border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black'
					}`}
				>
					{isRecording ? `■ Стоп (${formatDuration(recordingTime)})` : '🎤 Голос'}
				</button>

				{isRecording && (
					<button
						type='button'
						onClick={() => stopRecording(false)}
						className='px-3 py-2 rounded-lg border border-gray-500 text-gray-300 hover:bg-gray-500/30 transition text-sm'
					>
						Отмена
					</button>
				)}
			</div>

			{/* Кнопка отправки */}
			<button
				type='submit'
				disabled={loading || isRecording}
				className='self-end px-6 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.3)] text-sm font-medium'
			>
				{loading ? '...' : 'Отправить'}
			</button>
		</form>
	)
}
