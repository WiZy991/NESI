'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Lock, Save, Bell, Eye, EyeOff, BookOpen, Download, FileText, MessageSquare, Star, Building2, User, Briefcase, Building, CheckCircle, XCircle, Mail, Shield } from 'lucide-react'
import { ResetOnboardingButton } from '@/components/ResetOnboardingButton'
import { AnimatedCheckbox } from '@/components/AnimatedCheckbox'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  notifyOnMessages: true,
  notifyOnTasks: true,
  notifyOnReviews: true,
  notifyOnWarnings: true,
  notifySound: true,
  notifyDesktop: true,
}

// Типы аккаунтов и их конфигурация
type AccountType = 'INDIVIDUAL' | 'SELF_EMPLOYED' | 'SOLE_PROPRIETOR' | 'COMPANY'

const ACCOUNT_TYPES: Record<AccountType, {
  label: string
  icon: React.ReactNode
  description: string
  color: string
  upgrades: AccountType[]
}> = {
  INDIVIDUAL: {
    label: 'Физическое лицо',
    icon: <User className="w-5 h-5" />,
    description: 'Обычный пользователь без статуса самозанятого или ИП',
    color: 'text-gray-400',
    upgrades: ['SELF_EMPLOYED', 'SOLE_PROPRIETOR', 'COMPANY'],
  },
  SELF_EMPLOYED: {
    label: 'Самозанятый',
    icon: <Briefcase className="w-5 h-5" />,
    description: 'Плательщик налога на профессиональный доход (НПД)',
    color: 'text-blue-400',
    upgrades: ['SOLE_PROPRIETOR', 'COMPANY'],
  },
  SOLE_PROPRIETOR: {
    label: 'ИП',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Индивидуальный предприниматель',
    color: 'text-amber-400',
    upgrades: ['COMPANY'],
  },
  COMPANY: {
    label: 'ООО / Юр. лицо',
    icon: <Building className="w-5 h-5" />,
    description: 'Общество с ограниченной ответственностью или другое юр. лицо',
    color: 'text-emerald-400',
    upgrades: [],
  },
}

export default function SettingsPage() {
  const { user, token, refreshUser } = useUser()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  const [passwords, setPasswords] = useState({ old: '', new: '' })
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
  })
  const [status, setStatus] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  
  // Тип аккаунта
  const [accountType, setAccountType] = useState<AccountType>('INDIVIDUAL')
  const [changingAccountType, setChangingAccountType] = useState(false)
  const [showAccountTypeModal, setShowAccountTypeModal] = useState(false)
  const [selectedNewType, setSelectedNewType] = useState<AccountType | null>(null)
  
  // Подтверждение компании
  const [companyVerification, setCompanyVerification] = useState<{
    innVerified: boolean
    emailVerified: boolean
    canUseGroupFeatures: boolean
  } | null>(null)
  const [verifyingInn, setVerifyingInn] = useState(false)
  const [verifyingEmail, setVerifyingEmail] = useState(false)
  const [corporateEmail, setCorporateEmail] = useState('')

  // === загрузка настроек ===
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/settings', {
          cache: 'no-store',
          credentials: 'include',
        })
        const data = await res.json()
        if (res.ok) {
          setSettings({
            emailNotifications: data.emailNotifications ?? true,
            notifyOnMessages: data.notifyOnMessages ?? true,
            notifyOnTasks: data.notifyOnTasks ?? true,
            notifyOnReviews: data.notifyOnReviews ?? true,
            notifyOnWarnings: data.notifyOnWarnings ?? true,
            notifySound: data.notifySound ?? true,
            notifyDesktop: data.notifyDesktop ?? true,
          })
        } else {
          setStatus(`⚠️ ${data.error || 'Ошибка загрузки настроек'}`)
        }
      } catch {
        setStatus('⚠️ Ошибка соединения с сервером')
      }
    })()
  }, [])

  // === загрузка типа аккаунта ===
  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok && data.accountType) {
          setAccountType(data.accountType as AccountType)
        }
      } catch {
        // Игнорируем ошибки
      }
    })()
  }, [token])

  // === обработка URL параметров и загрузка статуса подтверждения компании ===
  useEffect(() => {
    if (!token || !user) return
    
    // Загружаем только для исполнителей с ИП/ООО
    if (user.role !== 'executor' || (user.accountType !== 'SOLE_PROPRIETOR' && user.accountType !== 'COMPANY')) {
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/company/verification-status', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setCompanyVerification(data)
        }
      } catch {
        // Игнорируем ошибки
      }
    })()
  }, [token, user])

  // Компонент для обработки URL параметров (обернут в Suspense)
  function SearchParamsHandler() {
    const searchParams = useSearchParams()
    
    useEffect(() => {
      if (!token || !user) return
      
      // Проверяем URL параметры для обновления после подтверждения
      const success = searchParams?.get('success')
      if (success === 'company_verified') {
        toast.success('Компания успешно подтверждена!')
        // Обновляем данные пользователя
        await refreshUser()
        // Дополнительно обновляем статус подтверждения
        if (token) {
          const statusRes = await fetch('/api/company/verification-status', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            setCompanyVerification(statusData)
          }
        }
      }
    }, [token, user, searchParams, refreshUser])
    
    return null
  }

  // === смена типа аккаунта ===
  const handleChangeAccountType = async (newType: AccountType) => {
    if (!token) {
      toast.error('Войдите для изменения типа аккаунта')
      return
    }

    setChangingAccountType(true)
    try {
      const res = await fetch('/api/settings/account-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accountType: newType }),
      })

      const data = await res.json()
      if (res.ok) {
        setAccountType(newType)
        setShowAccountTypeModal(false)
        setSelectedNewType(null)
        toast.success(`Тип аккаунта изменён на "${ACCOUNT_TYPES[newType].label}"`, {
          description: 'Заполните данные в профиле',
          action: {
            label: 'Открыть профиль',
            onClick: () => window.location.href = '/profile',
          },
        })
      } else {
        toast.error(data.error || 'Ошибка при смене типа аккаунта')
      }
    } catch {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setChangingAccountType(false)
    }
  }

  // === подтверждение ИНН ===
  const handleVerifyInn = async () => {
    if (!token || !user) return
    
    setVerifyingInn(true)
    try {
      const res = await fetch('/api/company/verify-inn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inn: user.inn }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Существование компании подтверждено')
        setCompanyVerification(prev => prev ? { ...prev, innVerified: true } : { innVerified: true, emailVerified: false, canUseGroupFeatures: false })
        // Перезагружаем статус
        const statusRes = await fetch('/api/company/verification-status', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setCompanyVerification(statusData)
        }
        // Обновляем данные пользователя в контексте
        await refreshUser()
      } else {
        toast.error(data.error || 'Ошибка при подтверждении ИНН')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setVerifyingInn(false)
    }
  }

  // === подтверждение корпоративной почты ===
  const handleVerifyEmail = async () => {
    if (!token || !corporateEmail.trim()) {
      toast.error('Введите корпоративную почту')
      return
    }

    setVerifyingEmail(true)
    try {
      const res = await fetch('/api/company/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ corporateEmail: corporateEmail.trim() }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Письмо с подтверждением отправлено на указанную почту')
        setCorporateEmail('')
      } else {
        toast.error(data.error || 'Ошибка при отправке письма')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setVerifyingEmail(false)
    }
  }

  // === смена пароля ===
  const handleChangePassword = async () => {
    if (!passwords.old || !passwords.new) {
      setStatus('⚠️ Укажите старый и новый пароль')
      return
    }

    try {
      const res = await fetch('/api/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          oldPassword: passwords.old,
          newPassword: passwords.new,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setStatus('✅ Пароль успешно изменён')
        setPasswords({ old: '', new: '' })
      } else {
        setStatus(`❌ ${data.error || 'Ошибка при смене пароля'}`)
      }
    } catch {
      setStatus('⚠️ Ошибка соединения с сервером')
    }
  }

  // === сохранение настроек ===
  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('✅ Настройки сохранены')
      } else {
        setStatus(`❌ ${data.error || 'Ошибка при сохранении настроек'}`)
      }
    } catch {
      setStatus('⚠️ Нет соединения с сервером')
    }
  }

  // === экспорт данных ===
  const handleExport = async (type: 'tasks' | 'messages' | 'reviews', format: 'csv' | 'json') => {
    if (!token) {
      toast.error('Войдите для экспорта данных')
      return
    }

    setExporting(`${type}-${format}`)
    try {
      const res = await fetch(`/api/export?type=${type}&format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Ошибка экспорта')
      }

      if (format === 'csv') {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('Данные экспортированы в CSV')
      } else {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('Данные экспортированы в JSON')
      }
    } catch (error: any) {
      console.error('Ошибка экспорта:', error)
      toast.error(error.message || 'Ошибка при экспорте данных')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-16 p-6 text-white">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-bold text-emerald-400 mb-10 text-center"
      >
        ⚙️ Настройки
      </motion.h1>

      {/* 🔔 Уведомления */}
      <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm mb-8">
        <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" /> Уведомления
        </h2>

        <div className="flex flex-col gap-4 text-sm">
          <label className="flex justify-between items-center">
            <span>Email-уведомления</span>
            <AnimatedCheckbox
              checked={settings.emailNotifications}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  emailNotifications: checked,
                })
              }
            />
          </label>

          <div className="pt-4 border-t border-gray-700/50 mt-2">
            <p className="text-emerald-400 font-semibold mb-3">Типы уведомлений</p>
            
            <label className="flex justify-between items-center mb-3">
              <span>Уведомления о сообщениях</span>
              <AnimatedCheckbox
                checked={settings.notifyOnMessages}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifyOnMessages: checked,
                  })
                }
              />
            </label>

            <label className="flex justify-between items-center mb-3">
              <span>Уведомления о задачах</span>
              <AnimatedCheckbox
                checked={settings.notifyOnTasks}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifyOnTasks: checked,
                  })
                }
              />
            </label>

            <label className="flex justify-between items-center mb-3">
              <span>Уведомления об отзывах</span>
              <AnimatedCheckbox
                checked={settings.notifyOnReviews}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifyOnReviews: checked,
                  })
                }
              />
            </label>

            <label className="flex justify-between items-center mb-3">
              <span>Уведомления-предупреждения</span>
              <AnimatedCheckbox
                checked={settings.notifyOnWarnings}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifyOnWarnings: checked,
                  })
                }
              />
            </label>
          </div>

          <div className="pt-4 border-t border-gray-700/50 mt-2">
            <p className="text-emerald-400 font-semibold mb-3">Дополнительно</p>
            
            <label className="flex justify-between items-center mb-3">
              <span>Звук уведомлений</span>
              <AnimatedCheckbox
                checked={settings.notifySound}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifySound: checked,
                  })
                }
              />
            </label>

            <label className="flex justify-between items-center">
              <span>Desktop-уведомления</span>
              <AnimatedCheckbox
                checked={settings.notifyDesktop}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifyDesktop: checked,
                  })
                }
              />
            </label>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-5 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-sm flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Сохранить настройки
        </button>
      </section>

      {/* 🏢 Тип аккаунта */}
      <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm mb-8">
        <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Тип аккаунта
        </h2>

        {/* Текущий тип */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gray-800/50 ${ACCOUNT_TYPES[accountType].color}`}>
              {ACCOUNT_TYPES[accountType].icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${ACCOUNT_TYPES[accountType].color}`}>
                  {ACCOUNT_TYPES[accountType].label}
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                  Текущий
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {ACCOUNT_TYPES[accountType].description}
              </p>
            </div>
          </div>
        </div>

        {/* Доступные варианты для смены */}
        {(() => {
          // Получаем все типы аккаунтов, кроме текущего
          const availableTypes = (Object.keys(ACCOUNT_TYPES) as AccountType[]).filter(
            type => type !== accountType
          )
          
          return availableTypes.length > 0 ? (
            <>
              <p className="text-sm text-gray-400 mb-3">
                Вы можете сменить тип аккаунта на:
              </p>
              <div className="space-y-2">
                {availableTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedNewType(type)
                      setShowAccountTypeModal(true)
                    }}
                    className="w-full bg-gray-900/50 hover:bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-emerald-500/30 transition-all flex items-center gap-3 text-left"
                  >
                    <div className={`p-2 rounded-lg bg-gray-800/50 ${ACCOUNT_TYPES[type].color}`}>
                      {ACCOUNT_TYPES[type].icon}
                    </div>
                    <div className="flex-1">
                      <span className={`font-semibold ${ACCOUNT_TYPES[type].color}`}>
                        {ACCOUNT_TYPES[type].label}
                      </span>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {ACCOUNT_TYPES[type].description}
                      </p>
                    </div>
                    <span className="text-emerald-400 text-sm">
                      Выбрать →
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null
        })()}
      </section>

      {/* Модальное окно подтверждения смены типа */}
      {showAccountTypeModal && selectedNewType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              Подтвердите смену типа аккаунта
            </h3>
            
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <span>Текущий:</span>
                <span className={ACCOUNT_TYPES[accountType].color}>
                  {ACCOUNT_TYPES[accountType].label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Новый:</span>
                <span className={`font-semibold ${ACCOUNT_TYPES[selectedNewType].color}`}>
                  {ACCOUNT_TYPES[selectedNewType].label}
                </span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-300">
                ⚠️ После смены типа аккаунта вам нужно будет заполнить дополнительную информацию в профиле (ИНН, реквизиты и др.)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAccountTypeModal(false)
                  setSelectedNewType(null)
                }}
                disabled={changingAccountType}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={() => handleChangeAccountType(selectedNewType)}
                disabled={changingAccountType}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changingAccountType ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Подтвердить'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Подтверждение компании (только для исполнителей ИП/ООО) */}
      {user?.role === 'executor' && (accountType === 'SOLE_PROPRIETOR' || accountType === 'COMPANY') && (
        <section className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Подтверждение компании</h2>
          </div>

          <p className="text-sm text-gray-400 mb-6">
            Для доступа к групповым функциям (команды) необходимо подтвердить компанию в два этапа:
          </p>

          {/* Этап 1: Подтверждение ИНН */}
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700/50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Этап 1: Подтверждение существования компании
                </h3>
                <p className="text-sm text-gray-400">
                  Проверка ИНН через ФНС. Подтверждает, что компания существует и имеет действующий статус.
                </p>
              </div>
              {companyVerification?.innVerified ? (
                <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 ml-3" />
              ) : (
                <XCircle className="w-6 h-6 text-gray-500 flex-shrink-0 ml-3" />
              )}
            </div>

            {companyVerification?.innVerified ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <p className="text-sm text-emerald-300">
                  ✅ Существование компании подтверждено
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {!user.inn ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-sm text-amber-300">
                      ⚠️ Сначала заполните ИНН в профиле
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <p className="text-sm text-gray-300">
                        ИНН: <span className="font-mono">{user.inn}</span>
                      </p>
                    </div>
                    <button
                      onClick={handleVerifyInn}
                      disabled={verifyingInn}
                      className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {verifyingInn ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Проверка...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          Подтвердить ИНН
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Этап 2: Подтверждение корпоративной почты */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Этап 2: Подтверждение связи с компанией
                </h3>
                <p className="text-sm text-gray-400">
                  Подтверждение корпоративной почты, связанной с доменом компании. Требуется для доступа к групповым функциям.
                </p>
              </div>
              {companyVerification?.emailVerified ? (
                <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 ml-3" />
              ) : (
                <XCircle className="w-6 h-6 text-gray-500 flex-shrink-0 ml-3" />
              )}
            </div>

            {companyVerification?.emailVerified ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <p className="text-sm text-emerald-300">
                  ✅ Корпоративная почта подтверждена
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {!companyVerification?.innVerified ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-sm text-amber-300">
                      ⚠️ Сначала подтвердите существование компании (Этап 1)
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm text-gray-300">
                        Корпоративная почта
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={corporateEmail}
                          onChange={(e) => setCorporateEmail(e.target.value)}
                          placeholder="email@company-domain.ru"
                          className="flex-1 bg-black/60 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                        />
                        <button
                          onClick={handleVerifyEmail}
                          disabled={verifyingEmail || !corporateEmail.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {verifyingEmail ? (
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
                      <p className="text-xs text-gray-500">
                        На указанную почту будет отправлено письмо с подтверждением
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Статус доступа к групповым функциям */}
          {companyVerification && (
            <div className={`mt-4 rounded-lg p-4 border ${
              companyVerification.canUseGroupFeatures
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-gray-800/50 border-gray-700/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {companyVerification.canUseGroupFeatures ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <p className="text-sm text-emerald-300 font-semibold">
                        Групповые функции доступны
                      </p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-gray-500" />
                      <p className="text-sm text-gray-400">
                        Групповые функции недоступны. Завершите оба этапа подтверждения.
                      </p>
                    </>
                  )}
                </div>
                {companyVerification.canUseGroupFeatures && (
                  <Link
                    href="/teams"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors text-sm font-medium"
                  >
                    Управление командами →
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 🔐 Смена пароля */}
      <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" /> Смена пароля
        </h2>

        <div className="grid md:grid-cols-2 gap-3">
          {/* Старый пароль */}
          <div className="relative">
            <input
              type={showPassword.old ? 'text' : 'password'}
              placeholder="Старый пароль"
              value={passwords.old}
              onChange={(e) =>
                setPasswords({ ...passwords, old: e.target.value })
              }
              className="p-2 pr-10 w-full bg-black/40 border border-gray-700 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() =>
                setShowPassword({ ...showPassword, old: !showPassword.old })
              }
              className="absolute right-3 top-2.5 text-gray-400 hover:text-emerald-400 transition"
            >
              {showPassword.old ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Новый пароль */}
          <div className="relative">
            <input
              type={showPassword.new ? 'text' : 'password'}
              placeholder="Новый пароль"
              value={passwords.new}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
              className="p-2 pr-10 w-full bg-black/40 border border-gray-700 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() =>
                setShowPassword({ ...showPassword, new: !showPassword.new })
              }
              className="absolute right-3 top-2.5 text-gray-400 hover:text-emerald-400 transition"
            >
              {showPassword.new ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          className="mt-3 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-sm flex items-center gap-2"
        >
          <Lock className="w-4 h-4" /> Изменить пароль
        </button>
      </section>

      {/* 📖 Повторный запуск онбординга */}
      <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm mt-8">
        <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> Онбординг
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Хотите повторить интерактивный тур по платформе? Вы можете запустить его снова в любой момент.
        </p>
        <ResetOnboardingButton />
      </section>

      {/* 📥 Экспорт данных */}
      <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm mt-8">
        <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" /> Экспорт данных
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Экспортируйте свои данные в формате CSV или JSON для резервного копирования или анализа
        </p>

        <div className="space-y-4">
          {/* Экспорт задач */}
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Задачи</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('tasks', 'csv')}
                disabled={!!exporting}
                className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {exporting === 'tasks-csv' ? 'Экспорт...' : 'CSV'}
              </button>
              <button
                onClick={() => handleExport('tasks', 'json')}
                disabled={!!exporting}
                className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {exporting === 'tasks-json' ? 'Экспорт...' : 'JSON'}
              </button>
            </div>
          </div>

          {/* Экспорт сообщений */}
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Сообщения</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('messages', 'csv')}
                disabled={!!exporting}
                className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {exporting === 'messages-csv' ? 'Экспорт...' : 'CSV'}
              </button>
              <button
                onClick={() => handleExport('messages', 'json')}
                disabled={!!exporting}
                className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {exporting === 'messages-json' ? 'Экспорт...' : 'JSON'}
              </button>
            </div>
          </div>

          {/* Экспорт отзывов */}
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Отзывы</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('reviews', 'csv')}
                disabled={!!exporting}
                className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {exporting === 'reviews-csv' ? 'Экспорт...' : 'CSV'}
              </button>
              <button
                onClick={() => handleExport('reviews', 'json')}
                disabled={!!exporting}
                className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {exporting === 'reviews-json' ? 'Экспорт...' : 'JSON'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 💬 статус */}
      {status && (
        <p className="text-sm text-gray-400 mt-6 text-center transition-opacity duration-300">
          {status}
        </p>
      )}
      
      {/* Обработка URL параметров в Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>
    </div>
  )
}
