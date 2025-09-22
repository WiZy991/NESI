'use client'

import { useState, useRef } from 'react'

type Subcategory = {
  id: string
  name: string
}

type Category = {
  id: string
  name: string
  subcategories: Subcategory[]
}

type Props = {
  categories?: Category[] // <- добавили `?` чтобы не упасть, если undefined
  onSelectSubcategory: (id: string) => void
}

export default function CategoryDropdown({ categories, onSelectSubcategory }: Props) {
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (categoryId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setHoveredCategoryId(categoryId)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredCategoryId(null)
    }, 300) // 300 мс задержка перед закрытием
  }

  const handleSubcategoryClick = (id: string) => {
    onSelectSubcategory(id)
    setHoveredCategoryId(null)
  }

  if (!Array.isArray(categories)) {
    return null // или можно вернуть прелоадер
  }

  return (
    <div className="flex gap-4">
      {categories.map((category) => (
        <div
          key={category.id}
          className="relative"
          onMouseEnter={() => handleMouseEnter(category.id)}
          onMouseLeave={handleMouseLeave}
        >
          <button className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700">
            {category.name}
          </button>

          {hoveredCategoryId === category.id && (
            <div className="absolute left-0 z-20 mt-1 w-56 bg-slate-900 text-white border border-gray-700 rounded shadow-lg">
              {category.subcategories.map((subcat) => (
                <button
                  key={subcat.id}
                  onClick={() => handleSubcategoryClick(subcat.id)}
                  className="block w-full text-left px-4 py-2 hover:bg-slate-800"
                >
                  {subcat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
