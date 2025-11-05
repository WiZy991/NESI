'use client'

import { X, Search, ArrowUp, ArrowDown } from 'lucide-react'
import { useEscapeKey } from '@/hooks/useEscapeKey'

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
  useEscapeKey(() => {
    if (isOpen) {
      onClose()
    }
  })

  if (!isOpen) return null

  return (
    <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-900/95 to-teal-900/95 border-b border-emerald-500/30 p-4 shadow-[0_4px_20px_rgba(16,185,129,0.3)] backdrop-blur-md">
      <div className="flex items-center gap-3 max-w-4xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
          <input
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
            className="w-full pl-10 pr-12 py-2.5 bg-black/40 border border-emerald-500/50 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
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

