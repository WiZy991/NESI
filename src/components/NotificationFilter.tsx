'use client'

import { Bell, MessageSquare, CheckCircle2, Star, Settings, Filter } from 'lucide-react'
import { useState } from 'react'

interface NotificationFilterProps {
  value: string
  onChange: (value: string) => void
  notificationCounts?: {
    all: number
    unread: number
    message: number
    task: number
    payment: number
    system: number
  }
}

const filterOptions = [
  { value: 'all', label: 'Все уведомления', icon: Bell, color: 'emerald' },
  { value: 'unread', label: 'Непрочитанные', icon: CheckCircle2, color: 'blue' },
  { value: 'message', label: 'Сообщения', icon: MessageSquare, color: 'cyan' },
  { value: 'task', label: 'Задачи', icon: Star, color: 'yellow' },
  { value: 'payment', label: 'Платежи', icon: () => <span className="text-xl font-bold">₽</span>, color: 'green' },
  { value: 'system', label: 'Системные', icon: Settings, color: 'gray' },
]

export default function NotificationFilter({
  value,
  onChange,
  notificationCounts,
}: NotificationFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      emerald: isActive
        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
        : 'bg-black/40 border-emerald-700/50 text-gray-300 hover:border-emerald-600/50 hover:text-emerald-300',
      blue: isActive
        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
        : 'bg-black/40 border-blue-700/50 text-gray-300 hover:border-blue-600/50 hover:text-blue-300',
      cyan: isActive
        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
        : 'bg-black/40 border-cyan-700/50 text-gray-300 hover:border-cyan-600/50 hover:text-cyan-300',
      yellow: isActive
        ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
        : 'bg-black/40 border-yellow-700/50 text-gray-300 hover:border-yellow-600/50 hover:text-yellow-300',
      green: isActive
        ? 'bg-green-600/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
        : 'bg-black/40 border-green-700/50 text-gray-300 hover:border-green-600/50 hover:text-green-300',
      gray: isActive
        ? 'bg-gray-600/20 border-gray-500 text-gray-400 shadow-[0_0_15px_rgba(156,163,175,0.3)]'
        : 'bg-black/40 border-gray-700/50 text-gray-300 hover:border-gray-600/50 hover:text-gray-300',
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  const currentFilter = filterOptions.find((opt) => opt.value === value) || filterOptions[0]
  const CurrentIcon = currentFilter.icon

  return (
    <div className="relative">
      {/* Кнопка открытия фильтра */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 backdrop-blur-sm min-h-[44px] ${
          isOpen
            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            : 'bg-black/60 border-emerald-700/50 text-gray-300 hover:border-emerald-600/50 hover:text-emerald-300'
        }`}
        aria-label="Фильтр уведомлений"
        aria-expanded={isOpen}
      >
        <Filter className="w-4 h-4" />
        {typeof CurrentIcon === 'function' ? <CurrentIcon /> : <CurrentIcon className="w-4 h-4" />}
        <span className="font-medium">{currentFilter.label}</span>
        {notificationCounts && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-600/20 text-xs text-emerald-400 border border-emerald-500/30">
            {notificationCounts[value as keyof typeof notificationCounts] || 0}
          </span>
        )}
      </button>

      {/* Выпадающее меню фильтров */}
      {isOpen && (
        <>
          {/* Затемненный фон */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Меню */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-gradient-to-br from-[#001a12] to-[#002a1f] border border-emerald-700/50 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-md z-50 overflow-hidden">
            <div className="p-2">
              {filterOptions.map((option) => {
                const OptionIcon = option.icon
                const isActive = value === option.value
                const count = notificationCounts?.[option.value as keyof typeof notificationCounts]

                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-all duration-200 ${
                      getColorClasses(option.color, isActive)
                    }`}
                    aria-label={option.label}
                  >
                    <div className="flex items-center gap-3">
                      {typeof OptionIcon === 'function' ? <OptionIcon /> : <OptionIcon className="w-5 h-5 flex-shrink-0" />}
                      <span className="font-medium">{option.label}</span>
                    </div>
                    {count !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-black/40 text-xs border border-current/30">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

