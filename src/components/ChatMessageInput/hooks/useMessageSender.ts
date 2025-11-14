import { useCallback, useRef } from 'react'
import type { ComposerAttachment } from '../types'

type UseMessageSenderProps = {
	token: string | null
	chatType: 'private' | 'task'
	otherUserId?: string
	taskId?: string
	replyTo?: {
		id: string
		content: string
		sender: {
			id: string
			fullName?: string
			email: string
		}
	} | null
	onMessageSent: (message: any) => void
	onCancelReply?: () => void
	setSending: (sending: boolean) => void
	setMessage: (message: string) => void
	setAttachments: (attachments: ComposerAttachment[] | ((prev: ComposerAttachment[]) => ComposerAttachment[])) => void
	setShowEmojiPicker: (show: boolean) => void
	setShowTemplatesModal: (show: boolean) => void
	setPreferSendMode: (prefer: boolean) => void
	clearVoiceState: () => void
	attachmentUploadsRef: React.MutableRefObject<Map<string, XMLHttpRequest>>
	textareaRef: React.RefObject<HTMLTextAreaElement>
	fileInputRef: React.RefObject<HTMLInputElement>
}

export function useMessageSender({
	token,
	chatType,
	otherUserId,
	taskId,
	replyTo,
	onMessageSent,
	onCancelReply,
	setSending,
	setMessage,
	setAttachments,
	setShowEmojiPicker,
	setShowTemplatesModal,
	setPreferSendMode,
	clearVoiceState,
	attachmentUploadsRef,
	textareaRef,
	fileInputRef,
}: UseMessageSenderProps) {
	const handleSubmit = useCallback(
		async (
			e: React.FormEvent,
			message: string,
			attachments: ComposerAttachment[],
			setIsTyping: (typing: boolean) => void,
			sendTypingEvent: (typing: boolean) => Promise<void>
		) => {
			e.preventDefault()

			const trimmedContent = message.trim()
			const readyAttachments = attachments.filter(att => att.status === 'ready')
			const pendingAttachments = attachments.filter(
				att => att.status === 'uploading'
			)
			const erroredAttachments = attachments.filter(att => att.status === 'error')

			if (pendingAttachments.length > 0) {
				alert('Дождитесь завершения загрузки вложений перед отправкой сообщения')
				return
			}

			if (erroredAttachments.length > 0) {
				alert('Удалите или перезагрузите вложения с ошибкой перед отправкой')
				return
			}

			if (readyAttachments.length === 0 && trimmedContent.length === 0) {
				return
			}

			if (setIsTyping) {
				setIsTyping(false)
				sendTypingEvent(false)
			}

			setSending(true)

			const url =
				chatType === 'private'
					? `/api/messages/send`
					: `/api/tasks/${taskId}/messages`
			const baseHeaders: HeadersInit = {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			}

			let replyIncluded = false

			const sendRequest = async (body: any) => {
				const res = await fetch(url, {
					method: 'POST',
					headers: baseHeaders,
					body: JSON.stringify(body),
				})

				const text = await res.text()
				if (!text || text.trim() === '') {
					throw new Error('Пустой ответ сервера')
				}

				let data: any
				try {
					data = JSON.parse(text)
				} catch (parseError) {
					throw new Error('Неверный формат ответа от сервера')
				}

				if (!res.ok) {
					const errorText =
						data?.error ||
						data?.details ||
						data?.message ||
						res.statusText ||
						'Неизвестная ошибка'
					throw new Error(
						typeof errorText === 'string' ? errorText : JSON.stringify(errorText)
					)
				}

				const newMessage = chatType === 'private' ? data : data.message || data
				onMessageSent(newMessage)
			}

			try {
				const queue: Array<{ attachment?: ComposerAttachment; content: string }> =
					[]

				if (readyAttachments.length > 0) {
					readyAttachments.forEach((attachment, index) => {
						queue.push({ attachment, content: index === 0 ? trimmedContent : '' })
					})
				} else if (trimmedContent.length > 0) {
					queue.push({ content: trimmedContent })
				}

				for (const item of queue) {
					const body: any = {}

					if (chatType === 'private') {
						body.recipientId = otherUserId
					}

					if (!replyIncluded && replyTo?.id) {
						body.replyToId = replyTo.id
						replyIncluded = true
					}

					if (item.attachment) {
						const attachment = item.attachment
						if (!attachment.uploadedFileId) {
							throw new Error('Вложение не загружено. Повторите попытку.')
						}

						body.fileId = attachment.uploadedFileId

						if (attachment.kind === 'voice') {
							const meta = attachment.voiceMetadata || {
								duration: 0,
								waveform: [],
							}
							body.content = JSON.stringify({
								type: 'voice',
								duration: meta.duration || 0,
								waveform: meta.waveform || [],
								text:
									item.content.trim().length > 0
										? item.content.trim()
										: undefined,
							})
						} else {
							body.content = item.content.trim()
						}
					} else {
						if (item.content.trim().length === 0) {
							continue
						}
						body.content = item.content.trim()
					}

					await sendRequest(body)
				}

				// Очистка состояния после успешной отправки всех сообщений
				setMessage('')
				setAttachments([])
				setShowEmojiPicker(false)
				setShowTemplatesModal(false)
				setPreferSendMode(true)
				clearVoiceState()
				attachmentUploadsRef.current.clear()

				if (onCancelReply) {
					onCancelReply()
				}

				if (textareaRef.current) {
					textareaRef.current.style.height = '44px'
				}

				if (fileInputRef.current) {
					fileInputRef.current.value = ''
				}
			} catch (error: any) {
				console.error('Ошибка отправки сообщения:', error)
				alert(
					`Ошибка отправки сообщения: ${
						error?.message || error || 'Неизвестная ошибка'
					}`
				)
			} finally {
				setSending(false)
			}
		},
		[
			token,
			chatType,
			otherUserId,
			taskId,
			replyTo,
			onMessageSent,
			onCancelReply,
			setSending,
			setMessage,
			setAttachments,
			setShowEmojiPicker,
			setShowTemplatesModal,
			setPreferSendMode,
			clearVoiceState,
			attachmentUploadsRef,
			textareaRef,
			fileInputRef,
		]
	)

	return { handleSubmit }
}

