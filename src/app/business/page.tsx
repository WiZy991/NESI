'use client'

import { useRouter } from 'next/navigation'

export default function BusinessPage() {
  const router = useRouter()

  return (
    <main className="relative overflow-hidden text-white py-20 px-6">
      {/* Фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-emerald-950/20"></div>
      <div className="absolute inset-0 blur-[160px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_70%)]" />

      <section className="relative max-w-5xl mx-auto text-center space-y-6 animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-extrabold text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          Для заказчиков
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          На платформе <b>NESI</b> вы находите надёжных исполнителей, готовых реализовать проекты любого масштаба —
          от небольших задач до крупных IT-разработок. Всё под контролем, безопасно и прозрачно.
        </p>

        <button
          onClick={() => router.push('/create-task')}
          className="px-8 py-3 mt-4 text-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105"
        >
          🚀 Создать задачу
        </button>
      </section>

      <section className="relative max-w-4xl mx-auto mt-16 grid sm:grid-cols-2 gap-8">
        {[
          {
            title: '💡 Прозрачная система',
            text: 'Ставки, предложения и выбор исполнителя — всё открыто и честно. Вы видите рейтинг и отзывы специалистов.',
          },
          {
            title: '🛡️ Гарантия безопасности',
            text: 'Финансы защищены системой NESI SafePay. Деньги переводятся только после успешного выполнения работы.',
          },
          {
            title: '🤝 Работа 24/7',
            text: 'Вы можете сотрудничать с исполнителями в любое время и управлять проектом прямо из личного кабинета.',
          },
          {
            title: '⚙️ Полный цикл поддержки',
            text: 'От идеи до внедрения — наша платформа помогает сопровождать проект на всех этапах.',
          },
          {
            title: '💳 Безопасные платежи',
            text: 'Оплачивайте задачи через встроенную платёжную систему NESI — просто, быстро и без рисков.',
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-6 bg-black/50 border border-emerald-700/40 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300"
          >
            <h3 className="text-xl font-semibold text-emerald-400 mb-2">{item.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="relative text-center mt-20">
        <p className="text-lg text-gray-400 mb-4">
          Начните с малого — опубликуйте первую задачу уже сегодня.
        </p>
        <button
          onClick={() => router.push('/create-task')}
          className="px-10 py-3 text-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105"
        >
          ✏️ Опубликовать задачу
        </button>
      </section>
    </main>
  )
}
