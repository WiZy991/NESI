'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import { Eye, EyeOff, X, Check } from 'lucide-react'
import dynamic from 'next/dynamic'

const EmailLink = dynamic(() => import('@/components/EmailLink'), {
  ssr: false,
})

export default function RegisterContent() {
  const router = useRouter()
  const { login } = useUser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'customer' | 'executor'>('customer')
  const [accountType, setAccountType] = useState<'INDIVIDUAL' | 'SELF_EMPLOYED' | 'SOLE_PROPRIETOR' | 'COMPANY'>('INDIVIDUAL')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) {
      setEmailError('Email обязателен')
      return false
    }
    if (!emailRegex.test(value)) {
      setEmailError('Некорректный email')
      return false
    }
    setEmailError('')
    return true
  }

  const checkPasswordStrength = (value: string) => {
    const errors: string[] = []
    let strength = 0

    if (value.length >= 8) strength++
    else errors.push('Минимум 8 символов')

    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength++
    else errors.push('Заглавные и строчные буквы')

    if (/\d/.test(value)) strength++
    else errors.push('Хотя бы одна цифра')

    if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) strength++
    else errors.push('Специальный символ')

    setPasswordStrength(strength)
    setPasswordErrors(errors)
    return strength >= 3
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    if (value && emailError) {
      validateEmail(value)
    }
  }

  const handleEmailBlur = () => {
    validateEmail(email)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    if (value) {
      checkPasswordStrength(value)
    } else {
      setPasswordStrength(0)
      setPasswordErrors([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agreedToTerms) {
      toast.error('Необходимо принять пользовательское соглашение')
      return
    }
    
    if (!validateEmail(email)) {
      toast.error('Проверьте email')
      return
    }
    
    if (!checkPasswordStrength(password)) {
      toast.error('Пароль слишком слабый. Следуйте требованиям ниже')
      return
    }
    
    setLoading(true)
    const toastId = toast.loading('Регистрируем...')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          fullName, 
          role,
          accountType
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(data?.error || 'Ошибка регистрации', { id: toastId })
        setLoading(false)
        return
      }

      toast.success(
        data?.message ||
          'Регистрация прошла успешно! Проверьте почту и подтвердите адрес.',
        { id: toastId }
      )

      setTimeout(() => {
        router.push('/check-email')
      }, 800)
    } catch (err: any) {
      console.error('Ошибка регистрации:', err)
      toast.error('Ошибка сервера. Попробуйте позже.', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-white">
      <div className="w-full max-w-md p-8 border border-emerald-500/40 rounded-2xl backdrop-blur-md bg-black/10 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
        <h1 className="text-4xl font-bold text-emerald-400 text-center mb-8 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          Регистрация
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Имя */}
          <input
            type="text"
            placeholder="Имя"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-3 bg-transparent border border-emerald-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />

          {/* Email с валидацией */}
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              className={`w-full p-3 bg-transparent border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                emailError
                  ? 'border-red-500 focus:ring-red-500'
                  : email && !emailError
                  ? 'border-emerald-500 focus:ring-emerald-400'
                  : 'border-emerald-400/50 focus:ring-emerald-400'
              }`}
            />
            
            {/* Индикатор валидации email */}
            {email && (
              <div className="flex items-center gap-2 text-xs">
                {emailError ? (
                  <>
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-red-400">{emailError}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-400">Email корректен</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Пароль с глазком и индикатором силы */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль"
                value={password}
                onChange={handlePasswordChange}
                className={`w-full p-3 pr-10 bg-transparent border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                  password && passwordStrength >= 3
                    ? 'border-emerald-500 focus:ring-emerald-400'
                    : password && passwordStrength > 0
                    ? 'border-yellow-500 focus:ring-yellow-400'
                    : 'border-emerald-400/50 focus:ring-emerald-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-emerald-400 transition"
                aria-label="Показать пароль"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Индикатор силы пароля */}
            {password && (
              <div className="space-y-2">
                {/* Прогресс-бар */}
                <div className="flex gap-1 h-1.5">
                  {[0, 1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full transition-all ${
                        level < passwordStrength
                          ? passwordStrength >= 3
                            ? 'bg-emerald-500'
                            : passwordStrength === 2
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                          : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                
                {/* Текст силы пароля */}
                <div className="text-xs">
                  {passwordStrength === 0 && (
                    <span className="text-gray-400">Начните вводить пароль</span>
                  )}
                  {passwordStrength === 1 && (
                    <span className="text-red-400">Слабый пароль</span>
                  )}
                  {passwordStrength === 2 && (
                    <span className="text-yellow-400">Средний пароль</span>
                  )}
                  {passwordStrength >= 3 && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Надёжный пароль
                    </span>
                  )}
                </div>
                
                {/* Требования к паролю */}
                {passwordErrors.length > 0 && (
                  <div className="text-xs space-y-1 mt-1">
                    {passwordErrors.map((error, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-gray-400">
                        <X className="w-3 h-3 text-red-500" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Роль */}
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'customer' | 'executor')}
              className="w-full p-3 bg-black/30 border border-emerald-400/50 rounded-lg text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition appearance-none cursor-pointer pr-10"
            >
              <option
                value="customer"
                className="bg-[#00140D] text-emerald-200 hover:bg-emerald-500/20"
              >
                Заказчик
              </option>
              <option
                value="executor"
                className="bg-[#00140D] text-emerald-200 hover:bg-emerald-500/20"
              >
                Исполнитель
              </option>
            </select>

            {/* SVG стрелочка */}
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="#10b981"
                className="w-5 h-5 opacity-80 group-hover:opacity-100 transition"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Тип аккаунта (B2B/B2C) */}
          <div className="space-y-3">
            <label className="text-sm text-gray-300 font-medium">
              Вы регистрируетесь как:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'INDIVIDUAL', label: 'Физ. лицо', icon: '👤', desc: 'Частное лицо' },
                { value: 'SELF_EMPLOYED', label: 'Самозанятый', icon: '📱', desc: 'Плательщик НПД' },
                { value: 'SOLE_PROPRIETOR', label: 'ИП', icon: '🏪', desc: 'Индивидуальный предприниматель' },
                { value: 'COMPANY', label: 'ООО / Компания', icon: '🏢', desc: 'Юридическое лицо' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAccountType(type.value as typeof accountType)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    accountType === type.value
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'border-emerald-400/30 bg-black/20 hover:border-emerald-400/60 hover:bg-emerald-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{type.icon}</span>
                    <span className={`font-medium ${accountType === type.value ? 'text-emerald-300' : 'text-gray-300'}`}>
                      {type.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-7">{type.desc}</p>
                </button>
              ))}
            </div>
            {accountType !== 'INDIVIDUAL' && (
              <p className="text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                💡 Данные {accountType === 'SELF_EMPLOYED' ? 'самозанятого' : accountType === 'SOLE_PROPRIETOR' ? 'ИП' : 'компании'} можно будет заполнить в профиле после регистрации
              </p>
            )}
          </div>

          {/* Плашка согласия с пользовательским соглашением */}
          <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-1 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    e.stopPropagation()
                    setAgreedToTerms(e.target.checked)
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  className={`w-5 h-5 rounded border-2 text-emerald-500 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-transparent cursor-pointer appearance-none transition-all duration-200 ${
                    agreedToTerms
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-black/60 border-emerald-400 hover:border-emerald-300'
                  }`}
                  style={{
                    backgroundImage: agreedToTerms 
                      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6L9 17l-5-5'/%3E%3C/svg%3E")`
                      : 'none',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              </div>
              <span className="text-sm text-gray-300 leading-relaxed flex-1">
                Я принимаю{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setShowTermsModal(true)
                  }}
                  className="text-emerald-400 hover:text-emerald-300 underline font-medium"
                >
                  пользовательское соглашение
                </button>
                {' '}и подтверждаю, что мне исполнилось 18 лет
              </span>
            </label>
            
            {/* Краткое описание */}
            <div className="mt-3 pl-8 text-xs text-gray-400 space-y-1">
              <p>• Комиссия платформы: от 0% до 10% (первые 3 задачи бесплатно!)</p>
              <p>• Средства защищены системой эскроу</p>
              <p>• Вы несёте ответственность за свои действия</p>
            </div>
          </div>

          {/* Кнопка регистрации */}
          <button
            type="submit"
            disabled={loading || !agreedToTerms}
            className="w-full py-3 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="text-center mt-8">
          <Link href="/" className="text-emerald-400 hover:underline">
            ← Назад
          </Link>
        </div>
      </div>

      {/* Модальное окно с пользовательским соглашением - сокращенная версия */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#001410] border border-emerald-500/40 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden">
            {/* Заголовок */}
            <div className="sticky top-0 bg-[#001410] border-b border-emerald-500/30 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-emerald-400">
                Пользовательское соглашение
              </h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-2 rounded-lg hover:bg-emerald-500/10 transition text-emerald-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Контент с прокруткой */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
              {/* Термины */}
              <div>
                <h3 className="text-xl font-bold text-emerald-300 mb-3">
                  1. Термины и определения
                </h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <p><strong className="text-emerald-400">Администрация</strong> — ООО «НЭСИ» (ИНН: 2205021414), предоставляющее Платформу.</p>
                  <p><strong className="text-emerald-400">Пользователь</strong> — физическое или юридическое лицо, использующее Платформу.</p>
                  <p><strong className="text-emerald-400">Заказчик</strong> — Пользователь, размещающий задачи на Платформе.</p>
                  <p><strong className="text-emerald-400">Исполнитель</strong> — Пользователь, выполняющий задачи на Платформе.</p>
                  <p><strong className="text-emerald-400">Платформа</strong> — веб-сайт NESI.</p>
                </div>
              </div>

              {/* Принятие условий */}
              <div>
                <h3 className="text-xl font-bold text-emerald-300 mb-3">
                  2. Принятие условий
                </h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <p>Регистрируясь на Платформе, вы подтверждаете, что:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Вам исполнилось 18 лет, либо вы получили согласие законных представителей</li>
                    <li>Вы ознакомились с настоящим Соглашением и принимаете все его условия</li>
                    <li>Предоставленная вами информация является достоверной</li>
                    <li>Вы несёте полную ответственность за действия, совершённые под вашим аккаунтом</li>
                  </ul>
                </div>
              </div>

              {/* Оплата и комиссия */}
              <div>
                <h3 className="text-xl font-bold text-emerald-300 mb-3">
                  3. Оплата и комиссия
                </h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <p><strong className="text-emerald-400">Порядок оплаты:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Пополнение баланса осуществляется через платёжные системы, поддерживаемые платформой</li>
                    <li>При создании задачи средства резервируются на балансе Заказчика</li>
                    <li>После выполнения задачи средства переводятся Исполнителю</li>
                  </ul>
                  <p className="mt-3"><strong className="text-emerald-400">Комиссия:</strong></p>
                  <p>Первые <strong>3 задачи</strong> выполняются <strong className="text-yellow-400">без комиссии (0%)</strong>! После — от <strong>6% до 10%</strong> в зависимости от вашего уровня. Комиссия удерживается автоматически при переводе средств Исполнителю.</p>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mt-2">
                    <p className="text-emerald-300 font-semibold">Пример (уровень 1-2, после бесплатных задач):</p>
                    <p>Стоимость задачи: 10 000 ₽</p>
                    <p>Исполнитель получит: 9 000 ₽</p>
                    <p>Комиссия платформы: 1 000 ₽ (10%)</p>
                  </div>
                </div>
              </div>

              {/* Обязанности */}
              <div>
                <h3 className="text-xl font-bold text-emerald-300 mb-3">
                  4. Обязанности пользователей
                </h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <p><strong className="text-emerald-400">Заказчик обязан:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Чётко формулировать требования к задаче</li>
                    <li>Обеспечить достаточное количество средств на балансе</li>
                    <li>Своевременно проверять результаты выполненной работы</li>
                    <li>Предоставлять объективную обратную связь</li>
                  </ul>
                  <p className="mt-3"><strong className="text-emerald-400">Исполнитель обязан:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Выполнять задачи в срок и в соответствии с требованиями</li>
                    <li>Поддерживать связь с Заказчиком</li>
                    <li>Предоставлять качественный результат</li>
                    <li>Соблюдать конфиденциальность информации</li>
                  </ul>
                </div>
              </div>

              {/* Запрещённые действия */}
              <div>
                <h3 className="text-xl font-bold text-emerald-300 mb-3">
                  5. Запрещённые действия
                </h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Размещать задачи, нарушающие законодательство РФ</li>
                    <li>Использовать Платформу для мошенничества или обмана</li>
                    <li>Передавать доступ к своему аккаунту третьим лицам</li>
                    <li>Обходить систему комиссий Платформы</li>
                    <li>Размещать оскорбительный или неприемлемый контент</li>
                  </ul>
                </div>
              </div>

              {/* Ответственность */}
              <div>
                <h3 className="text-xl font-bold text-emerald-300 mb-3">
                  6. Ответственность и споры
                </h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <p>Администрация не несёт ответственности за:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Качество выполнения задач Исполнителями</li>
                    <li>Действия Пользователей на Платформе</li>
                    <li>Убытки, возникшие в результате технических сбоев</li>
                  </ul>
                  <p className="mt-2">В случае споров между Пользователями рекомендуется обратиться в службу поддержки: <EmailLink email="info.nesi@bk.ru" className="text-emerald-400 hover:underline" /></p>
                </div>
              </div>

              {/* Контакты */}
              <div className="bg-black/40 border border-emerald-500/20 rounded-lg p-4">
                <h3 className="text-lg font-bold text-emerald-300 mb-2">
                  Контактная информация
                </h3>
                <div className="space-y-1 text-gray-300 text-sm">
                  <p><strong>ООО «НЭСИ»</strong></p>
                  <p>ИНН: 2205021414</p>
                  <p>Email: <EmailLink email="info.nesi@bk.ru" className="text-emerald-400 hover:underline" /></p>
                  <p>Сайт: <a href="https://nesi.ru" className="text-emerald-400 hover:underline">nesi.ru</a></p>
                </div>
              </div>
            </div>

            {/* Футер с кнопками */}
            <div className="sticky bottom-0 bg-[#001410] border-t border-emerald-500/30 p-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setAgreedToTerms(true)
                  setShowTermsModal(false)
                }}
                className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                ✓ Принять и закрыть
              </button>
              <Link
                href="/terms"
                target="_blank"
                className="flex-1 py-3 px-6 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 rounded-lg font-semibold transition text-center"
              >
                Открыть полную версию
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

