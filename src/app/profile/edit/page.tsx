'use client'

import { useUser } from '@/context/UserContext'
import ProtectedPage from '@/components/ProtectedPage'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FaUserEdit, FaCity, FaCode, FaImage, FaFileSignature } from 'react-icons/fa'

// 🔹 Города
const cityOptions = [
    { "value": "Москва", "label": "Москва" },
    { "value": "Санкт-Петербург", "label": "Санкт-Петербург" },
    { "value": "Новосибирск", "label": "Новосибирск" },
    { "value": "Екатеринбург", "label": "Екатеринбург" },
    { "value": "Казань", "label": "Казань" },
    { "value": "Нижний Новгород", "label": "Нижний Новгород" },
    { "value": "Челябинск", "label": "Челябинск" },
    { "value": "Самара", "label": "Самара" },
    { "value": "Омск", "label": "Омск" },
    { "value": "Ростов-на-Дону", "label": "Ростов-на-Дону" },
    { "value": "Уфа", "label": "Уфа" },
    { "value": "Красноярск", "label": "Красноярск" },
    { "value": "Пермь", "label": "Пермь" },
    { "value": "Воронеж", "label": "Воронеж" },
    { "value": "Волгоград", "label": "Волгоград" },
    { "value": "Краснодар", "label": "Краснодар" },
    { "value": "Саратов", "label": "Саратов" },
    { "value": "Тюмень", "label": "Тюмень" },
    { "value": "Тольятти", "label": "Тольятти" },
    { "value": "Ижевск", "label": "Ижевск" },
    { "value": "Барнаул", "label": "Барнаул" },
    { "value": "Ульяновск", "label": "Ульяновск" },
    { "value": "Иркутск", "label": "Иркутск" },
    { "value": "Хабаровск", "label": "Хабаровск" },
    { "value": "Ярославль", "label": "Ярославль" },
    { "value": "Владивосток", "label": "Владивосток" },
    { "value": "Махачкала", "label": "Махачкала" },
    { "value": "Томск", "label": "Томск" },
    { "value": "Оренбург", "label": "Оренбург" },
    { "value": "Кемерово", "label": "Кемерово" },
    { "value": "Новокузнецк", "label": "Новокузнецк" },
    { "value": "Рязань", "label": "Рязань" },
    { "value": "Астрахань", "label": "Астрахань" },
    { "value": "Набережные Челны", "label": "Набережные Челны" },
    { "value": "Пенза", "label": "Пенза" },
    { "value": "Липецк", "label": "Липецк" },
    { "value": "Киров", "label": "Киров" },
    { "value": "Чебоксары", "label": "Чебоксары" },
    { "value": "Балашиха", "label": "Балашиха" },
    { "value": "Калининград", "label": "Калининград" },
    { "value": "Тула", "label": "Тула" },
    { "value": "Курск", "label": "Курск" },
    { "value": "Ставрополь", "label": "Ставрополь" },
    { "value": "Улан-Удэ", "label": "Улан-Удэ" },
    { "value": "Сочи", "label": "Сочи" },
    { "value": "Тверь", "label": "Тверь" },
    { "value": "Магнитогорск", "label": "Магнитогорск" },
    { "value": "Иваново", "label": "Иваново" },
    { "value": "Брянск", "label": "Брянск" },
    { "value": "Белгород", "label": "Белгород" },
    { "value": "Сургут", "label": "Сургут" },
    { "value": "Владимир", "label": "Владимир" },
    { "value": "Чита", "label": "Чита" },
    { "value": "Нижний Тагил", "label": "Нижний Тагил" },
    { "value": "Архангельск", "label": "Архангельск" },
    { "value": "Калуга", "label": "Калуга" },
    { "value": "Симферополь", "label": "Симферополь" },
    { "value": "Смоленск", "label": "Смоленск" },
    { "value": "Волжский", "label": "Волжский" },
    { "value": "Якутск", "label": "Якутск" },
    { "value": "Грозный", "label": "Грозный" },
    { "value": "Подольск", "label": "Подольск" },
    { "value": "Саранск", "label": "Саранск" },
    { "value": "Череповец", "label": "Череповец" },
    { "value": "Вологда", "label": "Вологда" },
    { "value": "Орёл", "label": "Орёл" },
    { "value": "Владикавказ", "label": "Владикавказ" },
    { "value": "Йошкар-Ола", "label": "Йошкар-Ола" },
    { "value": "Каменск-Уральский", "label": "Каменск-Уральский" },
    { "value": "Мытищи", "label": "Мытищи" },
    { "value": "Мурманск", "label": "Мурманск" },
    { "value": "Нижневартовск", "label": "Нижневартовск" },
    { "value": "Новороссийск", "label": "Новороссийск" },
    { "value": "Таганрог", "label": "Таганрог" },
    { "value": "Комсомольск-на-Амуре", "label": "Комсомольск-на-Амуре" },
    { "value": "Петрозаводск", "label": "Петрозаводск" },
    { "value": "Нальчик", "label": "Нальчик" },
    { "value": "Стерлитамак", "label": "Стерлитамак" },
    { "value": "Кострома", "label": "Кострома" },
    { "value": "Химки", "label": "Химки" },
    { "value": "Каменск-Шахтинский", "label": "Каменск-Шахтинский" },
    { "value": "Тамбов", "label": "Тамбов" },
    { "value": "Курган", "label": "Курган" },
    { "value": "Энгельс", "label": "Энгельс" },
    { "value": "Благовещенск", "label": "Благовещенск" },
    { "value": "Севастополь", "label": "Севастополь" },
    { "value": "Сыктывкар", "label": "Сыктывкар" },
    { "value": "Нижнекамск", "label": "Нижнекамск" },
    { "value": "Шахты", "label": "Шахты" },
    { "value": "Ногинск", "label": "Ногинск" },
    { "value": "Зеленоград", "label": "Зеленоград" },
    { "value": "Орск", "label": "Орск" },
    { "value": "Бийск", "label": "Бийск" },
    { "value": "Димитровград", "label": "Димитровград" },
    { "value": "Новый Уренгой", "label": "Новый Уренгой" },
    { "value": "Псков", "label": "Псков" },
    { "value": "Кисловодск", "label": "Кисловодск" },
    { "value": "Армавир", "label": "Армавир" },
    { "value": "Рыбинск", "label": "Рыбинск" },
    { "value": "Ангарск", "label": "Ангарск" },
    { "value": "Балашов", "label": "Балашов" },
    { "value": "Элиста", "label": "Элиста" },
    { "value": "Копейск", "label": "Копейск" },
    { "value": "Березники", "label": "Березники" },
    { "value": "Златоуст", "label": "Златоуст" },
    { "value": "Миасс", "label": "Миасс" },
    { "value": "Абакан", "label": "Абакан" },
    { "value": "Норильск", "label": "Норильск" },
    { "value": "Сызрань", "label": "Сызрань" },
    { "value": "Великий Новгород", "label": "Великий Новгород" },
    { "value": "Бердск", "label": "Бердск" },
    { "value": "Салават", "label": "Салават" },
    { "value": "Арзамас", "label": "Арзамас" },
    { "value": "Коломна", "label": "Коломна" },
    { "value": "Домодедово", "label": "Домодедово" },
    { "value": "Жуковский", "label": "Жуковский" },
    { "value": "Одинцово", "label": "Одинцово" },
    { "value": "Кызыл", "label": "Кызыл" },
    { "value": "Ессентуки", "label": "Ессентуки" },
    { "value": "Новочеркасск", "label": "Новочеркасск" },
    { "value": "Серпухов", "label": "Серпухов" },
    { "value": "Нефтеюганск", "label": "Нефтеюганск" },
    { "value": "Дербент", "label": "Дербент" },
    { "value": "Каменка", "label": "Каменка" },
    { "value": "Майкоп", "label": "Майкоп" },
    { "value": "Клин", "label": "Клин" },
    { "value": "Раменское", "label": "Раменское" },
    { "value": "Сергиев Посад", "label": "Сергиев Посад" },
    { "value": "Новоуральск", "label": "Новоуральск" },
    { "value": "Альметьевск", "label": "Альметьевск" },
    { "value": "Находка", "label": "Находка" },
    { "value": "Обнинск", "label": "Обнинск" },
    { "value": "Каменск", "label": "Каменск" },
    { "value": "Хасавюрт", "label": "Хасавюрт" },
    { "value": "Каспийск", "label": "Каспийск" },
    { "value": "Назрань", "label": "Назрань" },
    { "value": "Евпатория", "label": "Евпатория" },
    { "value": "Пятигорск", "label": "Пятигорск" },
    { "value": "Королёв", "label": "Королёв" },
    { "value": "Люберцы", "label": "Люберцы" },
    { "value": "Щёлково", "label": "Щёлково" },
    { "value": "Красногорск", "label": "Красногорск" },
    { "value": "Электросталь", "label": "Электросталь" },
    { "value": "Железнодорожный", "label": "Железнодорожный" },
    { "value": "Новомосковск", "label": "Новомосковск" },
    { "value": "Сергиевск", "label": "Сергиевск" },
    { "value": "Черкесск", "label": "Черкесск" },
    { "value": "Геленджик", "label": "Геленджик" },
    { "value": "Минеральные Воды", "label": "Минеральные Воды" },
    { "value": "Будённовск", "label": "Будённовск" },
    { "value": "Ковров", "label": "Ковров" },
    { "value": "Саров", "label": "Саров" },
    { "value": "Егорьевск", "label": "Егорьевск" },
    { "value": "Уссурийск", "label": "Уссурийск" },
    { "value": "Тобольск", "label": "Тобольск" },
    { "value": "Ноябрьск", "label": "Ноябрьск" },
    { "value": "Северск", "label": "Северск" },
    { "value": "Муром", "label": "Муром" },
    { "value": "Камышин", "label": "Камышин" },
    { "value": "Каспийский", "label": "Каспийский" },
    { "value": "Долгопрудный", "label": "Долгопрудный" },
    { "value": "Пушкино", "label": "Пушкино" },
    { "value": "Реутов", "label": "Реутов" },
    { "value": "Домодедово", "label": "Домодедово" },
    { "value": "Нягань", "label": "Нягань" },
    { "value": "Северодвинск", "label": "Северодвинск" },
    { "value": "Ачинск", "label": "Ачинск" },
    { "value": "Канск", "label": "Канск" },
    { "value": "Минусинск", "label": "Минусинск" },
    { "value": "Саянск", "label": "Саянск" },
    { "value": "Усть-Илимск", "label": "Усть-Илимск" },
    { "value": "Братск", "label": "Братск" },
    { "value": "Ухта", "label": "Ухта" },
    { "value": "Воркута", "label": "Воркута" },
    { "value": "Печора", "label": "Печора" },
    { "value": "Сосногорск", "label": "Сосногорск" },
    { "value": "Когалым", "label": "Когалым" },
    { "value": "Нягань", "label": "Нягань" },
    { "value": "Радужный", "label": "Радужный" },
    { "value": "Мегион", "label": "Мегион" },
    { "value": "Лангепас", "label": "Лангепас" },
    { "value": "Пыть-Ях", "label": "Пыть-Ях" },
    { "value": "Советский", "label": "Советский" },
    { "value": "Белоярский", "label": "Белоярский" },
    { "value": "Урай", "label": "Урай" },
    { "value": "Ханты-Мансийск", "label": "Ханты-Мансийск" },
    { "value": "Сургут", "label": "Сургут" },
    { "value": "Югорск", "label": "Югорск" },
    { "value": "Лабытнанги", "label": "Лабытнанги" },
    { "value": "Салехард", "label": "Салехард" },
    { "value": "Новый Уренгой", "label": "Новый Уренгой" },
    { "value": "Надым", "label": "Надым" },
    { "value": "Губкинский", "label": "Губкинский" },
    { "value": "Тарко-Сале", "label": "Тарко-Сале" },
    { "value": "Южно-Сахалинск", "label": "Южно-Сахалинск" }
]


const skillCategories: Record<string, string[]> = {
  'IT и программирование': [
    'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'Django', 'Bitrix', 'PostgreSQL', 'REST API', 'Docker', 'Git', 'Linux'
  ],
  'Дизайн': ['UI/UX', 'Figma', 'Photoshop', 'Illustrator', 'Адаптив'],
  'Контент и копирайтинг': ['SEO', 'Маркетинг', 'Копирайтинг', 'Редактура', 'SMM'],
}

function SkillsSelector({ skills, setSkills }: { skills: string[]; setSkills: (s: string[]) => void }) {
  const addSkill = (skill: string) => {
    if (!skills.includes(skill)) setSkills([...skills, skill])
  }

  const removeSkill = (skill: string) => {
    const updated = skills.filter((s) => s !== skill)
    setSkills(updated)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 p-3 bg-[#030a07]/80 rounded-xl border border-[#00ffa2]/30 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_0_25px_rgba(0,255,162,0.2)]">
        {skills.map((skill) => (
          <span
            key={skill}
            className="px-3 py-1 bg-[#00ffa2]/20 text-[#00ffa2] text-sm rounded-full border border-[#00ffa2]/50 flex items-center gap-2"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="text-red-400 hover:text-red-500 transition"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder="+ Добавить..."
          className="bg-transparent text-[#00ffa2]/70 focus:outline-none px-2 w-32 placeholder-[#00ffa2]/40"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              addSkill(e.currentTarget.value.trim())
              e.currentTarget.value = ''
            }
          }}
        />
      </div>

      {Object.entries(skillCategories).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-[#00ffa2]/80 text-sm mb-2 font-medium">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {items.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className={`px-3 py-1 text-sm rounded-full border transition-all duration-300 ${
                  skills.includes(skill)
                    ? 'bg-[#00ffa2]/30 text-white border-[#00ffa2] shadow-[0_0_10px_rgba(0,255,162,0.4)]'
                    : 'bg-black/40 text-[#00ffa2]/70 border-[#00ffa2]/30 hover:bg-[#00ffa2]/10 hover:text-[#00ffa2]'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function EditProfilePage() {
  const { user, token, login, loading } = useUser()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [cityModalOpen, setCityModalOpen] = useState(false)
  const [citySearch, setCitySearch] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setDescription(user.description || '')
      setLocation(user.location || '')
      setSkills(Array.isArray(user.skills) ? user.skills : (user.skills || '').split(',').map((s: string) => s.trim()))
      if (user.avatarUrl) setAvatarPreview(user.avatarUrl)
    }
  }, [user])

  const handleSave = async () => {
    if (!token) return toast.error('Нет токена авторизации')
    if (!fullName.trim()) return toast.error('Имя не может быть пустым')

    setSaving(true)
    const toastId = toast.loading('Сохраняем профиль...')

    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('role', user.role)
      formData.append('description', description)
      formData.append('location', location)
      formData.append('skills', skills.join(','))
      if (avatarFile) formData.append('avatar', avatarFile)

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка при сохранении')

      login(data.user, token)
      toast.success('Профиль обновлён', { id: toastId })
      router.push('/profile')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сервера', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (file: File) => {
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const filteredCities = cityOptions.filter(c =>
    c.label.toLowerCase().includes(citySearch.toLowerCase())
  )

  if (loading || !user) return <div className="p-6 text-gray-400">Загрузка...</div>

  return (
    <ProtectedPage>
      <div className="relative overflow-hidden min-h-screen bg-[#020a07] text-white">
        {/* 🔹 Космический фон */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#021a14] to-black opacity-90" />
        <div className="absolute inset-0 pointer-events-none animate-pulse bg-[radial-gradient(circle_at_30%_30%,rgba(0,255,162,0.08),transparent_60%)]" />

        {/* 🔹 Контент */}
        <div className="relative max-w-4xl mx-auto p-8 space-y-10 z-10">
          {/* Космонавт с карандашом */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-[#00ffa2]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="w-24 h-24 text-[#00ffa2] animate-[float_4s_ease-in-out_infinite]"
              fill="none"
              stroke="currentColor"
              strokeWidth="18"
            >
              <path d="M256 16c-110.5 0-200 89.5-200 200s89.5 200 200 200 200-89.5 200-200S366.5 16 256 16z" />
              <circle cx="256" cy="216" r="80" />
              <path d="M320 320l80 80-32 32-80-80" />
            </svg>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#00ffa2] drop-shadow-[0_0_20px_rgba(0,255,162,0.5)]">
              Редактировать профиль
            </h1>
          </div>

          {/* Имя */}
          <div className="bg-black/50 border border-[#00ffa2]/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,255,162,0.15)] hover:shadow-[0_0_50px_rgba(0,255,162,0.25)] transition-all">
            <label className="flex items-center gap-2 text-[#00ffa2]/90 mb-2">
              <FaFileSignature /> Имя
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-black/60 border border-[#00ffa2]/30 rounded-lg px-3 py-2 text-[#00ffa2] focus:ring-2 focus:ring-[#00ffa2]/60 focus:outline-none"
            />
          </div>

          {/* Описание */}
          <div className="bg-black/50 border border-[#00ffa2]/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,255,162,0.15)] transition-all">
            <label className="text-[#00ffa2]/90 mb-2 block">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Расскажите немного о себе..."
              className="w-full bg-black/60 border border-[#00ffa2]/30 rounded-lg px-3 py-2 text-[#00ffa2] focus:ring-2 focus:ring-[#00ffa2]/60 focus:outline-none"
            />
          </div>

          {/* Аватар */}
          <div className="bg-black/50 border border-[#00ffa2]/30 rounded-2xl p-6 shadow-[0_0_30px_rgба(0,255,162,0.15)] flex flex-col sm:flex-row items-center gap-6 transition-all">
            <div className="flex flex-col flex-1">
              <label className="flex items-center gap-2 text-[#00ffa2]/90 mb-2">
                <FaImage /> Аватар
              </label>
              <label
                htmlFor="avatar-upload"
                className="cursor-pointer inline-block px-4 py-2 rounded-lg border border-[#00ffa2]/40 text-[#00ffa2]/80 hover:bg-[#00ffa2]/20 transition"
              >
                📷 Загрузить
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
                className="hidden"
              />
            </div>
            {avatarPreview && (
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#00ffa2]/50 shadow-[0_0_25px_rgба(0,255,162,0.3)]">
                <img src={avatarPreview} alt="Аватар" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Город */}
          <div className="bg-black/50 border border-[#00ffa2]/30 rounded-2xl p-6 shadow-[0_0_30px_rgба(0,255,162,0.15)] transition-all">
            <label className="flex items-center gap-2 text-[#00ffa2]/90 mb-2">
              <FaCity /> Город
            </label>
            <button
              type="button"
              onClick={() => setCityModalOpen(true)}
              className="w-full px-3 py-2 bg-black/60 border border-[#00ffa2]/30 rounded-lg text-[#00ffa2]/80 text-left hover:border-[#00ffa2]/60 transition"
            >
              {location || 'Выберите город...'}
            </button>
          </div>

          {/* Навыки */}
          <div className="bg-black/50 border border-[#00ffa2]/30 rounded-2xl p-6 shadow-[0_0_30px_rgба(0,255,162,0.15)]">
            <label className="flex items-center gap-2 text-[#00ffa2]/90 mb-2">
              <FaCode /> Навыки
            </label>
            <SkillsSelector skills={skills} setSkills={setSkills} />
          </div>

          {/* Сохранить */}
          <div className="pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 text-lg rounded-lg border border-[#00ffa2]/40 text-[#00ffa2]/80 hover:bg-[#00ffa2]/20 hover:text-white transition-all duration-300 font-semibold shadow-[0_0_25px_rgба(0,255,162,0.2)]"
            >
              {saving ? '💾 Сохраняем...' : '✅ Сохранить изменения'}
            </button>
          </div>
        </div>

        {/* Модалка выбора города */}
        {cityModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#030a07]/95 border border-[#00ffa2]/40 rounded-xl p-6 max-w-md w-full shadow-[0_0_40px_rgба(0,255,162,0.3)]">
              <h2 className="text-xl font-semibold text-[#00ffa2] mb-4">Выберите город</h2>
              <input
                type="text"
                placeholder="Поиск..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full mb-4 bg-black/50 border border-[#00ffa2]/30 rounded-lg px-3 py-2 text-[#00ffa2] focus:outline-none focus:ring-2 focus:ring-[#00ffa2]/60"
              />
              <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-[#00ffa2]/40 scrollbar-track-transparent">
                {filteredCities.map((city) => (
                  <button
                    key={city.value}
                    onClick={() => {
                      setLocation(city.label)
                      setCityModalOpen(false)
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md hover:bg-[#00ffa2]/20 text-[#00ffa2]/80 transition"
                  >
                    {city.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCityModalOpen(false)}
                className="mt-4 w-full py-2 rounded-lg border border-[#00ffa2]/30 text-[#00ffa2]/70 hover:bg-[#00ffa2]/10"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  )
}
