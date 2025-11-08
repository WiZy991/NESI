'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/context/UserContext'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'

type FavoriteTaskButtonProps = {
  taskId: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function FavoriteTaskButton({ 
  taskId, 
  className = '',
  size = 'md'
}: FavoriteTaskButtonProps) {
  const { token } = useUser()
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Проверяем статус закладки при загрузке
  useEffect(() => {
    if (!token || !taskId) {
      setChecking(false)
      return
    }

    const checkFavorite = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/favorite`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          setIsFavorite(data.isFavorite)
        }
      } catch (error) {
        console.error('Ошибка при проверке закладки:', error)
      } finally {
        setChecking(false)
      }
    }

    checkFavorite()
  }, [taskId, token])

  const handleToggle = async () => {
    if (!token) {
      toast.error('Войдите, чтобы добавлять задачи в избранное')
      return
    }

    if (loading) return

    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/favorite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (res.ok) {
        const data = await res.json()
        setIsFavorite(data.isFavorite)
        toast.success(data.message || (data.isFavorite ? 'Добавлено в избранное' : 'Удалено из избранного'))
      } else {
        const error = await res.json().catch(() => ({}))
        toast.error(error.error || 'Ошибка при работе с закладкой')
      }
    } catch (error) {
      console.error('Ошибка при работе с закладкой:', error)
      toast.error('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <button
        className={`${className} opacity-50 cursor-not-allowed`}
        disabled
        aria-label="Проверка статуса закладки"
      >
        <Heart className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} text-gray-400`} />
      </button>
    )
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`${className} transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
      aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
    >
      <Heart
        className={`${sizeClasses[size]} transition-all duration-200 ${
          isFavorite
            ? 'fill-red-500 text-red-500'
            : 'text-gray-400 hover:text-red-400'
        }`}
      />
    </button>
  )
}

