'use client'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <svg
        viewBox="0 0 1920 1080"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        <rect width="1920" height="1080" fill="url(#paint0_radial_0_1)" />

        <a xlinkHref="/login">
          <rect
            x="1580"
            y="60"
            width="120"
            height="50"
            rx="10"
            fill="#00FFCD"
            className="cursor-pointer hover:opacity-80"
          />
          <text
            x="1640"
            y="90"
            fontSize="20"
            textAnchor="middle"
            fill="white"
            className="pointer-events-none select-none"
          >
            Вход
          </text>
        </a>

        <a xlinkHref="/register">
          <rect
            x="1710"
            y="60"
            width="160"
            height="50"
            rx="10"
            fill="#00FFCD"
            className="cursor-pointer hover:opacity-80"
          />
          <text
            x="1790"
            y="90"
            fontSize="20"
            textAnchor="middle"
            fill="white"
            className="pointer-events-none select-none"
          >
            Регистрация
          </text>
        </a>

        <a xlinkHref="/business">
          <rect
            x="720"
            y="330"
            width="180"
            height="70"
            rx="12"
            fill="#00FFCD"
            className="cursor-pointer hover:opacity-80"
          />
          <text
            x="810"
            y="375"
            fontSize="22"
            textAnchor="middle"
            fill="black"
            className="pointer-events-none select-none"
          >
            Бизнес
          </text>
        </a>

        <a xlinkHref="/talents">
          <rect
            x="930"
            y="330"
            width="180"
            height="70"
            rx="12"
            fill="#00FFCD"
            className="cursor-pointer hover:opacity-80"
          />
          <text
            x="1020"
            y="375"
            fontSize="22"
            textAnchor="middle"
            fill="black"
            className="pointer-events-none select-none"
          >
            Таланты
          </text>
        </a>

        <defs>
          <radialGradient
            id="paint0_radial_0_1"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(1920 1080) rotate(-180) scale(1920 1080)"
          >
            <stop stopColor="#04382A" />
            <stop offset="1" stopColor="black" />
          </radialGradient>
        </defs>
      </svg>
    </main>
  )
}
