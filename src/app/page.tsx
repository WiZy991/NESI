'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      <div className="relative z-10 w-full px-0 py-0 animate-fade-in">
        <div className="relative w-full h-screen overflow-hidden">
          <img
            src="/nessi.svg"
            alt="Nessi Background"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ pointerEvents: "none" }}
          />

          {/* Вход */}
          <a aria-label="Вход" href="/login">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: "2.7777777777777777%",
                left: "84.47916666666667%",
                width: "4.375%",
                height: "3.148148148148148%",
              }}
            />
          </a>

          {/* Регистрация */}
          <a aria-label="Регистрация" href="/register">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: "2.7777777777777777%",
                left: "89.375%",
                width: "8.333333333333332%",
                height: "3.148148148148148%",
              }}
            />
          </a>

          {/* Бизнес */}
          <a aria-label="Бизнес" href="/business">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: "35%",
                left: "31.25%",
                width: "18.229166666666664%",
                height: "5.555555555555555%",
              }}
            />
          </a>

          {/* Таланты */}
          <a aria-label="Таланты" href="/talents">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: "35%",
                left: "53.385416666666664%",
                width: "23.4375%",
                height: "5.555555555555555%",
              }}
            />
          </a>
        </div>
      </div>
    </main>
  );
}
