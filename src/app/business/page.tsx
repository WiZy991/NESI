'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function BusinessPage() {
  const router = useRouter()
  const { user } = useUser()

  return (
    <main className="relative overflow-hidden text-white py-20 px-6">
      {/* Фон с неоновыми бликами */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-emerald-950/20"></div>
      <div className="absolute inset-0 blur-[160px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_70%)]" />

      {/* Герой-секция */}
      <section className="relative max-w-5xl mx-auto text-center space-y-6 animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-extrabold text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          Для заказчиков
        </h1>

        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          На платформе <b>NESI</b> вы получаете доступ к проверенным исполнителям,
          готовым реализовать проекты любого масштаба — от простых задач до сложных разработок.
          Всё прозрачно, безопасно и под вашим контролем.
        </p>

        <button
          onClick={() => router.push(user ? '/tasks/new' : '/register')}
          className="px-8 py-3 mt-4 text-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105"
        >
          {user ? '🚀 Создать задачу' : '🔑 Зарегистрироваться, чтобы создать задачу'}
        </button>
      </section>

      {/* Секция преимуществ */}
<section className="relative max-w-4xl mx-auto mt-16 grid sm:grid-cols-2 gap-8">
  {[
    {
      title: '💡 Прозрачная система',
      text: 'Все предложения и ставки открыты. Вы видите рейтинги и отзывы исполнителей, чтобы сделать осознанный выбор.',
    },
    {
      title: '🛡️ Гарантия безопасности',
      text: 'Платежи проходят через систему NESI — деньги переводятся только после выполнения задачи.',
    },
    {
      title: '🤝 Работа 24/7',
      text: 'Сотрудничайте с исполнителями в любое время, управляйте проектами через личный кабинет.',
    },
    {
      title: '⚙️ Полное сопровождение',
      text: 'От идеи до внедрения — NESI помогает на каждом этапе проекта, обеспечивая контроль и прозрачность.',
    },
    {
  title: '📊 Возможность найма сотрудников в штат',
  text: 'Через Подиум исполнителей вы можете находить лучших специалистов и приглашать их на постоянную работу в свою команду.',
  },
  ].map((item, idx) => (
    <div
      key={idx}
        className="p-6 border border-emerald-700/40 rounded-2xl bg-transparent shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-[1.02]"
      >
      <h3 className="text-xl font-semibold text-emerald-400 mb-2">{item.title}</h3>
      <p className="text-gray-300 text-sm leading-relaxed">{item.text}</p>
    </div>
  ))}
</section>

      {/* Финальный CTA-блок */}
      <section className="relative text-center mt-20">
        <p className="text-lg text-gray-400 mb-4">
          Начните с малого — опубликуйте первую задачу уже сегодня.
        </p>
        <button
          onClick={() => router.push(user ? '/tasks/new' : '/register')}
          className="px-10 py-3 text-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105"
        >
          {user ? '✏️ Опубликовать задачу' : '🔐 Зарегистрироваться, чтобы начать'}
        </button>
      </section>
    </main>
  )
}
