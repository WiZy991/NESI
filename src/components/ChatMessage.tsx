'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
    replyTo?: {
      id: string
      content: string
      sender: {
        id: string
        fullName?: string
        email: string
      }
    } | null
    reactions?: Array<{
      emoji: string
      userId: string
      user?: {
        id: string
        fullName?: string
        email: string
      }
    }>
    sender: {
      id: string
      fullName?: string
      email: string
      avatarUrl?: string
    }
  }
  chatType: 'private' | 'task'
  showSenderName?: boolean // Показывать ли имя отправителя
  isFirstInGroup?: boolean // Первое ли сообщение в группе
  isLastInGroup?: boolean // Последнее ли сообщение в группе
  onMessageUpdate?: (updatedMessage: any) => void
  onMessageDelete?: (messageId: string) => void
  onReply?: (messageId: string) => void // Callback для ответа на сообщение
}

export default function ChatMessage({ message, chatType, showSenderName = true, isFirstInGroup = true, isLastInGroup = true, onMessageUpdate, onMessageDelete, onReply }: Props) {
  const { user, token } = useUser()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const [showMenu, setShowMenu] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [reactions, setReactions] = useState(message.reactions || [])
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const reactionPickerRef = useRef<HTMLDivElement>(null)
  const reactionButtonRef = useRef<HTMLButtonElement>(null)
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const messageRef = useRef<HTMLDivElement>(null)
  
  // Обновляем реакции при изменении сообщения
  useEffect(() => {
    setReactions(message.reactions || [])
  }, [message.reactions])
  
  const fileUrl = message.fileId ? `/api/files/${message.fileId}` : null
  const isImage = message.fileMimetype?.startsWith('image/')
  const isOwnMessage = user?.id === message.sender.id
  const isDeleted = message.content === '[Сообщение удалено]'
  const isEdited = message.editedAt && message.editedAt !== message.createdAt

  // Логирование для отладки ответов
  useEffect(() => {
    if (message.replyTo) {
      console.log('📎 Сообщение с ответом:', {
        messageId: message.id,
        replyTo: message.replyTo,
        hasContent: !!message.replyTo.content,
        hasSender: !!message.replyTo.sender
      })
    }
  }, [message.replyTo, message.id])
  
  // Обработчик контекстного меню (ПКМ)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Используем координаты относительно viewport
    setMenuPosition({ x: e.clientX, y: e.clientY })
    setShowMenu(true)
  }

  // Обработчик долгого нажатия на мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    touchTimerRef.current = setTimeout(() => {
      e.preventDefault()
      const touch = e.touches[0] || e.changedTouches[0]
      // Используем координаты относительно viewport
      setMenuPosition({ x: touch.clientX, y: touch.clientY })
      setShowMenu(true)
    }, 500) // 500ms для долгого нажатия
  }

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current)
      touchTimerRef.current = null
    }
  }

  const handleTouchMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current)
      touchTimerRef.current = null
    }
  }

  // Закрытие меню и пикера реакций при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false)
      }
    }

    if (showMenu || showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current)
      }
    }
  }, [showMenu, showReactionPicker])

  // Обработчик реакции
  const handleReaction = async (emoji: string) => {
    if (!token) return

    try {
      const res = await fetch('/api/messages/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageId: message.id,
          emoji,
          chatType,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        // Обновляем реакции локально
        if (data.action === 'added') {
          setReactions(prev => [...prev, { emoji, userId: user!.id }])
        } else {
          setReactions(prev => prev.filter(r => !(r.emoji === emoji && r.userId === user!.id)))
        }
        
        // Обновляем сообщение через callback
        if (onMessageUpdate) {
          const updatedMessage = { ...message, reactions }
          onMessageUpdate(updatedMessage)
        }
      }
      setShowReactionPicker(false)
    } catch (error) {
      console.error('Ошибка при добавлении реакции:', error)
    }
  }

  // Группируем реакции по emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    const existing = acc.find(r => r.emoji === reaction.emoji)
    if (existing) {
      existing.count++
      if (reaction.userId === user?.id) {
        existing.hasUser = true
      }
    } else {
      acc.push({
        emoji: reaction.emoji,
        count: 1,
        hasUser: reaction.userId === user?.id,
      })
    }
    return acc
  }, [] as Array<{ emoji: string; count: number; hasUser: boolean }>)

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉']

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
      <div 
        ref={messageRef}
        className={`relative max-w-[85%] sm:max-w-[75%] min-w-[80px] group`}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
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
        
        {/* Контекстное меню (открывается по ПКМ или долгому нажатию) - рендерим через Portal */}
        {!isDeleted && showMenu && typeof window !== 'undefined' ? createPortal(
          <div 
            ref={menuRef}
            className="fixed bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-[100] min-w-[140px] sm:min-w-[130px] overflow-hidden"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              maxWidth: '90vw',
              maxHeight: '90vh',
              animation: 'slideDownWave 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              transformOrigin: 'top left'
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
                {/* Опции для всех сообщений */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    if (onReply) {
                      onReply(message.id)
                    }
                  }}
                  className="block w-full text-left px-4 py-2.5 sm:px-3 sm:py-2 hover:bg-gray-800/80 text-sm sm:text-xs text-gray-300 hover:text-white transition-all duration-150 ease-out"
                >
                  ↩️ Ответить
                </button>
                <div className="relative">
                  <button
                    ref={reactionButtonRef}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (reactionButtonRef.current && menuRef.current) {
                        const buttonRect = reactionButtonRef.current.getBoundingClientRect()
                        const menuRect = menuRef.current.getBoundingClientRect()
                        // Позиционируем пикер вплотную к меню
                        setReactionPickerPosition({
                          x: isOwnMessage 
                            ? menuRect.left   // Правый край пикера будет точно на левом краю меню (для правых сообщений)
                            : menuRect.right + 5,  // Справа от меню (для левых сообщений)
                          y: buttonRect.top + buttonRect.height / 2  // По центру кнопки "Реакция"
                        })
                      }
                      setShowReactionPicker(!showReactionPicker)
                    }}
                    className="block w-full text-left px-4 py-2.5 sm:px-3 sm:py-2 hover:bg-gray-800/80 text-sm sm:text-xs text-gray-300 hover:text-white transition-all duration-150 ease-out"
                  >
                    😊 Реакция
                  </button>
                </div>
                
                {/* Опции только для своих сообщений */}
                {isOwnMessage && (
                  <>
                    <div className="border-t border-gray-700/50"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsEditing(true)
                        setShowMenu(false)
                      }}
                      className="block w-full text-left px-4 py-2.5 sm:px-3 sm:py-2 hover:bg-gray-800/80 text-sm sm:text-xs text-gray-300 hover:text-white transition-all duration-150 ease-out"
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
                  </>
                )}
          </div>,
          document.body
        ) : null}

        {/* Пикер реакций - рендерим через Portal */}
        {showReactionPicker && typeof window !== 'undefined' ? createPortal(
          <div 
            ref={reactionPickerRef}
            className="fixed bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl p-2 flex gap-1 z-[101]"
            style={{
              left: `${reactionPickerPosition.x}px`,
              top: `${reactionPickerPosition.y}px`,
              transform: isOwnMessage 
                ? 'translate(-100%, -50%)'  // Для правых сообщений - правый край пикера вплотную к левому краю меню
                : 'translate(0, -50%)',      // Для левых сообщений - левый край пикера справа от меню
              animation: 'slideDownWave 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              transformOrigin: isOwnMessage ? 'right center' : 'left center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation()
                  handleReaction(emoji)
                  setShowReactionPicker(false)
                  setShowMenu(false)
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-700/50 flex items-center justify-center text-lg transition-all hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>,
          document.body
        ) : null}

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
            {/* Ответ на сообщение - как в Telegram */}
            {message.replyTo && (
              <div 
                className={`mb-2 px-3 py-2 rounded-lg border-l-[3px] cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.01] ${
                  isOwnMessage 
                    ? 'bg-white/10 border-white/30 hover:bg-white/15 hover:border-white/40' 
                    : 'bg-gray-600/30 border-gray-400/50 hover:bg-gray-600/40 hover:border-gray-400/60'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  // Прокрутка к исходному сообщению
                  const originalMessage = document.querySelector(`[data-message-id="${message.replyTo?.id}"]`)
                  if (originalMessage) {
                    originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    // Визуальное выделение на 2 секунды
                    originalMessage.classList.add('ring-2', 'ring-emerald-500', 'animate-pulse')
                    setTimeout(() => {
                      originalMessage.classList.remove('ring-2', 'ring-emerald-500', 'animate-pulse')
                    }, 2000)
                  }
                }}
              >
                <div className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${
                  isOwnMessage ? 'text-white/90' : 'text-gray-200'
                }`}>
                  <span className={`text-[10px] ${
                    isOwnMessage ? 'text-white/60' : 'text-gray-400'
                  }`}>↩️</span>
                  <span>{message.replyTo.sender.fullName || message.replyTo.sender.email}</span>
                </div>
                <div className={`text-xs line-clamp-2 break-words pl-4 ${
                  isOwnMessage ? 'text-white/70' : 'text-gray-300'
                }`}>
                  {message.replyTo.content ? (
                    message.replyTo.content.length > 100 
                      ? message.replyTo.content.substring(0, 100) + '...' 
                      : message.replyTo.content
                  ) : (
                    <span className="italic">📎 Файл</span>
                  )}
                </div>
              </div>
            )}

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
            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
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
        
        {/* Реакции - под блоком сообщения */}
        {groupedReactions.length > 0 && (
          <div className={`flex gap-1 flex-wrap mt-1 ${
            isOwnMessage ? 'justify-end' : 'justify-start'
          }`}>
            {groupedReactions.map((reaction, idx) => (
              <button
                key={idx}
                onClick={() => handleReaction(reaction.emoji)}
                className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 transition-all ${
                  reaction.hasUser
                    ? 'bg-emerald-500/30 border border-emerald-400/50'
                    : 'bg-gray-600/30 border border-gray-500/30'
                } hover:scale-110`}
              >
                <span>{reaction.emoji}</span>
                {reaction.count > 1 && (
                  <span className="text-[10px]">{reaction.count}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
