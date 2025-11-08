'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { Search, FileText, User, MessageSquare, Settings, Heart, ClipboardList, X } from 'lucide-react'
import { createPortal } from 'react-dom'

type Command = {
  id: string
  label: string
  icon: React.ReactNode
  action: () => void
  keywords: string[]
  category: string
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const { user, token } = useUser()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands: Command[] = [
    {
      id: 'tasks',
      label: 'Каталог задач',
      icon: <ClipboardList className="w-5 h-5" />,
      action: () => router.push('/tasks'),
      keywords: ['задачи', 'каталог', 'tasks'],
      category: 'Навигация',
    },
    {
      id: 'favorites',
      label: 'Избранные задачи',
      icon: <Heart className="w-5 h-5" />,
      action: () => router.push('/tasks/favorites'),
      keywords: ['избранное', 'закладки', 'favorites'],
      category: 'Навигация',
    },
    {
      id: 'my-tasks',
      label: 'Мои задачи',
      icon: <FileText className="w-5 h-5" />,
      action: () => router.push('/tasks/my'),
      keywords: ['мои задачи', 'my tasks'],
      category: 'Навигация',
    },
    {
      id: 'chats',
      label: 'Чаты',
      icon: <MessageSquare className="w-5 h-5" />,
      action: () => router.push('/chats'),
      keywords: ['чаты', 'сообщения', 'chats', 'messages'],
      category: 'Навигация',
    },
    {
      id: 'profile',
      label: 'Профиль',
      icon: <User className="w-5 h-5" />,
      action: () => router.push('/profile'),
      keywords: ['профиль', 'profile'],
      category: 'Навигация',
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: <Settings className="w-5 h-5" />,
      action: () => router.push('/settings'),
      keywords: ['настройки', 'settings'],
      category: 'Навигация',
    },
  ]

  // Фильтруем команды по поисковому запросу
  const filteredCommands = commands.filter((cmd) => {
    if (!search.trim()) return true
    const query = search.toLowerCase()
    return (
      cmd.label.toLowerCase().includes(query) ||
      cmd.keywords.some((kw) => kw.toLowerCase().includes(query))
    )
  })

  // Группируем по категориям
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = []
    }
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, Command[]>)

  // Обработка горячих клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K или Ctrl+K для открытия
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }

      // Escape для закрытия
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setSearch('')
        setSelectedIndex(0)
      }

      // Стрелки вверх/вниз для навигации
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
          e.preventDefault()
          filteredCommands[selectedIndex].action()
          setIsOpen(false)
          setSearch('')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex])

  // Фокус на input при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Прокрутка к выбранному элементу
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  // Сброс индекса при изменении поиска
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  if (!isOpen) return null

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false)
          setSearch('')
        }
      }}
    >
      <div
        className="w-full max-w-2xl bg-gray-900/95 backdrop-blur-sm border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Поиск */}
        <div className="flex items-center gap-3 p-4 border-b border-emerald-500/20">
          <Search className="w-5 h-5 text-emerald-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск команд... (Esc для закрытия)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
          />
          <button
            onClick={() => {
              setIsOpen(false)
              setSearch('')
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Список команд */}
        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto custom-scrollbar"
        >
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>Команды не найдены</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  {category}
                </div>
                {cmds.map((cmd, index) => {
                  const globalIndex = filteredCommands.indexOf(cmd)
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action()
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        selectedIndex === globalIndex
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-gray-300 hover:bg-emerald-500/10 hover:text-emerald-300'
                      }`}
                    >
                      <span className="text-emerald-400">{cmd.icon}</span>
                      <span>{cmd.label}</span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Подсказка */}
        <div className="px-4 py-2 border-t border-emerald-500/20 bg-black/40">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-gray-800 rounded">↑</kbd>
                <kbd className="px-2 py-1 bg-gray-800 rounded">↓</kbd>
                <span>навигация</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-gray-800 rounded">Enter</kbd>
                <span>выбрать</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded">Esc</kbd>
              <span>закрыть</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null
}

