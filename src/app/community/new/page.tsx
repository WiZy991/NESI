'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'
import { ImagePlus, Send, Loader2, Plus, X } from 'lucide-react'

// Функция для форматирования размера файла
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export default function NewPostPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileId, setFileId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileSize, setFileSize] = useState(0)
  const [uploadXHR, setUploadXHR] = useState<XMLHttpRequest | null>(null)
  const [isPoll, setIsPoll] = useState(false)
  const [pollOptions, setPollOptions] = useState<Array<{ id: number; value: string }>>([
    { id: 1, value: '' },
    { id: 2, value: '' },
  ])
  const router = useRouter()
  const { token } = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && !isPoll) return toast.error('Напиши что-нибудь!')
    if (!token) return toast.error('Авторизация недействительна')

    setLoading(true)
    const toastId = toast.loading('Создаём тему...')

    try {
      let pollPayload: { isPoll: true; options: string[] } | undefined
      if (isPoll) {
        const options = pollOptions
          .map(option => option.value.trim())
          .filter(option => option.length > 0)

        if (options.length < 2) {
          toast.error('Добавьте минимум два варианта для опроса', { id: toastId })
          setLoading(false)
          return
        }

        pollPayload = { isPoll: true, options }
      }

      const res = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content || '', // Отправляем пустую строку вместо null/undefined
          imageUrl: fileId ? `/api/files/${fileId}` : null,
          mediaType: mediaType,
          poll: pollPayload,
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

    // Отменяем предыдущую загрузку, если она идет
    if (isUploading && uploadXHR) {
      uploadXHR.abort()
      setUploadXHR(null)
    }

    // Очищаем предыдущие значения
    setFileId(null)
    setFileName('')
    setFilePreview(null)
    setIsUploading(false)
    setIsProcessing(false)
    setUploadProgress(0)
    setFileSize(0)

    // Определяем тип файла
    const fileType = file.type
    const isVideo = fileType.startsWith('video/')
    const isImage = fileType.startsWith('image/')
    
    if (!isVideo && !isImage) {
      toast.error('Поддерживаются только изображения и видео')
      e.target.value = '' // Очищаем input
      return
    }

    // Проверка размера файла
    // Оптимальные размеры для веб-платформы:
    // - Изображения: 5MB достаточно для качественных фото (обычно 500KB-2MB)
    // - Видео: 30MB для коротких видео в постах (обычно 5-20MB для 15-60 сек видео)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB для изображений
    const MAX_VIDEO_SIZE = 30 * 1024 * 1024 // 30MB для видео
    
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      toast.error(`Изображение слишком большое. Максимум ${MAX_IMAGE_SIZE / 1024 / 1024}MB`)
      e.target.value = '' // Очищаем input
      return
    }
    
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      toast.error(`Видео слишком большое. Максимум ${MAX_VIDEO_SIZE / 1024 / 1024}MB`)
      e.target.value = '' // Очищаем input
      return
    }

    const detectedMediaType = isVideo ? 'video' : 'image'
    setMediaType(detectedMediaType)

    // Создаем превью сразу
    let previewUrl: string | null = null
    if (isVideo) {
      previewUrl = URL.createObjectURL(file)
      setFilePreview(previewUrl)
    } else {
      previewUrl = URL.createObjectURL(file)
      setFilePreview(previewUrl)
    }

    // Устанавливаем имя файла и размер сразу для отображения
    setFileName(file.name)
    setFileSize(file.size)

    // Загружаем файл на сервер с отслеживанием прогресса
    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const xhr = new XMLHttpRequest()
      setUploadXHR(xhr)

      // Отслеживание прогресса загрузки
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(percentComplete)
          
          // Когда загрузка завершена (100%), но еще ждем ответ сервера
          if (percentComplete === 100 && !isProcessing) {
            setIsProcessing(true)
          }
        }
      })

      // Обработка завершения
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            console.log('📤 Ответ сервера:', { ok: true, status: xhr.status, data })
            
            if (data && (data.id || data.url)) {
              const uploadedId = data.id || (data.url ? data.url.replace('/api/files/', '') : null)
              
              if (uploadedId) {
                setFileId(uploadedId)
                setUploadProgress(100)
                setIsUploading(false)
                setIsProcessing(false)
                setUploadXHR(null)
                console.log('✅ Файл успешно загружен, ID:', uploadedId)
                
                // Через небольшую задержку убираем прогресс-бар
                setTimeout(() => {
                  setUploadProgress(0)
                }, 1500)
              } else {
                throw new Error('ID файла не получен')
              }
            } else {
              throw new Error('Неверный формат ответа')
            }
          } catch (parseError) {
            console.error('❌ Ошибка парсинга ответа:', parseError)
            handleUploadError(previewUrl, e)
          }
        } else {
          handleUploadError(previewUrl, e)
        }
      })

      // Обработка ошибок
      xhr.addEventListener('error', () => {
        handleUploadError(previewUrl, e)
      })

      xhr.addEventListener('abort', () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setFilePreview(null)
        setFileName('')
        setFileId(null)
        setIsUploading(false)
        setIsProcessing(false)
        setUploadProgress(0)
        setFileSize(0)
        setUploadXHR(null)
        toast.info('Загрузка отменена')
      })

      // Отправка запроса
      xhr.open('POST', '/api/upload/chat-file')
      xhr.send(formData)

    } catch (error: any) {
      handleUploadError(previewUrl, e)
    }

    function handleUploadError(previewUrl: string | null, input: HTMLInputElement) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setFilePreview(null)
      setFileName('')
      setFileId(null)
      setIsUploading(false)
      setIsProcessing(false)
      setUploadProgress(0)
      setFileSize(0)
      setUploadXHR(null)
      toast.error('Ошибка при загрузке файла')
      input.value = ''
      console.error('❌ Ошибка загрузки файла')
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
          {(fileName || filePreview) && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl animate-fadeIn">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <ImagePlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-300 flex items-center gap-2 flex-wrap">
                    <span>{mediaType === 'video' ? 'Видео прикреплено' : 'Изображение прикреплено'}</span>
                    {fileId ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-900/30 px-2 py-0.5 rounded">
                        <span>✓</span>
                        <span>Загружено</span>
                      </span>
                    ) : isProcessing ? (
                      <span className="text-xs text-blue-400 flex items-center gap-1 bg-blue-900/30 px-2 py-0.5 rounded animate-pulse">
                        <span>⚙️</span>
                        <span>Обработка...</span>
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-400 flex items-center gap-1 bg-yellow-900/30 px-2 py-0.5 rounded animate-pulse">
                        <span>⏳</span>
                        <span>Загрузка...</span>
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{fileName}</p>
                  {/* Прогресс-бар загрузки */}
                  {(isUploading || isProcessing) && uploadProgress >= 0 && (
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ease-out ${
                          isProcessing 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-400 animate-pulse' 
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        }`}
                        style={{ width: `${isProcessing ? 100 : uploadProgress}%` }}
                      />
                    </div>
                  )}
                  {(isUploading || isProcessing) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {isProcessing 
                        ? `Обработка файла... (${formatFileSize(fileSize)})`
                        : `Загружено: ${uploadProgress}% (${formatFileSize(fileSize)})`
                      }
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Отменяем загрузку, если она идет
                    if (isUploading && uploadXHR) {
                      uploadXHR.abort()
                      setUploadXHR(null)
                    }
                    if (filePreview) URL.revokeObjectURL(filePreview)
                    setFileId(null)
                    setFileName('')
                    setFilePreview(null)
                    setMediaType('image')
                    setIsUploading(false)
                    setIsProcessing(false)
                    setUploadProgress(0)
                    setFileSize(0)
                    // Очищаем input
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                    if (fileInput) fileInput.value = ''
                  }}
                  className="text-red-400 hover:text-red-300 transition"
                  title={isUploading ? 'Отменить загрузку' : 'Удалить файл'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {filePreview && (
                <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-gray-900">
                  {mediaType === 'video' ? (
                    <video
                      src={filePreview}
                      controls
                      className="w-full max-h-96 object-contain"
                      preload="metadata"
                      onError={(e) => {
                        console.error('Ошибка загрузки видео превью:', e)
                        const video = e.target as HTMLVideoElement
                        video.style.display = 'none'
                      }}
                    />
                  ) : (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-full max-h-96 object-contain"
                      onError={(e) => {
                        console.error('Ошибка загрузки изображения превью:', e)
                        const img = e.target as HTMLImageElement
                        img.style.display = 'none'
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Панель действий */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-gray-700/50">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-900/30 to-emerald-800/30 
                border border-emerald-500/30 text-emerald-300 cursor-pointer hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] 
                transition-all duration-300 group">
                <ImagePlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Прикрепить медиа</span>
                <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-500 px-5">
                Максимальный размер: <span className="text-emerald-400">5 MB</span> для изображений, <span className="text-emerald-400">30 MB</span> для видео
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || isUploading || isProcessing || (fileName && !fileId)}
              className="flex items-center justify-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 
                hover:from-emerald-500 hover:to-emerald-400 font-bold text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] 
                hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-105 active:scale-95"
              title={isUploading || isProcessing ? 'Дождитесь завершения загрузки медиа' : (fileName && !fileId) ? 'Дождитесь завершения загрузки файла' : ''}
            >
              {loading || isUploading || isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isUploading || isProcessing ? 'Загрузка медиа...' : 'Создание...'}</span>
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
