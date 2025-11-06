'use client'

import { X, Search, ArrowUp, ArrowDown } from 'lucide-react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useEffect, useRef } from 'react'

type ChatMessageSearchProps = {
  isOpen: boolean
  onClose: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  matchCount: number
  currentMatch: number
  onNext: () => void
  onPrevious: () => void
}

export default function ChatMessageSearch({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  matchCount,
  currentMatch,
  onNext,
  onPrevious,
}: ChatMessageSearchProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  useEscapeKey(() => {
    if (isOpen) {
      onClose()
    }
  })

  // КРИТИЧНО: Убираем квадратную обводку outline для поля поиска сообщений
  useEffect(() => {
    const input = searchInputRef.current
    if (!input) return

    const removeOutline = () => {
      input.style.setProperty('outline', 'none', 'important')
      input.style.setProperty('outline-offset', '0', 'important')
      input.style.setProperty('box-shadow', 'none', 'important')
    }

    removeOutline()

    const events = ['focus', 'blur', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend']
    events.forEach(event => {
      input.addEventListener(event, removeOutline, true)
    })

    const observer = new MutationObserver(() => {
      removeOutline()
    })
    observer.observe(input, {
      attributes: true,
      attributeFilter: ['style', 'class']
    })

    return () => {
      events.forEach(event => {
        input.removeEventListener(event, removeOutline, true)
      })
      observer.disconnect()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-900/95 to-teal-900/95 border-b border-emerald-500/30 p-4 shadow-[0_4px_20px_rgba(16,185,129,0.3)] backdrop-blur-md">
      <div className="flex items-center gap-3 max-w-4xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Поиск в сообщениях..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onNext()
              } else if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault()
                onPrevious()
              }
            }}
            className="w-full pl-10 pr-12 py-2.5 bg-black/40 border-2 border-emerald-500/50 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all"
            style={{ 
              outline: 'none',
              outlineOffset: '0',
              boxShadow: 'none',
              WebkitAppearance: 'none',
              appearance: 'none'
            } as React.CSSProperties}
            autoFocus
            aria-label="Поиск в сообщениях"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              aria-label="Очистить поиск"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchQuery && matchCount > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <span>
                {currentMatch} из {matchCount}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={onPrevious}
                disabled={matchCount === 0}
                className="p-2 bg-black/40 border border-emerald-500/50 rounded-lg text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label="Предыдущее совпадение"
                title="Предыдущее (Shift+Enter)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={onNext}
                disabled={matchCount === 0}
                className="p-2 bg-black/40 border border-emerald-500/50 rounded-lg text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label="Следующее совпадение"
                title="Следующее (Enter)"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {searchQuery && matchCount === 0 && (
          <div className="text-sm text-gray-400">Ничего не найдено</div>
        )}

        <button
          onClick={onClose}
          className="p-2 bg-black/40 border border-emerald-500/50 rounded-lg text-gray-400 hover:text-white hover:bg-emerald-500/20 transition"
          aria-label="Закрыть поиск"
          title="Закрыть (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

