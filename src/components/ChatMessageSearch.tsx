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

  // Фокусируем поле ввода при открытии (без прокрутки)
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Небольшая задержка чтобы избежать прокрутки
      setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true })
      }, 100)
    }
  }, [isOpen])

  // КРИТИЧНО: Убираем квадратную обводку outline для поля поиска сообщений
  useEffect(() => {
    const input = searchInputRef.current
    if (!input || !isOpen) return

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
    <div className="sticky top-0 left-0 right-0 z-50 bg-slate-800/98 backdrop-blur-xl border-b border-slate-700/50 p-3 shadow-lg">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/80" />
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
            className="w-full pl-11 pr-10 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500/60 focus:bg-slate-700/70 transition-all duration-200"
            style={{ 
              outline: 'none',
              outlineOffset: '0',
              boxShadow: 'none',
              WebkitAppearance: 'none',
              appearance: 'none'
            } as React.CSSProperties}
            autoFocus={false}
            aria-label="Поиск в сообщениях"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-600/50"
              aria-label="Очистить поиск"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchQuery && matchCount > 0 && (
          <>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/40 rounded-lg border border-slate-600/30">
              <span className="text-sm font-medium text-emerald-300 whitespace-nowrap">
                {currentMatch} / {matchCount}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={onPrevious}
                disabled={matchCount === 0}
                className="p-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                aria-label="Предыдущее совпадение"
                title="Предыдущее (Shift+Enter)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={onNext}
                disabled={matchCount === 0}
                className="p-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                aria-label="Следующее совпадение"
                title="Следующее (Enter)"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {searchQuery && matchCount === 0 && (
          <div className="text-sm text-gray-400 px-3">Ничего не найдено</div>
        )}

        <button
          onClick={onClose}
          className="p-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-gray-400 hover:text-white hover:bg-slate-600/70 transition-all duration-200"
          aria-label="Закрыть поиск"
          title="Закрыть (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

