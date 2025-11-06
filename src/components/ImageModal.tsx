'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ImageModalProps {
  imageUrl: string
  alt?: string
  onClose: () => void
}

export default function ImageModal({ imageUrl, alt = '', onClose }: ImageModalProps) {
  useEffect(() => {
    // Блокируем скролл при открытом модальном окне
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      data-nextjs-scroll-focus-boundary={false}
    >
      {/* Кнопка закрытия */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition"
        aria-label="Закрыть"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Изображение */}
      <div
        className="relative max-w-[95vw] max-h-[95vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

