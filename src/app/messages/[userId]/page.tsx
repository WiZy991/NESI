'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Picker } from 'emoji-mart'

type Message = {
  id: string
  content: string
  fileUrl?: string | null
  fileName?: string | null
  mimeType?: string | null
  size?: number | null
  createdAt: string
  senderId: string
  recipientId: string
}

export default function MessagesPage() {
  const { user } = useUser()
  const params = useParams()
  const otherUserId = (params.userId || (params as any).userid) as string

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const pollRef = useRef<number | null>(null)

  const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || '')) || ''
  const isImage = (m?: string | null) => !!m && m.startsWith('image/')

  // делает ссылку абсолютной (Railway требует полный URL)
  const makeAbsoluteUrl = (url: string) => {
    if (!url) return url
    if (url.startsWith('http')) return url
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${url}`
    }
    return url
  }

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data)
      scrollToBottom()
    } catch (e) {
      console.error('Ошибка загрузки сообщений:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()

    const startPolling = () => {
      if (!pollRef.current) pollRef.current = window.setInterval(fetchMessages, 8000)
    }
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    if (!document.hidden) startPolling()
    const onVis = () => (document.hidden ? stopPolling() : startPolling())
    document.addEventListener('visibilitychange', onVis)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [otherUserId])

  // drag & drop
  useEffect(() => {
    const el = dropRef.current
    if (!el) return
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
    const onDrop = (e: DragEvent) => {
      prevent(e)
      const f = e.dataTransfer?.files?.[0]
      if (f) setFile(f)
    }
    ;['dragenter','dragover','dragleave','drop'].forEach(ev => el.addEventListener(ev, prevent as any))
    el.addEventListener('drop', onDrop)
    return () => {
      ;['dragenter','dragover','dragleave','drop'].forEach(ev => el.removeEventListener(ev, prevent as any))
      el.removeEventListener('drop', onDrop)
    }
  }, [])

  const sendMessage = async () => {
    if (sending) return
    const hasText = messageText.trim().length > 0
    if (!hasText && !file) return

    setSending(true)
    try {
      let res: Response
      if (file) {
        const form = new FormData()
        form.append('recipientId', otherUserId)
        form.append('content', messageText)
        form.append('file', file)
        res = await fetch('/api/messages/send', {
          method: 'POST',
          body: form,
          headers: { Authorization: `Bearer ${token}` },
        })
      } else {
        res = await fetch('/api/messages/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ recipientId: otherUserId, content: messageText }),
        })
      }

      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, msg])
        setMessageText('')
        setFile(null)
        setShowEmoji(false)
        scrollToBottom()
      } else {
        const j = await res.json().catch(() => ({}))
        console.warn('Ошибка отправки:', res.status, j?.error)
      }
    } catch (e) {
      console.error('Ошибка отправки:', e)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <h1 className="text-xl font-bold text-white mb-4">Диалог</h1>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div
          ref={dropRef}
          className="flex flex-col space-y-2 max-h-[70vh] overflow-y-auto bg-gray-900 p-4 rounded mb-4 border border-gray-800"
        >
          {messages.map((msg) => {
            const url = msg.fileUrl ? makeAbsoluteUrl(msg.fileUrl) : null
            return (
              <div
                key={msg.id}
                className={`p-2 rounded max-w-[80%] ${
                  msg.senderId === user?.id ? 'self-end bg-blue-600 text-white'
                                            : 'self-start bg-gray-700 text-white'
                }`}
              >
                {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                {/* Вложение */}
                {url && (
                  <div className="mt-2">
                    {isImage(msg.mimeType) ? (
                      <a href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={msg.fileName || 'image'} className="rounded max-h-64" />
                      </a>
                    ) : (
                      <a href={url} target="_blank" rel="noreferrer" className="underline text-sm">
                        📎 {msg.fileName || 'файл'}{msg.size ? ` (${Math.ceil((msg.size || 0)/1024)} KB)` : ''}
                      </a>
                    )}
                  </div>
                )}

                <span className="block text-xs opacity-80 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Composer */}
      <div className="bg-gray-900 border border-gray-800 rounded p-2">
        <div className="flex items-center gap-2 mb-2">
          <button
            className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
            onClick={() => document.getElementById('file-upload')?.click()}
            title="Прикрепить файл"
          >
            📎
          </button>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            className={`px-2 py-1 rounded ${showEmoji ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'}`}
            onClick={() => setShowEmoji(v => !v)}
            title="Эмодзи"
          >
            😊
          </button>

          {file && (
            <div className="text-xs opacity-80 ml-2 select-none">
              📎 {file.name} ({Math.ceil(file.size / 1024)} KB)
              <button className="ml-2 underline" onClick={() => setFile(null)}>убрать</button>
            </div>
          )}
        </div>

        {showEmoji && (
          <div className="mb-2">
            <Picker
              theme="dark"
              onEmojiSelect={(emoji: any) => setMessageText(prev => prev + (emoji?.native || ''))}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            rows={2}
            className="flex-1 px-4 py-2 rounded bg-gray-800 text-white resize-y"
            placeholder="Напишите сообщение… (Shift+Enter — новая строка)"
          />
          <button
            onClick={sendMessage}
            disabled={sending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-white"
          >
            ➤
          </button>
        </div>

        <div className="text-xs opacity-60 mt-2">
          Перетащите файл в область истории сверху, чтобы прикрепить.
        </div>
      </div>
    </div>
  )
}
