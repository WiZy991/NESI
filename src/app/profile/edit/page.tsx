'use client'

import { useUser } from '@/context/UserContext'
import ProtectedPage from '@/components/ProtectedPage'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Select from 'react-select'

// 🔹 Города (можно расширить — вставить полный список РФ)
const cityOptions = [
  [
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
    { "value": "Йошкар-Ола", "label": "Йошкар-Ола" }
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
    {  "value": "Копейск", "label": "Копейск" },
    { "value": "Березники", "label": "Березники" },
    { "value": "Златоуст", "label": "Златоуст" },
    { "value": "Миасс", "label": "Миасс" },
    { "value": "Абакан", "label": "Абакан" }
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
    {  "value": "Раменское", "label": "Раменское" },
    { "value": "Сергиев Посад", "label": "Сергиев Посад" },
    { "value": "Новоуральск", "label": "Новоуральск" },
    { "value": "Альметьевск", "label": "Альметьевск" },
    { "value": "Находка", "label": "Находка" },
    { "value": "Обнинск", "label": "Обнинск" },
    { "value": "Каменск", "label": "Каменск" },
    { "value": "Хасавюрт", "label": "Хасавюрт" },
    { "value": "Каспийск", "label": "Каспийск" }
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
    { "value": "Северодвинск", "label": "Северодвинск" }
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

const skillOptions = [
  // Программирование
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'Python', label: 'Python' },
  { value: 'Django', label: 'Django' },
  { value: 'Flask', label: 'Flask' },
  { value: 'Node.js', label: 'Node.js' },
  { value: 'React', label: 'React' },
  { value: 'Next.js', label: 'Next.js' },
  { value: 'Vue.js', label: 'Vue.js' },
  { value: 'Angular', label: 'Angular' },
  { value: 'PHP', label: 'PHP' },
  { value: 'Laravel', label: 'Laravel' },
  { value: 'Symfony', label: 'Symfony' },
  { value: 'Go', label: 'Go' },
  { value: 'Rust', label: 'Rust' },
  { value: 'Java', label: 'Java' },
  { value: 'Spring', label: 'Spring' },
  { value: 'Kotlin', label: 'Kotlin' },
  { value: 'Swift', label: 'Swift' },
  { value: 'C#', label: 'C#' },
  { value: '.NET', label: '.NET' },
  { value: 'C++', label: 'C++' },

  // Дизайн
  { value: 'Figma', label: 'Figma' },
  { value: 'Photoshop', label: 'Photoshop' },
  { value: 'Illustrator', label: 'Illustrator' },
  { value: 'UI/UX', label: 'UI/UX' },

  // DevOps
  { value: 'Docker', label: 'Docker' },
  { value: 'Kubernetes', label: 'Kubernetes' },
  { value: 'CI/CD', label: 'CI/CD' },
  { value: 'Linux', label: 'Linux' },

  // Другое
  { value: 'SEO', label: 'SEO' },
  { value: 'Маркетинг', label: 'Маркетинг' },
  { value: 'Продажи', label: 'Продажи' },
  { value: 'Project Management', label: 'Project Management' },
  { value: 'Bitrix', label: 'Bitrix' },
]

export default function EditProfilePage() {
  const { user, token, login, loading } = useUser()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setDescription(user.description || '')
      setLocation(user.location || '')

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

    setSaving(true)
    const toastId = toast.loading('Сохраняем профиль...')

    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
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
          <Select
            options={cityOptions}
            value={cityOptions.find((c) => c.value === location) || null}
            onChange={(option) => setLocation(option?.value || '')}
            placeholder="Выберите город..."
            className="text-black"
          />
        </div>

        {/* Навыки */}
        <div>
          <label className="block mb-1 text-gray-300">Навыки</label>
          <Select
            options={skillOptions}
            isMulti
            value={skills.map((s) => ({ value: s, label: s }))}
            onChange={(selected) => setSkills(selected.map((s) => s.value))}
            placeholder="Выберите навыки..."
            className="text-black"
          />
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
