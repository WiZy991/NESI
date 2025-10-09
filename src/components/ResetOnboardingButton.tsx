'use client'

export const ResetOnboardingButton = () => {
  const reset = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('nesi_onboarding_done'))
      .forEach((key) => localStorage.removeItem(key))
    alert('Подсказки сброшены! Они появятся при следующем входе 🚀')
  }

  return (
    <button
      onClick={reset}
      className="text-xs text-gray-400 hover:text-green-400 underline"
    >
      Повторить подсказки
    </button>
  )
}
