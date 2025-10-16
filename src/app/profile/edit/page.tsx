'use client'

import { useUser } from '@/context/UserContext'
import ProtectedPage from '@/components/ProtectedPage'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  FaUserEdit,
  FaCity,
  FaCode,
  FaImage,
  FaFileSignature
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

// 🔹 Категории навыков
const skillCategories: Record<string, string[]> = {
  'IT и программирование': [
    'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
    'Python', 'Django', 'Bitrix', 'PostgreSQL', 'REST API', 'Docker', 'Git', 'Linux'
  ],
  'Дизайн': ['UI/UX', 'Figma', 'Photoshop', 'Illustrator', 'Адаптив'],
  'Контент и копирайтинг': ['SEO', 'Маркетинг', 'Копирайтинг', 'Редактура', 'SMM'],
}

// 🔹 Навыки
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
      <div className="flex flex-wrap gap-2 p-3 bg-[#0a0f0d]/70 rounded-xl border border-emerald-800 transition-all duration-300 hover:shadow-[0_0_15px_rgba(15,118,110,0.25)]">
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
          className="bg-transparent text-emerald-200 focus:outline-none px-2 w-28"
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
                    ? 'bg-emerald-700 text-white border-emerald-600 shadow-[0_0_10px_rgba(15,118,110,0.4)]'
                    : 'bg-[#0a0f0d]/70 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50 hover:text-white'
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

  if (loading || !user) return <div className="p-6 text-gray-400">Загрузка...</div>

  return (
    <ProtectedPage>
      <div className="max-w-4xl mx-auto p-6 space-y-10 animate-[fadeIn_0.8s_ease]">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-emerald-500">
          <FaUserEdit className="text-2xl" /> Редактировать профиль
        </h1>

        {/* Имя */}
        <div className="bg-[#0b0f0e]/80 p-6 rounded-xl border border-emerald-900 hover:border-emerald-700 shadow-[0_0_20px_rgba(15,118,110,0.15)] transition-all duration-500">
          <label className="flex items-center gap-2 text-gray-300 mb-2">
            <FaFileSignature className="text-emerald-500" /> Имя
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 bg-black/60 border border-emerald-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Описание */}
        <div className="bg-[#0b0f0e]/80 p-6 rounded-xl border border-emerald-900 hover:border-emerald-700 shadow-[0_0_20px_rgba(15,118,110,0.15)] transition-all duration-500">
          <label className="block mb-2 text-gray-300">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Расскажите немного о себе..."
            className="w-full px-3 py-2 bg-black/60 border border-emerald-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Аватар */}
        <div className="bg-[#0b0f0e]/80 p-6 rounded-xl border border-emerald-900 hover:border-emerald-700 flex flex-col sm:flex-row items-center gap-6 transition-all duration-500">
          <div className="flex flex-col flex-1">
            <label className="flex items-center gap-2 text-gray-300 mb-2">
              <FaImage className="text-emerald-500" /> Аватар
            </label>
            <label
              htmlFor="avatar-upload"
              className="cursor-pointer inline-block px-4 py-2 rounded-lg border border-emerald-600 text-emerald-400 hover:bg-emerald-700/40 transition"
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
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-700 shadow-[0_0_20px_rgба(15,118,110,0.3)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarPreview} alt="Аватар" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Город */}
        <div className="bg-[#0b0f0e]/80 p-6 rounded-xl border border-emerald-900 hover:border-emerald-700 shadow-[0_0_20px_rgба(15,118,110,0.15)] transition-all duration-500">
          <label className="flex items-center gap-2 text-gray-300 mb-2">
            <FaCity className="text-emerald-500" /> Город
          </label>
          <button
            type="button"
            onClick={() => setCityModalOpen(true)}
            className="w-full px-3 py-2 bg-black/60 border border-emerald-800 rounded-lg text-white text-left hover:border-emerald-600 transition"
          >
            {location || 'Выберите город...'}
          </button>
        </div>

        {/* Навыки */}
        <div className="bg-[#0b0f0e]/80 p-6 rounded-xl border border-emerald-900 hover:border-emerald-700 shadow-[0_0_20px_rgба(15,118,110,0.15)] transition-all duration-500">
          <label className="flex items-center gap-2 text-gray-300 mb-2">
            <FaCode className="text-emerald-500" /> Навыки
          </label>
          <SkillsSelector skills={skills} setSkills={setSkills} />
        </div>

        {/* Сохранить */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 text-lg rounded-lg border border-emerald-700 text-emerald-300 hover:bg-emerald-800/40 hover:text-white transition-all duration-400 font-semibold disabled:opacity-50 shadow-[0_0_15px_rgба(15,118,110,0.3)]"
          >
            {saving ? '💾 Сохраняем...' : '✅ Сохранить изменения'}
          </button>
        </div>
      </div>
    </ProtectedPage>
  )
}
