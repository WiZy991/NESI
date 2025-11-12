// Типы для компонента ChatMessageInput

export type AttachmentKind = 'image' | 'video' | 'document' | 'audio' | 'voice'

export type ComposerAttachment = {
	id: string
	file: File
	name: string
	size: number
	kind: AttachmentKind
	previewUrl: string | null
	uploadedFileId: string | null
	uploadProgress: number
	status: 'uploading' | 'ready' | 'error'
	rotation?: number
	voiceMetadata?: VoiceMetadata | null
	audioPreviewUrl?: string | null
	waveform?: number[]
}

export type VoiceMetadata = {
	duration: number
	waveform: number[]
}

export type TypingContext = {
	recipientId: string
	chatType: 'private' | 'task'
	chatId: string
	taskId?: string
}

export type MessageInputProps = {
	chatType: 'private' | 'task'
	otherUserId?: string
	taskId?: string
	onMessageSent: (message: any) => void
	replyTo?: {
		id: string
		content: string
		sender: {
			id: string
			fullName?: string
			email: string
		}
	} | null
	onCancelReply?: () => void
	showTemplatesButton?: boolean
}

