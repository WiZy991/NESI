'use client'

import ProtectedPage from '@/components/ProtectedPage'
import ProfilePageContent from './ProfilePageContent'

export default function ProfilePage() {
  return (
    <ProtectedPage>
      <ProfilePageContent />
    </ProtectedPage>
  )
}
