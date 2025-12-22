'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'
import { Users, Trash2, MessageSquare, ArrowLeft, UserMinus, Mail } from 'lucide-react'
import Link from 'next/link'

type TeamMember = {
  id: string
  userId: string
  role: 'ADMIN' | 'MEMBER'
  joinedAt: string
  user: {
    id: string
    fullName: string | null
    email: string
    avatarFileId: string | null
  }
}

type Team = {
  id: string
  name: string
  description: string | null
  createdAt: string
  memberCount: number
  taskCount: number
  members: TeamMember[]
  creator: {
    userId: string
    user: {
      id: string
      fullName: string | null
      email: string
    }
  }
  isCreator: boolean
  userRole: 'ADMIN' | 'MEMBER' | null
}

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, token } = useUser()
  const teamId = params.id as string
  
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !teamId) return
    loadTeam()
  }, [token, teamId])

  const loadTeam = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTeam(data.team)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Ошибка при загрузке команды')
        if (res.status === 403 || res.status === 404) {
          router.push('/teams')
        }
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!token || !confirm(`Вы уверены, что хотите удалить ${memberEmail} из команды?`)) {
      return
    }

    setRemovingMember(memberId)
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Участник удален из команды')
        loadTeam()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Ошибка при удалении участника')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setRemovingMember(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-400">Команда не найдена</p>
            <Link href="/teams" className="text-emerald-400 hover:underline mt-4 inline-block">
              Вернуться к списку команд
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isAdmin = team.userRole === 'ADMIN'

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/teams"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к командам
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-400" />
            {team.name}
          </h1>
          {team.description && (
            <p className="text-gray-400">{team.description}</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-emerald-400" />
              <h3 className="text-lg font-semibold">Участники</h3>
            </div>
            <p className="text-3xl font-bold text-white">{team.memberCount}</p>
          </div>
          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold">Задач</h3>
            </div>
            <p className="text-3xl font-bold text-white">{team.taskCount}</p>
          </div>
          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50">
            <Link
              href={`/chats?teamId=${team.id}`}
              className="flex items-center gap-3 text-emerald-400 hover:text-emerald-300"
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-lg font-semibold">Открыть чат команды</span>
            </Link>
          </div>
        </div>

          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Участники команды</h2>
              {isAdmin && (
                <button
                  onClick={() => {
                    const email = prompt('Введите email пользователя для приглашения:')
                    if (email && email.trim()) {
                      // Открываем модальное окно приглашения через API
                      fetch(`/api/teams/${teamId}/invite`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ recipientEmail: email.trim() }),
                      })
                        .then(res => res.json())
                        .then(data => {
                          if (data.error) {
                            alert(data.error)
                          } else {
                            alert('Приглашение отправлено!')
                            loadTeam()
                          }
                        })
                        .catch(() => alert('Ошибка при отправке приглашения'))
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Пригласить
                </button>
              )}
            </div>

          <div className="space-y-3">
            {team.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold">
                    {(member.user.fullName || member.user.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {member.user.fullName || member.user.email}
                      </span>
                      {member.role === 'ADMIN' && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                          Администратор
                        </span>
                      )}
                      {team.isCreator && member.userId === team.creator.userId && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          Создатель
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      Присоединился {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                {isAdmin && member.userId !== user?.id && member.role !== 'ADMIN' && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.user.email)}
                    disabled={removingMember === member.id}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    title="Удалить из команды"
                  >
                    {removingMember === member.id ? (
                      <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

