import Link from 'next/link'

export default function NessiSVG({
  onBusinessClick,
  onTalentsClick,
}: {
  onBusinessClick: () => void
  onTalentsClick: () => void
}) {
  return (
    <svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <text x="80" y="120" fontSize="80" fontWeight="bold" fill="#00ffaa">
        NESI
      </text>

      <Link href="/login">
        <g className="cursor-pointer hover:opacity-80">
          <rect x="1650" y="30" width="100" height="40" rx="10" stroke="#00ffaa" />
          <text x="1700" y="58" textAnchor="middle" fontSize="18" fill="#00ffaa">
            Вход
          </text>
        </g>
      </Link>

      <Link href="/register">
        <g className="cursor-pointer hover:opacity-80">
          <rect x="1770" y="30" width="120" height="40" rx="10" stroke="#00ffaa" />
          <text x="1830" y="58" textAnchor="middle" fontSize="18" fill="#00ffaa">
            Регистрация
          </text>
        </g>
      </Link>


      <g onClick={onBusinessClick} className="cursor-pointer hover:opacity-80">
        <rect x="100" y="300" width="300" height="150" rx="20" stroke="#00ffaa" />
        <text x="250" y="380" textAnchor="middle" fontSize="28" fill="#00ffaa">
          БИЗНЕС
        </text>
      </g>


      <g onClick={onTalentsClick} className="cursor-pointer hover:opacity-80">
        <rect x="450" y="300" width="300" height="150" rx="20" stroke="#00ffaa" />
        <text x="600" y="380" textAnchor="middle" fontSize="28" fill="#00ffaa">
          ТАЛАНТЫ
        </text>
      </g>
    </svg>
  )
}
