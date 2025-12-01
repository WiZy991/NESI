'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FreelancerProfileRedirect({ userId }: { userId: string }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/users/${userId}`)
  }, [userId, router])

  return null
}

