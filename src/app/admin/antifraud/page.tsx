'use client'

import { useConfirm } from '@/lib/confirm'
import { useEffect, useState } from 'react'

type ActivityLog = {
  id: string
  userId: string
  action: string
  ipAddress: string | null
  userAgent: string | null
  metadata: any
  createdAt: string
  user: {
    id: string
    email: string
    fullName: string | null
    blocked: boolean
  }
}

type SuspiciousPair = {
  userA: { id: string; email: string; fullName: string | null }
  userB: { id: string; email: string; fullName: string | null }
  mutualTasksCount: number
  tasks: any[]
}

export default function AntiFraudPage() {
  const { confirm, Dialog } = useConfirm()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [suspiciousPairs, setSuspiciousPairs] = useState<SuspiciousPair[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'logs' | 'circular'>('logs')
  const [filterAction, setFilterAction] = useState('')

  useEffect(() => {
    fetchData()
  }, [filterAction])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')

      // Загружаем логи
      const logsUrl = filterAction
        ? `/api/admin/activity-logs?action=${filterAction}&limit=100`
        : '/api/admin/activity-logs?limit=100'

      const logsRes = await fetch(logsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setLogs(logsData.logs)
      }

      // Загружаем круговые сделки (только если на вкладке)
      if (activeTab === 'circular') {
        const fraudRes = await fetch('/api/admin/fraud-detection', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (fraudRes.ok) {
          const fraudData = await fraudRes.json()
          setSuspiciousPairs(fraudData.suspiciousPairs)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      login_success: 'bg-green-600',
      login_blocked: 'bg-red-600',
      withdraw_success: 'bg-blue-600',
      withdraw_blocked: 'bg-orange-600',
      register: 'bg-purple-600',
    }
    return colors[action] || 'bg-gray-600'
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login_success: '✅ Вход',
      login_blocked: '🚫 Вход заблокирован',
      withdraw_success: '💸 Вывод',
      withdraw_blocked: '⚠️ Вывод заблокирован',
      register: '📝 Регистрация',
    }
    return labels[action] || action
  }

  return (
    <div className='p-6 min-h-screen bg-gray-900'>
      <h1 className='text-3xl font-bold text-emerald-400 mb-6'>
        🛡️ Anti-Fraud мониторинг
      </h1>

      {/* Табы */}
      <div className='flex gap-2 mb-6'>
        <button
          onClick={() => {
            setActiveTab('logs')
            fetchData()
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'logs'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          📊 Логи активности
        </button>
        <button
          onClick={() => {
            setActiveTab('circular')
            fetchData()
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'circular'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          🔄 Круговые сделки
        </button>
      </div>

      {loading ? (
        <div className='text-center py-12 text-gray-400'>
          <div className='animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4'></div>
          Загрузка...
        </div>
      ) : (
        <>
          {/* Логи активности */}
          {activeTab === 'logs' && (
            <div>
              {/* Фильтр */}
              <div className='mb-4'>
                <label className='block text-sm text-gray-400 mb-2'>
                  Фильтр по действию:
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className='px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg'
                >
                  <option value=''>Все действия</option>
                  <option value='login_success'>Успешный вход</option>
                  <option value='login_blocked'>Заблокированный вход</option>
                  <option value='withdraw_success'>Успешный вывод</option>
                  <option value='withdraw_blocked'>Заблокированный вывод</option>
                </select>
              </div>

              {/* Таблица логов */}
              <div className='bg-gray-800 rounded-lg overflow-hidden'>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gray-900'>
                      <tr>
                        <th className='p-3 text-left text-sm text-gray-400'>
                          Время
                        </th>
                        <th className='p-3 text-left text-sm text-gray-400'>
                          Пользователь
                        </th>
                        <th className='p-3 text-left text-sm text-gray-400'>
                          Действие
                        </th>
                        <th className='p-3 text-left text-sm text-gray-400'>
                          IP-адрес
                        </th>
                        <th className='p-3 text-left text-sm text-gray-400'>
                          Детали
                        </th>
                        <th className='p-3 text-left text-sm text-gray-400'>
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className='border-t border-gray-700'>
                          <td className='p-3 text-sm text-gray-300'>
                            {new Date(log.createdAt).toLocaleString('ru-RU')}
                          </td>
                          <td className='p-3'>
                            <div>
                              <div className='text-sm text-white'>
                                {log.user.fullName || 'Без имени'}
                              </div>
                              <a
                                href={`/admin/users/${log.user.id}`}
                                className='text-xs text-emerald-400 hover:text-emerald-300 hover:underline'
                              >
                                {log.user.email}
                              </a>
                              {log.user.blocked && (
                                <div className='text-xs text-red-400 mt-1'>
                                  🚫 Заблокирован
                                </div>
                              )}
                            </div>
                          </td>
                          <td className='p-3'>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium text-white ${getActionBadge(
                                log.action
                              )}`}
                            >
                              {getActionLabel(log.action)}
                            </span>
                          </td>
                          <td className='p-3 text-sm text-gray-300 font-mono'>
                            {log.ipAddress || '—'}
                          </td>
                          <td className='p-3 text-xs text-gray-400'>
                            {log.metadata && (
                              <pre className='whitespace-pre-wrap'>
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            )}
                          </td>
                          <td className='p-3'>
                            <div className='flex items-center gap-2'>
                              <a
                                href={`/admin/users/${log.user.id}`}
                                className='px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1'
                                title='Открыть профиль'
                              >
                                👁 Профиль
                              </a>
                              {!log.user.blocked && (
                                <button
                                  onClick={async () => {
                                    await confirm({
                                      title: 'Блокировка пользователя',
                                      message: `Вы уверены, что хотите заблокировать пользователя ${log.user.email}?`,
                                      type: 'warning',
                                      confirmText: 'Заблокировать',
                                      cancelText: 'Отмена',
                                      onConfirm: () => {
                                        window.location.href = `/admin/users/${log.user.id}`
                                      },
                                    })
                                  }}
                                  className='px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1'
                                  title='Заблокировать'
                                >
                                  🔒 Заблокировать
                                </button>
                              )}
                              {log.user.blocked && (
                                <span className='px-3 py-1.5 bg-gray-700 text-red-400 text-xs rounded-lg'>
                                  🚫 Заблокирован
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className='p-6 text-center text-gray-400'
                          >
                            Логи не найдены
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Круговые сделки */}
          {activeTab === 'circular' && (
            <div>
              <div className='mb-4 p-4 bg-gray-800 rounded-lg'>
                <h2 className='text-lg font-semibold text-white mb-2'>
                  Статистика
                </h2>
                <div className='text-sm text-gray-300'>
                  Найдено подозрительных пар: <span className='text-red-400 font-bold'>{suspiciousPairs.length}</span>
                </div>
              </div>

              {suspiciousPairs.length > 0 ? (
                <div className='space-y-4'>
                  {suspiciousPairs.map((pair, index) => (
                    <div
                      key={index}
                      className='bg-gray-800 rounded-lg p-4 border-l-4 border-red-500'
                    >
                      <div className='flex items-center justify-between mb-3'>
                        <h3 className='text-lg font-semibold text-white'>
                          🔄 Взаимных задач: {pair.mutualTasksCount}
                        </h3>
                        <span className='text-xs text-red-400 font-bold'>
                          ПОДОЗРИТЕЛЬНО
                        </span>
                      </div>

                      <div className='grid grid-cols-2 gap-4 mb-4'>
                        <div className='bg-gray-900 p-3 rounded'>
                          <div className='text-sm text-gray-400 mb-1'>
                            Пользователь A
                          </div>
                          <div className='text-white font-medium'>
                            {pair.userA.fullName || pair.userA.email}
                          </div>
                          <div className='text-xs text-gray-500'>
                            {pair.userA.email}
                          </div>
                          <a
                            href={`/admin/users/${pair.userA.id}`}
                            className='text-xs text-emerald-400 hover:underline mt-1 inline-block'
                          >
                            Открыть профиль →
                          </a>
                        </div>

                        <div className='bg-gray-900 p-3 rounded'>
                          <div className='text-sm text-gray-400 mb-1'>
                            Пользователь B
                          </div>
                          <div className='text-white font-medium'>
                            {pair.userB.fullName || pair.userB.email}
                          </div>
                          <div className='text-xs text-gray-500'>
                            {pair.userB.email}
                          </div>
                          <a
                            href={`/admin/users/${pair.userB.id}`}
                            className='text-xs text-emerald-400 hover:underline mt-1 inline-block'
                          >
                            Открыть профиль →
                          </a>
                        </div>
                      </div>

                      <details className='mt-3'>
                        <summary className='cursor-pointer text-sm text-emerald-400 hover:text-emerald-300'>
                          Показать задачи ({pair.tasks.length})
                        </summary>
                        <div className='mt-3 space-y-2'>
                          {pair.tasks.map((task) => (
                            <div
                              key={task.id}
                              className='bg-gray-900 p-2 rounded text-xs'
                            >
                              <div className='text-white'>{task.title}</div>
                              <div className='text-gray-400'>
                                Сумма: {task.price}₽ • {new Date(task.completedAt).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-12 text-gray-400'>
                  <div className='text-4xl mb-4'>✅</div>
                  <p>Подозрительных круговых сделок не обнаружено</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {Dialog}
    </div>
  )
}

