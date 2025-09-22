// src/components/CategoryMenu.tsx
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

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories))
  }, [])

  return (
    <div className="flex gap-4 flex-wrap">
      {categories.map((cat) => (
        <div key={cat.id} className="relative group">
          <button className="text-white bg-gray-800 px-4 py-2 rounded hover:bg-gray-700">
            {cat.name}
          </button>
          <div className="absolute hidden group-hover:block bg-gray-900 border border-gray-700 mt-2 z-10 rounded shadow-lg">
            {cat.subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/tasks/category/${sub.id}`}
                className="block px-4 py-2 text-white hover:bg-gray-800"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
