// Утилиты для компонента ChatMessageInput

import type { AttachmentKind, VoiceMetadata } from './types'

export const WAVEFORM_SAMPLES = 48

export const emojiList = [
	'👍',
	'❤️',
	'😂',
	'😮',
	'😢',
	'🔥',
	'👏',
	'🎉',
	'🤔',
	'👎',
	'😊',
	'😍',
	'🤣',
	'😱',
	'😭',
	'🤗',
	'🙏',
	'💪',
	'🎊',
	'✅',
	'❌',
	'⭐',
	'💯',
	'💕',
	'🤝',
	'🙌',
	'👌',
	'🤯',
	'🥳',
	'😎',
	'🤩',
	'😇',
	'🎯',
	'🚀',
	'👀',
	'✨',
	'🥰',
	'😏',
	'😴',
	'🤤',
	'🤬',
	'🤡',
	'🫡',
	'🤖',
	'💩',
	'🧠',
	'🫶',
	'🤌',
	'👏',
	'👆',
	'👇',
	'👉',
	'👈',
	'✌️',
	'🤞',
	'🤟',
	'🖖',
	'🤙',
	'👌',
]

export function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

export async function extractWaveform(
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
		waveform: waveform.length > 0 ? waveform : [0.1],
	}
}

export function detectAttachmentKind(file: File): AttachmentKind {
	const mimeType = file.type.toLowerCase()
	const fileName = file.name.toLowerCase()

	if (mimeType.startsWith('image/')) return 'image'
	if (mimeType.startsWith('video/')) return 'video'
	if (mimeType.startsWith('audio/')) return 'audio'
	if (
		fileName.endsWith('.pdf') ||
		fileName.endsWith('.doc') ||
		fileName.endsWith('.docx') ||
		fileName.endsWith('.txt') ||
		fileName.endsWith('.rtf')
	) {
		return 'document'
	}
	return 'document'
}

export function createAttachmentId(): string {
	return `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function getTruncatedFileName(fileName: string, maxLength: number = 20): string {
	if (fileName.length <= maxLength) return fileName
	const extension = fileName.substring(fileName.lastIndexOf('.'))
	const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
	const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3)
	return `${truncatedName}...${extension}`
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

