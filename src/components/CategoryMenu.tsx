'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Subcategory = {
  id: string
  name: string
}

type Category = {
  id: string
  name: string
  subcategories: Subcategory[]
}

export default function CategoryMenu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
  }, [])

  return (
    <div className="flex gap-3 flex-wrap">
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="relative group"
          onMouseEnter={() => setActiveCategory(cat.id)}
          onMouseLeave={() => setActiveCategory(null)}
        >
          {/* Категория */}
          <button
            className={`px-5 py-2 rounded-xl transition-all border border-emerald-500/30 
                        bg-black/40 text-emerald-300 font-medium shadow-[0_0_10px_rgba(16,185,129,0.2)]
                        hover:bg-emerald-700/30 hover:text-emerald-100 
                        hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]
                        ${activeCategory === cat.id ? 'bg-emerald-700/40 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.6)]' : ''}
                      `}
          >
            {cat.name}
          </button>

          {/* Подкатегории */}
          {activeCategory === cat.id && cat.subcategories.length > 0 && (
            <div
              className="absolute left-0 mt-2 z-20 min-w-[220px] bg-black/80 border border-emerald-500/30 
                         rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] backdrop-blur-md p-2 
                         animate-fadeIn space-y-1"
            >
              {cat.subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/tasks/category/${sub.id}`}
                  className="block px-4 py-2 rounded-lg text-sm text-emerald-300 
                             hover:bg-emerald-600/30 hover:text-emerald-100 transition-all"
                >
                  {sub.name}
                </Link>
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
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
