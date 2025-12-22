'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Users, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function TeamInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { user, token } = useUser()
  const tokenParam = params.token as string

  const [status, setStatus] = useState<'loading' | 'checking' | 'valid' | 'invalid' | 'processing'>('loading')
  const [invitation, setInvitation] = useState<{
    team: { id: string; name: string }
    inviter: { fullName: string | null; email: string }
  } | null>(null)

  useEffect(() => {
    if (!tokenParam) {
      setStatus('invalid')
      return
    }
    checkInvitation()
  }, [tokenParam])

  const checkInvitation = async () => {
    setStatus('checking')
    try {
      const res = await fetch(`/api/teams/invitations/${tokenParam}`)
      const data = await res.json()

      if (res.ok) {
        setInvitation(data.invitation)
        setStatus('valid')
      } else {
        setStatus('invalid')
      }
    } catch (error) {
      setStatus('invalid')
    }
  }

  const handleAccept = async () => {
    if (!token || !tokenParam) {
      toast.error('Необходимо войти в систему')
      router.push('/login')
      return
    }

    setStatus('processing')
    try {
      const res = await fetch(`/api/teams/invitations/${tokenParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Вы присоединились к команде!')
        router.push(`/teams/${data.teamId}`)
      } else {
        toast.error(data.error || 'Ошибка при принятии приглашения')
        setStatus('valid')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
      setStatus('valid')
    }
  }

  const handleReject = async () => {
    if (!token || !tokenParam) {
      toast.error('Необходимо войти в систему')
      router.push('/login')
      return
    }

    setStatus('processing')
    try {
      const res = await fetch(`/api/teams/invitations/${tokenParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reject' }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Приглашение отклонено')
        router.push('/teams')
      } else {
        toast.error(data.error || 'Ошибка при отклонении приглашения')
        setStatus('valid')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
      setStatus('valid')
    }
  }

  if (status === 'loading' || status === 'checking') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Проверяем приглашение...</p>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900/50 rounded-2xl p-8 border border-gray-700/50 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Приглашение недействительно</h1>
          <p className="text-gray-400 mb-6">
            Это приглашение истекло, было использовано или отменено.
          </p>
          <Link
            href="/teams"
            className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
          >
            Перейти к командам
          </Link>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900/50 rounded-2xl p-8 border border-gray-700/50 text-center">
          <Users className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Приглашение в команду</h1>
          <p className="text-gray-400 mb-6">
            Для принятия приглашения необходимо войти в систему.
          </p>
          <Link
            href={`/login?redirect=/teams/invitations/${tokenParam}`}
            className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
          >
            Войти
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900/50 rounded-2xl p-8 border border-gray-700/50">
        <div className="text-center mb-6">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Приглашение в команду</h1>
          {invitation && (
            <>
              <p className="text-gray-400 mb-2">
                <span className="font-semibold text-white">
                  {invitation.inviter.fullName || invitation.inviter.email}
                </span>
                {' '}приглашает вас присоединиться к команде
              </p>
              <p className="text-xl font-semibold text-emerald-400 mb-6">
                {invitation.team.name}
              </p>
            </>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={status === 'processing'}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'processing' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Обработка...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Принять приглашение
              </>
            )}
          </button>
          <button
            onClick={handleReject}
            disabled={status === 'processing'}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            Отклонить
          </button>
        </div>
      </div>
    </div>
  )
}

