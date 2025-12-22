'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'
import { Users, Plus, Mail, UserPlus, Trash2, Settings, MessageSquare, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

type Team = {
  id: string
  name: string
  description: string | null
  createdAt: string
  memberCount: number
  taskCount: number
  members: Array<{
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
  }>
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

export default function TeamsPage() {
  const { user, token } = useUser()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (!token) return
    loadTeams()
  }, [token])

  const loadTeams = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams || [])
      } else {
        toast.error('Ошибка при загрузке команд')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!token || !newTeamName.trim()) {
      toast.error('Введите название команды')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || null,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Команда создана')
        setShowCreateModal(false)
        setNewTeamName('')
        setNewTeamDescription('')
        loadTeams()
      } else {
        // Если ошибка связана с доступом, показываем более подробное сообщение
        if (data.error?.includes('Групповые функции недоступны') || data.error?.includes('подтвердить компанию')) {
          toast.error(data.error, { duration: 5000 })
        } else {
          toast.error(data.error || 'Ошибка при создании команды')
        }
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setCreating(false)
    }
  }

  const handleInvite = async (teamId: string) => {
    if (!token || !inviteEmail.trim()) {
      toast.error('Введите email пользователя')
      return
    }

    setInviting(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientEmail: inviteEmail.trim() }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Приглашение отправлено')
        setShowInviteModal(null)
        setInviteEmail('')
      } else {
        toast.error(data.error || 'Ошибка при отправке приглашения')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setInviting(false)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!token) return
    if (!confirm('Вы уверены, что хотите удалить команду? Это действие нельзя отменить.')) {
      return
    }

    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Команда удалена')
        loadTeams()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Ошибка при удалении команды')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    }
  }

  // Проверяем доступ к групповым функциям
  const canUseGroupFeatures = user?.role === 'executor' && 
    (user?.accountType === 'SOLE_PROPRIETOR' || user?.accountType === 'COMPANY') &&
    user?.companyVerification?.innVerified === true &&
    user?.companyVerification?.emailVerified === true

  if (loading) {
    return (
      <div className="min-h-screen text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  // Показываем предупреждение для пользователей без доступа к групповым функциям
  if (!canUseGroupFeatures) {
    return (
      <div className="min-h-screen text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl p-12 text-center">
            <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-4">Групповые функции недоступны</h2>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Групповые функции (команды) доступны только для исполнителей со статусом ИП или ООО 
              с подтвержденной компанией. Физические лица и самозанятые не могут использовать этот функционал.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Для доступа к групповым функциям необходимо:
            </p>
            <ul className="text-gray-400 text-sm mb-6 space-y-2 max-w-md mx-auto text-left">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>Быть исполнителем со статусом ИП или ООО</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>Подтвердить существование компании через ИНН</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>Подтвердить корпоративную почту</span>
              </li>
            </ul>
            <Link
              href="/settings"
              className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              Перейти в настройки
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-400" />
              Команды
            </h1>
            <p className="text-gray-400">
              Управление командами исполнителей для совместной работы
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Создать команду
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="rounded-2xl p-12 text-center">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Нет команд</h2>
            <p className="text-gray-400 mb-6">
              Создайте команду для совместной работы над задачами
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              Создать первую команду
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-2xl p-6 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-1">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-gray-400">{team.description}</p>
                    )}
                  </div>
                  {team.isCreator && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                      Создатель
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {team.memberCount} участников
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {team.taskCount} задач
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {team.members.slice(0, 3).map((member) => (
                    <div
                      key={member.id}
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs"
                      title={member.user.fullName || member.user.email}
                    >
                      {(member.user.fullName || member.user.email)[0].toUpperCase()}
                    </div>
                  ))}
                  {team.memberCount > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                      +{team.memberCount - 3}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-center"
                  >
                    Открыть
                  </Link>
                  {team.userRole === 'ADMIN' && (
                    <>
                      <button
                        onClick={() => setShowInviteModal(team.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                        title="Пригласить участника"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      {team.isCreator && (
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                          title="Удалить команду"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Модальное окно создания команды */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Создать команду</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Название команды</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Название команды"
                    className="w-full bg-black/60 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Описание (необязательно)</label>
                  <textarea
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="Описание команды"
                    rows={3}
                    className="w-full bg-black/60 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewTeamName('')
                    setNewTeamDescription('')
                  }}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={creating || !newTeamName.trim()}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Создание...
                    </>
                  ) : (
                    'Создать'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно приглашения */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Пригласить участника</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Email пользователя</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-black/60 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowInviteModal(null)
                    setInviteEmail('')
                  }}
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleInvite(showInviteModal)}
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {inviting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Отправить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

