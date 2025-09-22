'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function Hero() {
  const [openModal, setOpenModal] = useState<'features' | 'solutions' | 'support' | null>(null)
  const [supportMessage, setSupportMessage] = useState('')

  const closeModal = () => setOpenModal(null)

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && closeModal()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  const sendSupportMessage = async () => {
    if (!supportMessage.trim()) return
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: supportMessage }),
      })
      if (res.ok) {
        alert('Ваше сообщение отправлено!')
        setSupportMessage('')
        closeModal()
      } else {
        alert('Ошибка при отправке. Попробуйте позже.')
      }
    } catch {
      alert('Ошибка сервера. Попробуйте позже.')
    }
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-black via-[#0a0a0a] to-[#04382A] px-6 md:px-12">
      {/* подсветка */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.25),transparent_70%)]" />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 pt-20 w-full">
        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="flex flex-col items-start justify-start pl-4 md:pl-12">
          <h1 className="text-6xl md:text-7xl font-bold text-emerald-400 tracking-[0.35em] drop-shadow-[0_0_35px_rgba(16,185,129,0.9)]">
            NESI
          </h1>

          <ul className="mt-10 space-y-3 text-gray-100 text-[15px] md:text-[16px] tracking-[0.15em] font-light max-w-[460px]">
            <li className="italic">ТВОЙ ПУТЬ К ЛУЧШЕМУ ИСПОЛНИТЕЛЮ</li>
            <li className="italic">КОМФОРТ И БАЛАНС</li>
            <li className="italic">ПРОЕКТЫ ЛЮБОГО МАСШТАБА</li>
            <li className="italic">ТВОЙ ПУТЬ К ЛУЧШЕМУ ЗАКАЗЧИКУ</li>
            <li className="italic">БАЗА ЗНАНИЙ — ДЛЯ РОСТА НАВЫКОВ</li>
          </ul>

          <div className="mt-10 w-full max-w-[420px] rounded-3xl border border-emerald-400/50 bg-emerald-900/40 px-8 py-6 text-center shadow-[0_0_50px_rgba(16,185,129,0.35)]">
            <p className="text-xs uppercase tracking-widest text-gray-300">ИНФОРМАЦИЯ О НАС</p>
            <p className="mt-2 text-lg font-semibold uppercase tracking-widest text-emerald-400">
              РЕЛИЗ ПРОЕКТА ОЖИДАЕТСЯ В ОКТЯБРЕ
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-6">
            <button
              onClick={() => setOpenModal('features')}
              className="rounded-full border border-emerald-400 px-8 py-2 text-sm tracking-wide text-emerald-400 transition hover:bg-emerald-400 hover:text-black"
            >
              Возможности
            </button>
            <button
              onClick={() => setOpenModal('solutions')}
              className="rounded-full border border-emerald-400 px-8 py-2 text-sm tracking-wide text-emerald-400 transition hover:bg-emerald-400 hover:text-black"
            >
              Решения
            </button>
            <button
              onClick={() => setOpenModal('support')}
              className="rounded-full border border-emerald-400 px-8 py-2 text-sm tracking-wide text-emerald-400 transition hover:bg-emerald-400 hover:text-black"
            >
              Поддержка
            </button>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="relative w-full h-[850px]">
          {/* SVG фон */}
          <div className="pointer-events-none absolute -z-10 right-0 top-1/2 w-[2200px] max-w-none -translate-y-1/3 translate-x-[10%] opacity-25">
             <Image
    		src="/nessi.svg"
    		alt="Nessi"
    		width={2200}
    		height={1600}
    		priority
    		className="opacity-80 brightness-125"
    		style={{
      		filter: `
        		drop-shadow(0 0 20px rgba(16,185,129,0.8))
        		drop-shadow(0 0 50px rgba(16,185,129,0.7))
        		drop-shadow(0 0 100px rgba(16,185,129,0.6))
      		`
    		}}
  	      />
          </div>

          {/* хаотично расположенные картинки */}
          <Image
            src="/photos/photo_2025-09-21_22-55-24.jpg"
            alt="Мониторы"
            width={240}
            height={180}
            className="absolute top-[20px] left-[40px] rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.6)]"
          />
          <Image
            src="/photos/photo_2025-09-21_22-55-13.jpg"
            alt="Офис"
            width={200}
            height={180}
            className="absolute top-[30px] left-[320px] rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.6)]"
          />
          <Image
            src="/photos/photo_2025-09-21_22-55-17.jpg"
            alt="Город"
            width={180}
            height={360}
            className="absolute top-[10px] right-[40px] rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.6)]"
          />
          <Image
            src="/photos/photo_2025-09-21_22-55-10.jpg"
            alt="Разработчик"
            width={220}
            height={240}
            className="absolute top-[240px] left-[100px] rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.6)]"
          />
          <Image
            src="/photos/photo_2025-09-21_22-55-07.jpg"
            alt="Клавиатура"
            width={90}
            height={90}
            className="absolute top-[260px] left-[330px] rotate-12 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)]"
          />
          <Image
            src="/photos/photo_2025-09-21_22-55-22.jpg"
            alt="Портрет"
            width={130}
            height={150}
            className="absolute top-[420px] left-[300px] rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.6)]"
          />
          <Image
            src="/photos/photo_2025-09-21_22-55-15.jpg"
            alt="Ночной кодинг"
            width={300}
            height={200}
            className="absolute bottom-[40px] left-[160px] rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.6)]"
          />

          {/* бейдж ONLINE */}
          <div className="absolute top-[210px] left-[240px] rounded-full border border-emerald-400/50 bg-emerald-900/55 px-5 py-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur-sm">
            <span className="text-xs text-gray-200">ONLINE</span>
            <span className="ml-2 text-xs font-semibold text-emerald-400">24/7</span>
          </div>
        </div>
      </div>

      {/* МОДАЛКИ */}
      {openModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closeModal}
        >
          <div
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg border border-emerald-500 bg-[#0d0d0d] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-2xl font-bold text-emerald-400">
              {openModal === 'features' && '🎯 Что вы получаете с NESI'}
              {openModal === 'solutions' && '🧩 Решения для разных ролей'}
              {openModal === 'support' && '📞 Поддержка пользователей 24/7'}
            </h2>

            <div className="space-y-2 text-sm leading-relaxed">
              {openModal === 'features' && (
                <ul className="space-y-1 list-disc pl-5">
                  <li>Поиск исполнителей по XP, рейтингу, городу и навыкам</li>
                  <li>Сертификация перед откликами — гарантия качества</li>
                  <li>Рост уровня: тесты, задачи, XP</li>
                  <li>Подиум лучших специалистов</li>
                  <li>Профиль с отзывами, бейджами и рейтингом</li>
                  <li>Гибкая система задач и статусов</li>
                  <li>Минимальная цена — защита от демпинга</li>
                </ul>
              )}
              {openModal === 'solutions' && (
                <>
                  <p><strong>👤 Исполнителям:</strong></p>
                  <ul className="space-y-1 list-disc pl-5">
                    <li>Прокачка уровня и опыта</li>
                    <li>Сертификация и реальные задачи</li>
                    <li>Карточка специалиста, подиум</li>
                  </ul>
                  <p className="mt-4"><strong>💼 Заказчикам:</strong></p>
                  <ul className="space-y-1 list-disc pl-5">
                    <li>Фильтры по рейтингу и навыкам</li>
                    <li>Только сертифицированные исполнители</li>
                    <li>Прямые отклики и удобный отбор</li>
                  </ul>
                </>
              )}
              {openModal === 'support' && (
                <div className="space-y-4">
                  <ul className="space-y-1 list-disc pl-5">
                    <li>Скоро: встроенный чат-помощник</li>
                    <li>Email: support@nesi.app</li>
                    <li>База знаний и подсказки</li>
                  </ul>
                  <textarea
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Напишите ваш вопрос…"
                    className="h-24 w-full resize-none rounded-md border border-emerald-400 bg-black/50 p-3 text-sm text-white"
                  />
                  <button
                    onClick={sendSupportMessage}
                    className="rounded border border-emerald-400 px-4 py-2 text-sm transition hover:bg-emerald-500 hover:text-black"
                  >
                    Отправить
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={closeModal}
                className="rounded border border-emerald-400 px-4 py-2 transition hover:bg-emerald-500 hover:text-black"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
