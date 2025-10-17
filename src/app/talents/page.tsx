'use client'

import { useRouter } from 'next/navigation'

export default function TalentsPage() {
  const router = useRouter()

  return (
    <main className="relative overflow-hidden text-white py-20 px-6">
      {/* Убрали плотный чёрный градиент, оставили лёгкое свечение */}
      <div className="absolute inset-0 blur-[200px] bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.15),transparent_70%)]" />

      <section className="relative max-w-5xl mx-auto text-center space-y-6 animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-extrabold text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          Для исполнителей
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          <b>NESI</b> — это платформа, где ваш труд ценится. Выполняйте реальные задачи клиентов, 
          зарабатывайте и растите как профессионал.
        </p>

        <button
          onClick={() => router.push('/tasks')}
          className="px-8 py-3 mt-4 text-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105"
        >
          🌟 Найти задание
        </button>
      </section>

      {/* Секция преимуществ */}
      <section className="relative max-w-4xl mx-auto mt-16 grid sm:grid-cols-2 gap-8">
        {[
          {
            title: '🎯 Много заказов',
            text: 'Доступ к сотням актуальных задач по различным направлениям: IT, дизайн, контент, маркетинг и другие.',
          },
          {
            title: '⚙️ Гибкость и выбор',
            text: 'Работайте в удобное время, выбирайте задачи по интересу и стоимости. Вы решаете, с кем сотрудничать.',
          },
          {
            title: '🏆 Рост и рейтинг',
            text: 'Формируйте портфолио, получайте отзывы и повышайте рейтинг — это ваш профессиональный капитал.',
          },
          {
            title: '🛡️ Защита исполнителя',
            text: 'Оплата через защищённую систему NESI гарантирует честную работу и выплату за результат.',
          },
          {
            title: '💬 Комьюнити и обучение',
            text: 'Общайтесь с коллегами, развивайтесь и получайте новые знания через базу NESI.',
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-6 border border-emerald-700/40 rounded-2xl bg-transparent backdrop-blur-sm shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all duration-300 hover:scale-[1.02]"
          >
            <h3 className="text-xl font-semibold text-emerald-400 mb-2">{item.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{item.text}</p>
          </div>
        ))}
      </section>

      {/* Финальный блок CTA */}
      <section className="relative text-center mt-20">
        <p className="text-lg text-gray-400 mb-4">
          Зарегистрируйтесь и начните зарабатывать прямо сейчас.
        </p>
        <button
          onClick={() => router.push('/register')}
          className="px-10 py-3 text-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105"
        >
          💼 Присоединиться к NESI
        </button>
      </section>
    </main>
  )
}
