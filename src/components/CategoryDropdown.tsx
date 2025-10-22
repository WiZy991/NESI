'use client'

import { useState, useRef } from 'react'

type Subcategory = {
  id: string
  name: string
}

type Category = {
  id: string
  name: string
  subcategories?: Subcategory[] // делаем необязательным, чтобы не ломалось при отсутствии
}

type Props = {
  categories?: Category[]
  onSelectSubcategory: (id: string) => void
}

export default function CategoryDropdown({ categories = [], onSelectSubcategory }: Props) {
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (categoryId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setHoveredCategoryId(categoryId)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredCategoryId(null)
    }, 250)
  }

  const handleSubcategoryClick = (id: string) => {
    onSelectSubcategory(id)
    setHoveredCategoryId(null)
  }

  if (!categories.length) {
    return (
      <div className="text-gray-400 italic mb-6">
        Категории пока не загружены...
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {categories.map((category) => (
        <div
          key={category.id}
          className="relative group"
          onMouseEnter={() => handleMouseEnter(category.id)}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className={`px-5 py-2 rounded-xl border border-emerald-500/30 bg-black/40 text-emerald-300 font-medium transition-all duration-200 hover:bg-emerald-700/30 hover:text-emerald-100 hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] ${
              hoveredCategoryId === category.id
                ? 'bg-emerald-700/40 shadow-[0_0_25px_rgba(16,185,129,0.6)] text-emerald-100'
                : ''
            }`}
          >
            {category.name}
          </button>

          {hoveredCategoryId === category.id &&
            category.subcategories &&
            category.subcategories.length > 0 && (
              <div className="absolute left-0 z-20 mt-2 min-w-[220px] bg-black/80 border border-emerald-500/30 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] backdrop-blur-md p-2 animate-fadeIn space-y-1">
                {category.subcategories.map((subcat) => (
                  <button
                    key={subcat.id}
                    onClick={() => handleSubcategoryClick(subcat.id)}
                    className="w-full text-left px-4 py-2 rounded-lg text-sm text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-100 transition-all"
                  >
                    {subcat.name}
                  </button>
                ))}
              </div>
            )}
        </div>
      ))}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
