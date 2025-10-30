'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'

type Props = {
  message: {
    id: string
    content: string
    createdAt: string
    editedAt?: string | null // Дата редактирования
    fileId?: string
    fileName?: string
    fileMimetype?: string
    sender: {
      id: string
      fullName?: string
      email: string
    }
  }
  chatType: 'private' | 'task'
  showSenderName?: boolean // Показывать ли имя отправителя
  isFirstInGroup?: boolean // Первое ли сообщение в группе
  isLastInGroup?: boolean // Последнее ли сообщение в группе
  onMessageUpdate?: (updatedMessage: any) => void
  onMessageDelete?: (messageId: string) => void
}

export default function ChatMessage({ message, chatType, showSenderName = true, isFirstInGroup = true, isLastInGroup = true, onMessageUpdate, onMessageDelete }: Props) {
  const { user, token } = useUser()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const fileUrl = message.fileId ? `/api/files/${message.fileId}` : null
  const isImage = message.fileMimetype?.startsWith('image/')
  const isOwnMessage = user?.id === message.sender.id
  const isDeleted = message.content === '[Сообщение удалено]'
  const isEdited = message.editedAt && message.editedAt !== message.createdAt
  
  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

	const handleEdit = async () => {
		if (!editedContent.trim() || editedContent === message.content) {
			setIsEditing(false)
			return
		}

		try {
			const endpoint = chatType === 'private' 
				? `/api/private-messages/edit/${message.id}`
				: `/api/messages/edit/${message.id}`
			
			const res = await fetch(endpoint, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({ content: editedContent }),
			})

			const data = await res.json()
			if (res.ok) {
				toast.success('Сообщение отредактировано')
				if (onMessageUpdate) onMessageUpdate(data.message)
				setIsEditing(false)
			} else {
				toast.error(data.error || 'Ошибка редактирования')
			}
		} catch (error) {
			toast.error('Ошибка редактирования сообщения')
		}
	}

	const handleDelete = async () => {
		if (!confirm('Удалить это сообщение?')) return

		try {
			const endpoint = chatType === 'private' 
				? `/api/private-messages/delete/${message.id}`
				: `/api/messages/delete/${message.id}`
			
			const res = await fetch(endpoint, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			})

			const data = await res.json()
			if (res.ok) {
				toast.success('Сообщение удалено')
				if (onMessageDelete) onMessageDelete(message.id)
			} else {
				toast.error(data.error || 'Ошибка удаления')
			}
		} catch (error) {
			toast.error('Ошибка удаления сообщения')
		}
	}

  // Определяем отступ снизу: между группами больше, внутри группы меньше
  const marginBottom = isLastInGroup ? 'mb-3' : 'mb-1'
  
  // Определяем скругление углов как в Telegram
  const getBorderRadius = () => {
    if (isDeleted) return 'rounded-2xl' // Удаленные всегда полностью скруглены
    
    if (isOwnMessage) {
      // Свои сообщения (справа) - зеленые
      if (isFirstInGroup && isLastInGroup) {
        // Одиночное: полное скругление везде, кроме правого нижнего угла (хвостик)
        return 'rounded-[18px] rounded-br-[4px]'
      }
      if (isFirstInGroup) {
        // Первое в группе: скругление сверху
        return 'rounded-t-[18px] rounded-bl-[18px] rounded-br-[4px]'
      }
      if (isLastInGroup) {
        // Последнее в группе: скругление снизу с хвостиком
        return 'rounded-b-[18px] rounded-tl-[18px] rounded-tr-[4px] rounded-br-[4px]'
      }
      // Среднее в группе: только левые углы скруглены
      return 'rounded-l-[18px] rounded-tr-[4px] rounded-br-[4px]'
    } else {
      // Чужие сообщения (слева) - серые
      if (isFirstInGroup && isLastInGroup) {
        // Одиночное: полное скругление везде, кроме левого нижнего угла (хвостик)
        return 'rounded-[18px] rounded-bl-[4px]'
      }
      if (isFirstInGroup) {
        // Первое в группе: скругление сверху
        return 'rounded-t-[18px] rounded-br-[18px] rounded-bl-[4px]'
      }
      if (isLastInGroup) {
        // Последнее в группе: скругление снизу с хвостиком
        return 'rounded-b-[18px] rounded-tr-[18px] rounded-tl-[4px] rounded-bl-[4px]'
      }
      // Среднее в группе: только правые углы скруглены
      return 'rounded-r-[18px] rounded-tl-[4px] rounded-bl-[4px]'
    }
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${marginBottom}`}>
      <div className={`relative max-w-[85%] sm:max-w-[75%] min-w-[80px] group`}>
        {/* Имя отправителя (только для чужих сообщений и если showSenderName=true) */}
        {!isOwnMessage && showSenderName && (
          <div className="text-xs text-emerald-400 font-medium mb-1 px-2">
            {message.sender.fullName || message.sender.email}
          </div>
        )}
      
        <div className={`relative px-3 py-2 sm:px-3 sm:py-2 ${getBorderRadius()} ${
          isDeleted 
            ? 'bg-gray-800/50 border border-gray-700/30' // Удаленные сообщения
            : isOwnMessage 
              ? 'bg-emerald-600 text-white' // Свои сообщения - зеленый
              : 'bg-gray-700 text-white' // Чужие сообщения - серый
        }`}>
        
        {/* Меню редактирования/удаления */}
        {isOwnMessage && !isDeleted && (
          <div className="absolute -top-1 -right-1" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-gray-900/90 text-gray-400 hover:text-white hover:bg-gray-800 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center text-xs sm:text-[10px] shadow-md border border-gray-700/50"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 sm:top-7 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-2xl z-50 min-w-[140px] sm:min-w-[130px] overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(true)
                    setShowMenu(false)
                  }}
                  className="block w-full text-left px-4 py-2.5 sm:px-3 sm:py-2 hover:bg-gray-800/80 text-sm sm:text-xs text-gray-300 hover:text-white transition-colors"
                >
                  ✏️ Изменить
                </button>
                <div className="border-t border-gray-700/50"></div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    handleDelete()
                  }}
                  className="block w-full text-left px-4 py-2.5 sm:px-3 sm:py-2 hover:bg-gray-800/80 text-sm sm:text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  🗑️ Удалить
                </button>
              </div>
            )}
          </div>
        )}

        {/* Редактор */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full bg-gray-900/50 text-white px-3 py-2 rounded-lg border border-emerald-400/50 focus:border-emerald-400 focus:outline-none text-sm resize-none"
              autoFocus
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEdit()
                }
                if (e.key === 'Escape') {
                  setIsEditing(false)
                  setEditedContent(message.content)
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="flex-1 sm:flex-none px-4 sm:px-3 py-2 sm:py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm sm:text-xs font-medium transition-colors"
              >
                ✓ Сохранить
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditedContent(message.content)
                }}
                className="flex-1 sm:flex-none px-4 sm:px-3 py-2 sm:py-1.5 bg-black/20 hover:bg-black/30 text-white rounded-lg text-sm sm:text-xs font-medium transition-colors"
              >
                ✕ Отмена
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Текст сообщения */}
            {message.content && (
              <div 
                className={`text-sm sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  isDeleted ? 'italic text-gray-500 text-center' : ''
                }`}
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word'
                }}
              >
                {message.content}
              </div>
            )}

            {/* Файл */}
            {fileUrl && !isDeleted && (
              <div className="mt-2">
                {isImage ? (
                  <img
                    src={fileUrl}
                    alt={message.fileName || 'Вложение'}
                    className="max-w-full max-h-64 rounded-lg"
                  />
                ) : (
                  <a
                    href={fileUrl}
                    download={message.fileName}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isOwnMessage
                        ? 'bg-white/20 hover:bg-white/30'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30'
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="text-lg">📎</span>
                    <span className="text-sm">{message.fileName || 'Файл'}</span>
                  </a>
                )}
              </div>
            )}

            {/* Время и статус редактирования */}
            <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
              isOwnMessage ? 'text-white/70' : 'text-gray-400'
            }`}>
              {isEdited && (
                <span className="italic">изменено</span>
              )}
              <span>
                {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
