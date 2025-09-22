'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()
  const [canRender, setCanRender] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login') // редирект если неавторизован
      } else {
        setCanRender(true) // можно отрисовывать
      }
    }
  }, [loading, user, router])

  if (!canRender) {
    return <div className="text-center mt-10">Загрузка...</div>
  }

  return <>{children}</>
}
