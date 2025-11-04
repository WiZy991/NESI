'use client'

import { Calendar, Clock } from 'lucide-react'

type DateFilterProps = {
  value: string
  onChange: (value: string) => void
}

const dateFilters = [
  { value: '', label: 'Все время' },
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Эта неделя' },
  { value: 'month', label: 'Этот месяц' },
  { value: 'year', label: 'Этот год' },
]

export default function DateFilter({ value, onChange }: DateFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-emerald-400 text-sm font-medium flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Фильтр по дате
      </label>
      <div className="flex flex-wrap gap-2">
        {dateFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onChange(filter.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
              value === filter.value
                ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-black/60 border border-emerald-500/30 text-gray-300 hover:border-emerald-400 hover:text-emerald-300'
            }`}
            aria-label={`Фильтр: ${filter.label}`}
            aria-pressed={value === filter.value}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}

