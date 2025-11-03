'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }
    
    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }
  
  if (!isVisible) return null
  
  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 p-3 bg-emerald-500/20 border border-emerald-400/50 rounded-full text-emerald-300 hover:bg-emerald-500/30 transition-all z-50 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-110 active:scale-95"
      aria-label="Прокрутить страницу наверх"
      aria-hidden={!isVisible}
    >
      <ArrowUp className="w-6 h-6" aria-hidden="true" />
    </button>
  )
}

