'use client'

import { useUser } from '@/context/UserContext'
import ProtectedPage from '@/components/ProtectedPage'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Select from 'react-select'

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

// 🔹 Роли
const roleOptions = [
  { value: 'user', label: 'Пользователь' },
  { value: 'executor', label: 'Исполнитель' },
  { value: 'customer', label: 'Заказчик' },
]

// 🔹 Категории навыков
const skillCategories: Record<string, string[]> = {
  'IT и программирование': [
    'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
    'Python', 'Django', 'Flask', 'Bitrix', 'PostgreSQL',
    'REST API', 'Prisma ORM', 'JWT', 'Docker', 'Git', 'Linux',
  ],
  'Дизайн': [
    'UI/UX', 'Figma', 'Photoshop', 'Illustrator', 'Адаптив',
  ],
  'Контент и копирайтинг': [
    'SEO', 'Маркетинг', 'Копирайтинг', 'Редактура', 'SMM',
  ],
}

// 🔹 Кастомный селектор навыков
function SkillsSelector({
  skills,
  setSkills,
}: {
  skills: string[]
  setSkills: (s: string[]) => void
}) {
  const addSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      setSkills([...skills, skill])
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  return (
    <div className="space-y-4">
      {/* Выбранные навыки */}
      <div className="flex flex-wrap gap-2 p-2 bg-[#0d1b14] rounded-lg border border-emerald-700">
        {skills.map((skill) => (
          <span
            key={skill}
            className="px-3 py-1 bg-emerald-700/20 text-emerald-300 text-sm rounded-full border border-emerald-600 flex items-center gap-2"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder="Добавить..."
          className="bg-transparent text-emerald-200 focus:outline-none px-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
              addSkill(e.currentTarget.value.trim())
              e.currentTarget.value = ''
            }
          }}
        />
      </div>

      {/* Категории с кнопками */}
      {Object.entries(skillCategories).map(([category, categorySkills]) => (
        <div key={category}>
          <h3 className="text-emerald-400 text-sm mb-2">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {categorySkills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className={`px-3 py-1 text-sm rounded-full border ${
                  skills.includes(skill)
                    ? 'bg-emerald-600 text-black border-emerald-400'
                    : 'bg-emerald-900/30 text-emerald-300 border-emerald-600 hover:bg-emerald-700/40'
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
  const [password, setPassword] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [role, setRole] = useState('user')
  const [skills, setSkills] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const [cityModalOpen, setCityModalOpen] = useState(false)
  const [citySearch, setCitySearch] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setDescription(user.description || '')
      setLocation(user.location || '')
      setRole(user.role || 'user')

      if (Array.isArray(user.skills)) {
        setSkills(user.skills)
      } else if (typeof user.skills === 'string') {
        setSkills(user.skills.split(',').map((s: string) => s.trim()))
      }
    }
  }, [user])

  const handleSave = async () => {
    if (!token) return toast.error('Нет токена авторизации')
    if (!fullName.trim()) return toast.error('Имя не может быть пустым')
    if (!role.trim()) return toast.error('Роль обязательна')

    setSaving(true)
    const toastId = toast.loading('Сохраняем профиль...')

    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('role', role)
      if (password) formData.append('password', password)
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

  if (loading || !user) return <div className="p-6 text-gray-400">Загрузка...</div>

  return (
    <ProtectedPage>
      <div className="p-6 max-w-xl mx-auto space-y-6 bg-black/40 border border-emerald-500/30 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
        <h1 className="text-2xl font-bold text-emerald-400 mb-4">✏️ Редактировать профиль</h1>

        {/* Имя */}
        <div>
          <label className="block mb-1 text-gray-300">Имя</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Роль */}
        <div>
          <label className="block mb-1 text-gray-300">Роль</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value} className="bg-black">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Пароль */}
        <div>
          <label className="block mb-1 text-gray-300">Новый пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Описание */}
        <div>
          <label className="block mb-1 text-gray-300">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Аватар */}
        <div>
          <label className="block mb-1 text-gray-300">Аватар (изображение)</label>
          <label
            htmlFor="avatar-upload"
            className="cursor-pointer inline-block px-3 py-2 rounded-lg border border-emerald-400 
                       text-emerald-400 hover:bg-emerald-400 hover:text-black transition"
          >
            📷 Загрузить аватар
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setAvatarFile(e.target.files[0])
              }
            }}
            className="hidden"
          />
          {avatarFile && (
            <p className="text-xs text-emerald-400 mt-1">Выбран: {avatarFile.name}</p>
          )}
        </div>

        {/* Город */}
        <div>
          <label className="block mb-1 text-gray-300">Город</label>
          <button
            type="button"
            onClick={() => setCityModalOpen(true)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white text-left
                       hover:border-emerald-400 transition"
          >
            {location || 'Выберите город...'}
          </button>
        </div>

        {/* Модалка выбора города */}
        {cityModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#0d1b14] p-6 rounded-lg border border-emerald-600 w-full max-w-lg">
              <h2 className="text-xl text-emerald-400 mb-4">Выберите город</h2>
              <input
                type="text"
                placeholder="Поиск..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full mb-4 px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                           focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {cityOptions
                  .filter((c) =>
                    c.label.toLowerCase().includes(citySearch.toLowerCase())
                  )
                  .map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setLocation(c.value)
                        setCityModalOpen(false)
                      }}
                      className={`block w-full text-left px-3 py-2 rounded-lg ${
                        location === c.value
                          ? 'bg-emerald-700/50 text-white'
                          : 'hover:bg-emerald-700/30 text-emerald-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => setCityModalOpen(false)}
                className="mt-4 px-4 py-2 rounded-lg border border-red-400 text-red-400 hover:bg-red-400 hover:text-black transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        {/* Навыки */}
        <div>
          <label className="block mb-1 text-gray-300">Навыки</label>
          <SkillsSelector skills={skills} setSkills={setSkills} />
        </div>

        {/* Сохранить */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-lg border border-emerald-400 text-emerald-400 
                     hover:bg-emerald-400 hover:text-black transition disabled:opacity-50"
        >
          {saving ? 'Сохраняем...' : '💾 Сохранить'}
        </button>
      </div>
    </ProtectedPage>
  )
} 
