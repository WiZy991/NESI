'use client'

import { useRouter } from 'next/navigation'
import { BookOpen, Sparkles } from 'lucide-react'

export const ResetOnboardingButton = () => {
  const router = useRouter()
  
  const reset = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('nesi_onboarding_done'))
      .forEach((key) => localStorage.removeItem(key))
    
    // Перезагружаем страницу, чтобы онбординг запустился снова
    router.refresh()
    window.location.reload()
  }

  return (
    <button
      onClick={reset}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-sm text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
    >
      <Sparkles className="w-4 h-4" />
      Повторить интерактивный тур
    </button>
  )
}
