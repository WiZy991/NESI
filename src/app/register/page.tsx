'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import { Eye, EyeOff, X } from 'lucide-react'
import EmailLink from '@/components/EmailLink'

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useUser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'customer' | 'executor'>('customer')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agreedToTerms) {
      toast.error('Необходимо принять пользовательское соглашение')
      return
    }
    
    setLoading(true)
    const toastId = toast.loading('Регистрируем...')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role }),
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

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-transparent border border-emerald-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />

          {/* Пароль с глазком */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pr-10 bg-transparent border border-emerald-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
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

          {/* Плашка согласия с пользовательским соглашением */}
          <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-emerald-400/50 bg-transparent text-emerald-500 focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              />
              <span className="text-sm text-gray-300 leading-relaxed">
                Я принимаю{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-emerald-400 hover:text-emerald-300 underline font-medium"
                >
                  пользовательское соглашение
                </button>
                {' '}и подтверждаю, что мне исполнилось 18 лет
              </span>
            </label>
            
            {/* Краткое описание */}
            <div className="mt-3 pl-8 text-xs text-gray-400 space-y-1">
              <p>• Комиссия платформы: 20% с каждой задачи</p>
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

      {/* Модальное окно с пользовательским соглашением */}
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
                  <p>Платформа взимает комиссию в размере <strong>20%</strong> от стоимости каждой завершённой задачи. Комиссия удерживается автоматически при переводе средств Исполнителю.</p>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mt-2">
                    <p className="text-emerald-300 font-semibold">Пример:</p>
                    <p>Стоимость задачи: 10 000 ₽</p>
                    <p>Исполнитель получит: 8 000 ₽</p>
                    <p>Комиссия платформы: 2 000 ₽ (20%)</p>
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
                  <p>Юридический адрес: Алтайский край, г. Заринск, ул. Центральная 22, кв 1</p>
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
