'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, token } = useUser()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch('/api/admin/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          if (data.user?.role === 'admin') {
            setAuthorized(true)
          } else {
            router.replace('/login')
          }
        } else {
          router.replace('/login')
        }
      } catch (error) {
        console.error('AdminGuard Error:', error)
        router.replace('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdmin()
  }, [token])

  if (isLoading) return <LoadingSpinner />
  return authorized ? <>{children}</> : null
}
