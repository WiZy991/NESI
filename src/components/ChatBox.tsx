'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import MessageInput from './MessageInput'
import Link from 'next/link'

type Message = {
  id: string
  content: string
  fileUrl?: string
  createdAt: string
  sender: {
    id: string
    fullName?: string
    email: string
  }
}

export default function ChatBox({ taskId }: { taskId: string }) {
  const { token, user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMessages = async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [token])

  const handleNewMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg])
  }

  if (loading) return <div className="text-sm text-gray-400">Загрузка чата...</div>

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] mb-3">
        Чат между заказчиком и исполнителем
      </h2>

      {/* Сообщения */}
      <div className="max-h-96 overflow-y-auto space-y-3 mb-4 p-4 bg-black/40 border border-emerald-500/30 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
        {messages.length === 0 && (
          <p className="text-gray-500 italic text-sm">Сообщений пока нет</p>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender.id === user?.id
          return (
            <div
              key={msg.id}
              className={`max-w-[75%] p-3 rounded-xl text-sm shadow-md ${
                isMine
                  ? 'ml-auto bg-emerald-900/40 border border-emerald-500/40 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'mr-auto bg-gray-900/60 border border-gray-700 text-gray-200 shadow-[0_0_10px_rgba(0,0,0,0.5)]'
              }`}
            >
              {/* Автор */}
              <div className="text-xs text-gray-400 mb-1">
                <Link
                  href={isMine ? '/profile' : `/users/${msg.sender.id}`}
                  className={`${
                    isMine ? 'text-emerald-300' : 'text-blue-400'
                  } hover:underline`}
                >
                  {msg.sender.fullName || msg.sender.email}
                </Link>{' '}
                <span className="text-[10px] text-gray-500">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Текст */}
              {msg.content && <p className="mb-1">{msg.content}</p>}

              {/* Файл */}
              {msg.fileUrl && (
                <div className="mt-2">
                  {msg.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <img
                      src={msg.fileUrl}
                      alt="attachment"
                      className="max-w-[200px] rounded-lg border border-gray-700"
                    />
                  ) : (
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-300 hover:underline text-sm"
                    >
                      📎 Скачать файл
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Ввод сообщения */}
      <MessageInput taskId={taskId} onSend={handleNewMessage} />
    </div>
  )
}
