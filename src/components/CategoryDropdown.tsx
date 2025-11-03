'use client'

import { useState, useRef, useEffect } from 'react'

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
  const [clickedCategoryId, setClickedCategoryId] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setClickedCategoryId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMouseEnter = (categoryId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    // На десктопе используем hover
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setHoveredCategoryId(categoryId)
    }
  }

  const handleMouseLeave = () => {
    // На десктопе закрываем при уходе мыши
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      timeoutRef.current = setTimeout(() => {
        setHoveredCategoryId(null)
      }, 250)
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    // На мобильных переключаем кликом
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setClickedCategoryId(clickedCategoryId === categoryId ? null : categoryId)
      setHoveredCategoryId(null)
    }
  }

  const handleSubcategoryClick = (id: string) => {
    onSelectSubcategory(id)
    setHoveredCategoryId(null)
    setClickedCategoryId(null)
  }

  if (!categories.length) {
    return (
      <div className="text-gray-400 italic mb-6">
        Категории пока не загружены...
      </div>
    )
  }

  const isOpen = (categoryId: string) => {
    return hoveredCategoryId === categoryId || clickedCategoryId === categoryId
  }

  const openCategory = categories.find(cat => isOpen(cat.id))

  return (
    <>
      <div ref={dropdownRef} className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6 overflow-x-visible relative" style={{ zIndex: 1 }}>
        {categories.map((category) => (
          <div
            key={category.id}
            className="relative group"
            style={{ zIndex: isOpen(category.id) ? 9999 : 1 }}
            onMouseEnter={() => handleMouseEnter(category.id)}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => handleCategoryClick(category.id)}
              className={`px-3 sm:px-5 py-2 rounded-xl border border-emerald-500/30 bg-black/40 text-emerald-300 font-medium transition-all duration-200 hover:bg-emerald-700/30 hover:text-emerald-100 hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] active:scale-95 touch-manipulation text-sm sm:text-base ${
                isOpen(category.id)
                  ? 'bg-emerald-700/40 shadow-[0_0_25px_rgba(16,185,129,0.6)] text-emerald-100'
                  : ''
              }`}
            >
              {category.name}
              {category.subcategories && category.subcategories.length > 0 && (
                <span className="ml-2 text-xs opacity-70">
                  {isOpen(category.id) ? '▲' : '▼'}
                </span>
              )}
            </button>

            {/* На десктопе - выпадающий список рядом с кнопкой */}
            {isOpen(category.id) &&
              category.subcategories &&
              category.subcategories.length > 0 && (
                <div 
                  className="hidden md:block absolute left-0 top-full z-[9999] mt-2 w-auto min-w-[220px] border border-emerald-500/30 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] p-2 animate-fadeIn space-y-1 overflow-y-auto custom-scrollbar"
                  onMouseEnter={() => {
                    if (timeoutRef.current) clearTimeout(timeoutRef.current)
                  }}
                  onMouseLeave={handleMouseLeave}
                  style={{ 
                    position: 'absolute', 
                    zIndex: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                >
                  {category.subcategories.map((subcat) => (
                    <button
                      key={subcat.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSubcategoryClick(subcat.id)
                      }}
                      className="w-full text-left px-4 py-2 rounded-lg text-sm text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-100 active:bg-emerald-600/40 transition-all touch-manipulation whitespace-nowrap"
                    >
                      {subcat.name}
                    </button>
                  ))}
                </div>
              )}
          </div>
        ))}
      </div>

      {/* На мобильных - выпадающий список под всеми кнопками, чтобы не перекрывать их */}
      {openCategory && openCategory.subcategories && openCategory.subcategories.length > 0 && (
        <div 
          className="md:hidden w-full mb-4 border border-emerald-500/30 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] p-2 animate-fadeIn space-y-1 max-h-[50vh] overflow-y-auto custom-scrollbar"
          style={{ 
            position: 'relative', 
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
        >
          {openCategory.subcategories.map((subcat) => (
            <button
              key={subcat.id}
              onClick={(e) => {
                e.stopPropagation()
                handleSubcategoryClick(subcat.id)
              }}
              className="w-full text-left px-4 py-2.5 rounded-lg text-xs text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-100 active:bg-emerald-600/40 transition-all touch-manipulation whitespace-nowrap"
            >
              {subcat.name}
            </button>
          ))}
        </div>
      )}

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
    </>
  )
}
