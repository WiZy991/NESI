'use client'

import { useState, useEffect } from 'react'

type Category = {
  id: string
  name: string
  subcategories: { id: string; name: string }[]
}

type FiltersProps = {
  onFilterChange: (filters: any) => void
}

export default function TaskFilters({ onFilterChange }: FiltersProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subcategory: '',
    status: '',
    minPrice: '',
    maxPrice: '',
    hasDeadline: '',
    sort: 'new',
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err)
    }
  }

  const handleChange = (field: string, value: string) => {
    const newFilters = { ...filters, [field]: value }
    
    // Сбрасываем подкатегорию при смене категории
    if (field === 'category') {
      newFilters.subcategory = ''
    }
    
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      search: '',
      category: '',
      subcategory: '',
      status: '',
      minPrice: '',
      maxPrice: '',
      hasDeadline: '',
      sort: 'new',
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  const selectedCategory = categories.find((c) => c.id === filters.category)

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
      {/* Поиск */}
      <div>
        <label className="text-gray-300 text-sm mb-2 block font-semibold">
          🔍 Поиск по названию или описанию
        </label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          placeholder="Введите текст для поиска..."
          className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Категория */}
      <div>
        <label className="text-gray-300 text-sm mb-2 block font-semibold">
          📂 Категория
        </label>
        <select
          value={filters.category}
          onChange={(e) => handleChange('category', e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Подкатегория */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div>
          <label className="text-gray-300 text-sm mb-2 block font-semibold">
            📋 Подкатегория
          </label>
          <select
            value={filters.subcategory}
            onChange={(e) => handleChange('subcategory', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
          >
            <option value="">Все подкатегории</option>
            {selectedCategory.subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Статус */}
      <div>
        <label className="text-gray-300 text-sm mb-2 block font-semibold">
          ⭐ Статус
        </label>
        <select
          value={filters.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="">Все статусы</option>
          <option value="open">Открытые</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Завершенные</option>
        </select>
      </div>

      {/* Цена */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-300 text-sm mb-2 block font-semibold">
            💰 Цена от
          </label>
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            placeholder="Мин"
            min="0"
            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="text-gray-300 text-sm mb-2 block font-semibold">
            💰 Цена до
          </label>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            placeholder="Макс"
            min="0"
            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Дедлайн */}
      <div>
        <label className="text-gray-300 text-sm mb-2 block font-semibold">
          ⏰ Дедлайн
        </label>
        <select
          value={filters.hasDeadline}
          onChange={(e) => handleChange('hasDeadline', e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="">Не важно</option>
          <option value="true">Только с дедлайном</option>
          <option value="false">Без дедлайна</option>
        </select>
      </div>

      {/* Сортировка */}
      <div>
        <label className="text-gray-300 text-sm mb-2 block font-semibold">
          🔃 Сортировка
        </label>
        <select
          value={filters.sort}
          onChange={(e) => handleChange('sort', e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="new">Сначала новые</option>
          <option value="old">Сначала старые</option>
          <option value="price_desc">Сначала дорогие</option>
          <option value="price_asc">Сначала дешевые</option>
          <option value="deadline">По дедлайну</option>
          <option value="responses">По количеству откликов</option>
        </select>
      </div>

      {/* Кнопка сброса */}
      <button
        onClick={handleReset}
        className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        🔄 Сбросить фильтры
      </button>
    </div>
  )
}

