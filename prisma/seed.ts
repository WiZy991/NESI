import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Обновляем категории и подкатегории с актуальными минимальными ценами...')

  const categories = [
  {
    name: 'IT и программирование',
    subcategories: [
      { name: 'Frontend', minPrice: 2000 },
      { name: 'Backend', minPrice: 2200 },
      { name: 'Fullstack', minPrice: 5000 },
      { name: 'DevOps', minPrice: 2500 },
      { name: 'Базы данных', minPrice: 2000 },
      { name: 'Телеграм-боты', minPrice: 1800 },
      { name: 'Интеграции API', minPrice: 2200 },
      { name: 'Тестирование и QA', minPrice: 1800 },
      { name: 'Разработка на Python', minPrice: 3000 },
      { name: 'Node.js / Express', minPrice: 2300 },
      { name: 'Next.js', minPrice: 3000 },
      { name: 'WordPress / CMS', minPrice: 2000 },
      { name: 'AI / ML / Нейросети', minPrice: 3500 },
      { name: 'Игровая разработка', minPrice: 3000 },
      { name: 'Скрипты и автоматизация', minPrice: 1800 },
    ],
  },
  {
    name: '1С',
    subcategories: [
      { name: '1С:Бухгалтерия', minPrice: 2500 },
      { name: '1С:Зарплата и кадры', minPrice: 2500 },
      { name: '1С:Розница', minPrice: 2500 },
      { name: '1С:Управление торговлей', minPrice: 2500 },
      { name: 'Интеграции 1С с сайтами', minPrice: 3000 },
      { name: 'Обновление и поддержка баз', minPrice: 2000 },
      { name: 'Обмен с CRM', minPrice: 2200 },
      { name: 'Настройка отчетов', minPrice: 2000 },
      { name: 'Миграция и резервное копирование', minPrice: 2500 },
      { name: 'Конфигуратор и доработки', minPrice: 3000 },
    ],
  },
  {
    name: 'Бухгалтерия и финансы',
    subcategories: [
      { name: 'Ведение бухгалтерии', minPrice: 3000 },
      { name: 'Отчетность в налоговую', minPrice: 2500 },
      { name: 'Консультации по ИП и ООО', minPrice: 1500 },
      { name: 'Расчет заработной платы', minPrice: 1500 },
      { name: 'Оптимизация налогообложения', minPrice: 2000 },
      { name: 'Финансовый анализ', minPrice: 2500 },
      { name: 'Ведение кассы', minPrice: 1000 },
      { name: 'Бюджетирование', minPrice: 2000 },
    ],
  },
  {
    name: 'CRM',
    subcategories: [
      { name: 'Внедрение CRM', minPrice: 3000 },
      { name: 'Интеграции с сайтом', minPrice: 2500 },
      { name: 'Разработка CRM бизнес-процессов', minPrice: 3000 },
      { name: 'Создание виджетов и приложений', minPrice: 2500 },
      { name: 'Настройка автоматизаций', minPrice: 2000 },
      { name: 'Обучение сотрудников', minPrice: 1500 },
      { name: 'Поддержка портала', minPrice: 1500 },
      { name: 'Бэкап и оптимизация', minPrice: 1800 },
    ],
  },
  {
    name: 'Маркетинг и продвижение',
    subcategories: [
      { name: 'Таргетированная реклама', minPrice: 2500 },
      { name: 'SEO-продвижение', minPrice: 3000 },
      { name: 'Контекстная реклама (Google, Яндекс)', minPrice: 3000 },
      { name: 'SMM (Instagram, VK, Telegram)', minPrice: 2000 },
      { name: 'Email-маркетинг', minPrice: 1500 },
      { name: 'Контент-маркетинг', minPrice: 1500 },
      { name: 'Аналитика и метрики', minPrice: 2000 },
      { name: 'Брендинг и позиционирование', minPrice: 2500 },
      { name: 'PR и статьи', minPrice: 2000 },
      { name: 'Маркетплейсы (Ozon, Wildberries)', minPrice: 2500 },
    ],
  },
  {
    name: 'Дизайн',
    subcategories: [
      { name: 'Логотипы и фирменный стиль', minPrice: 2000 },
      { name: 'Веб-дизайн', minPrice: 2500 },
      { name: 'UI/UX дизайн', minPrice: 3000 },
      { name: 'Мобильный дизайн', minPrice: 3000 },
      { name: 'Презентации и инфографика', minPrice: 2000 },
      { name: 'Анимация и видео', minPrice: 2000 },
      { name: '3D-графика', minPrice: 3000 },
      { name: 'Полиграфия', minPrice: 1500 },
      { name: 'Иллюстрации', minPrice: 1500 },
    ],
  },
  {
    name: 'Контент и копирайтинг',
    subcategories: [
      { name: 'Написание статей', minPrice: 700 },
      { name: 'SEO-тексты', minPrice: 1000 },
      { name: 'Редактирование и корректура', minPrice: 500 },
      { name: 'Сценарии и скрипты', minPrice: 3000 },
      { name: 'Посты для соцсетей', minPrice: 800 },
      { name: 'Коммерческие тексты', minPrice: 1500 },
      { name: 'Переводы', minPrice: 1500 },
      { name: 'Нейминг и слоганы', minPrice: 1200 },
    ],
  },
  {
    name: 'Бизнес и жизнь',
    subcategories: [
      { name: 'Консалтинг', minPrice: 2500 },
      { name: 'Обучение и коучинг', minPrice: 2500 },
      { name: 'Подбор персонала', minPrice: 2000 },
      { name: 'Юридические услуги', minPrice: 2500 },
      { name: 'Работа с документами', minPrice: 1500 },
      { name: 'Продажи и переговоры', minPrice: 2000 },
      { name: 'Проектный менеджмент', minPrice: 2000 },
    ],
  },
  {
    name: 'Аудио, видео, съёмка',
    subcategories: [
      { name: 'Монтаж видео', minPrice: 2500 },
      { name: 'Аудиообработка', minPrice: 2000 },
      { name: 'Озвучка и дикторы', minPrice: 1500 },
      { name: 'Музыка и песни', minPrice: 2000 },
      { name: 'Ролики для соцсетей', minPrice: 1500 },
      { name: 'Видеоинфографика', minPrice: 2500 },
      { name: 'ИИ-генерация видео и аудио', minPrice: 3000 },
    ],
  },
]


  for (const category of categories) {
    // upsert категории
    const cat = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: { name: category.name },
    })

    console.log(`✅ Категория: ${category.name}`)

    // upsert подкатегорий (обновляет minPrice если уже есть)
    for (const sub of category.subcategories) {
      await prisma.subcategory.upsert({
        where: { name: sub.name },
        update: {
          minPrice: sub.minPrice,
          categoryId: cat.id,
        },
        create: {
          name: sub.name,
          minPrice: sub.minPrice,
          categoryId: cat.id,
        },
      })
      console.log(`   ↳ Подкатегория обновлена: ${sub.name} → ${sub.minPrice}₽`)
    }
  }

  // =========================
  // Админ
  // =========================
  const email = 'admin@nesi.local'
  const plain = 'admin123' // поменяй после первого входа
  const password = await bcrypt.hash(plain, 10)

  await prisma.user.upsert({
    where: { email },
    update: { role: 'admin' },
    create: {
      email,
      password,
      role: 'admin',
      fullName: 'Системный администратор',
    },
  })

  console.log(`✅ Админ готов: ${email} / ${plain}`)
  console.log('🌱 Наполнение завершено!')
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
