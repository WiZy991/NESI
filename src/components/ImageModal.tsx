'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

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

  if (typeof window === 'undefined') return null

  const isMobileView = window.innerWidth < 640

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex ${isMobileView ? 'items-end' : 'items-center justify-center'} bg-black/70 backdrop-blur-sm`}
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
        className={`relative ${isMobileView ? 'w-full h-[90vh] p-2' : 'max-w-[95vw] max-h-[95vh] p-4'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={alt}
          className={`max-w-full ${isMobileView ? 'max-h-full' : 'max-h-[95vh]'} object-contain ${isMobileView ? 'rounded-t-lg' : 'rounded-lg'} shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    document.body
  )
}

