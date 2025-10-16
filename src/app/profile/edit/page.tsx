'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import ProtectedPage from '@/components/ProtectedPage'
import { toast } from 'sonner'
import {
  FaCity,
  FaCode,
  FaImage,
  FaFileSignature,
  FaSearch
} from 'react-icons/fa'

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


// --- Навыки
const skillCategories: Record<string, string[]> = {
  'IT и программирование': [
    'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
    'Python', 'Django', 'Bitrix', 'PostgreSQL', 'REST API', 'Docker', 'Git', 'Linux'
  ],
  'Дизайн': ['UI/UX', 'Figma', 'Photoshop', 'Illustrator', 'Адаптив'],
  'Контент и копирайтинг': ['SEO', 'Маркетинг', 'Копирайтинг', 'Редактура', 'SMM'],
}

// --- Компонент выбора навыков
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
      <div className="flex flex-wrap gap-2 p-3 neon-box">
        {skills.map((skill) => (
          <span
            key={skill}
            className="px-3 py-1 bg-emerald-800/40 text-emerald-200 text-sm rounded-full border border-emerald-700 flex items-center gap-2"
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
          placeholder="Добавить..."
          className="bg-transparent text-emerald-300 focus:outline-none px-2 w-32"
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
          <h3 className="text-emerald-500 text-sm mb-2 font-medium">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {items.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className={`px-3 py-1 text-sm rounded-full border transition-all duration-300 ${
                  skills.includes(skill)
                    ? 'bg-emerald-700 text-white border-emerald-600 shadow-[0_0_10px_rgba(0,255,150,0.4)]'
                    : 'bg-[#0a0f0e]/60 text-emerald-300 border-emerald-800 hover:border-emerald-600'
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

// --- Неоновый поиск города
function NeonCitySelect({ value, options, onChange }: {
  value: string
  options: { value: string; label: string }[]
  onChange: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`neon-select-btn w-full flex justify-between items-center ${
          open ? 'border-emerald-500 shadow-[0_0_15px_rgba(0,255,150,0.3)]' : ''
        }`}
      >
        <span>{value || 'Выберите или введите город...'}</span>
        <FaCity className="text-emerald-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-[#00120c]/95 border border-emerald-700 rounded-lg shadow-[0_0_25px_rgba(0,255,150,0.2)] z-50">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-800">
            <FaSearch className="text-emerald-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Начните вводить город..."
              className="w-full bg-transparent text-emerald-200 focus:outline-none placeholder-emerald-600"
            />
          </div>

          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {filtered.length > 0 ? (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value)
                    setQuery('')
                    setOpen(false)
                  }}
                  className={`px-4 py-2 cursor-pointer transition ${
                    opt.value === value
                      ? 'bg-emerald-700/40 text-white'
                      : 'text-emerald-200 hover:bg-emerald-700/20'
                  }`}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-emerald-500 text-sm">Не найдено</div>
            )}
          </div>
        </div>
      )}
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

  if (loading || !user) return <div className="p-6 text-gray-400">Загрузка...</div>

  return (
    <ProtectedPage>
      <div className="relative min-h-screen overflow-hidden text-white">
        <div className="max-w-4xl mx-auto p-8 relative z-10 space-y-10">

          <div className="flex items-center gap-5 mb-10">
            <img src="/astro.png" alt="Космонавт" className="astro-icon" />
            <h1 className="title-glow">Редактировать профиль</h1>
          </div>

          <div className="neon-box">
            <label className="label"><FaFileSignature /> Имя</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </div>

          <div className="neon-box">
            <label className="label">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Расскажите немного о себе..."
              className="input h-24 resize-none"
            />
          </div>

          <div className="neon-box flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1">
              <label className="label"><FaImage /> Аватар</label>
              <label htmlFor="avatar-upload" className="upload-btn">📷 Загрузить</label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
                className="hidden"
              />
            </div>
            {avatarPreview && (
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-600 shadow-[0_0_20px_rgba(0,255,150,0.4)]">
                <img src={avatarPreview} alt="Аватар" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* === КАСТОМНЫЙ SELECT С ПОИСКОМ === */}
          <div className="neon-box">
            <label className="label"><FaCity /> Город</label>
            <NeonCitySelect
              value={location}
              options={cityOptions}
              onChange={(val) => setLocation(val)}
            />
          </div>

          <div className="neon-box">
            <label className="label"><FaCode /> Навыки</label>
            <SkillsSelector skills={skills} setSkills={setSkills} />
          </div>

          <div className="text-center">
            <button onClick={handleSave} disabled={saving} className="save-btn">
              {saving ? '💾 Сохраняем...' : '✅ Сохранить изменения'}
            </button>
          </div>
        </div>
      </div>
    </ProtectedPage>
  )
}
