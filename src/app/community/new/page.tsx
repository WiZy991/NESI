'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'
import { ImagePlus, Send, Loader2 } from 'lucide-react'

export default function NewPostPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileId, setFileId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const router = useRouter()
  const { token } = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return toast.error('Напиши что-нибудь!')
    if (!token) return toast.error('Авторизация недействительна')

    setLoading(true)
    const toastId = toast.loading('Создаём тему...')

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          imageUrl: fileId ? `/api/files/${fileId}` : null,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success('Тема создана!', { id: toastId })
        router.push('/community')
      } else toast.error(data.error || 'Ошибка при создании', { id: toastId })
    } catch {
      toast.error('Ошибка сети или сервера', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/chat-file', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setFileId(data.id)
        setFileName(file.name)
        toast.success('Файл загружен')
      } else toast.error(data.error || 'Ошибка загрузки')
    } catch {
      toast.error('Ошибка при загрузке файла')
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 text-white">
      {/* Заголовок с анимированным градиентом */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)] flex items-center gap-3">
          ✏️ Новая тема
        </h1>
        <p className="text-gray-400 text-lg">
          Поделитесь идеями, задайте вопросы или начните обсуждение
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative bg-black/40 backdrop-blur-sm border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.25)] transition-all duration-300"
      >
        {/* Градиентный фон */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-cyan-900/10 opacity-50" />
        
        <div className="relative p-6 sm:p-8 space-y-6">
          {/* Поле ввода текста */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
              Содержание темы
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Расскажите что-то интересное, задайте вопрос или начните дискуссию..."
              rows={8}
              className="w-full p-5 rounded-xl bg-black/60 border border-gray-700/50 text-white placeholder-gray-500 
                focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 
                resize-y transition-all duration-300 shadow-inner text-base leading-relaxed"
            />
            <p className="text-xs text-gray-500">
              Минимум 10 символов • Поддерживается Markdown
            </p>
          </div>

          {/* Прикрепленный файл */}
          {fileName && (
            <div className="flex items-center gap-3 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl animate-fadeIn">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ImagePlus className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-300">Изображение прикреплено</p>
                <p className="text-xs text-gray-400 truncate">{fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFileId(null)
                  setFileName('')
                }}
                className="text-red-400 hover:text-red-300 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Панель действий */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-gray-700/50">
            <label className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-900/30 to-emerald-800/30 
              border border-emerald-500/30 text-emerald-300 cursor-pointer hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] 
              transition-all duration-300 group">
              <ImagePlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Прикрепить изображение</span>
              <input type="file" accept="image/*,.gif" onChange={handleFileChange} className="hidden" />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 
                hover:from-emerald-500 hover:to-emerald-400 font-bold text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] 
                hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-105 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Создание...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Опубликовать тему</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Подсказки */}
      <div className="mt-8 p-6 bg-black/30 backdrop-blur-sm border border-gray-700/30 rounded-xl">
        <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
          💡 Советы для создания хорошей темы
        </h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>Сформулируйте тему четко и понятно</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>Добавьте детали и контекст для лучшего понимания</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>Используйте изображения для наглядности</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>Будьте вежливы и уважительны к другим участникам</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
