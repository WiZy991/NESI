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

  // =========================
  // Бейджи (игровой стиль)
  // =========================
  console.log('🏅 Инициализируем бейджи...')
  
  const badges = [
    // Задачи - прогрессия от новичка до легенды
    {
      id: 'first-task',
      name: 'Первый шаг',
      description: '🌟 Начало легендарного пути. Выполнил свою первую задачу и вступил в ряды профессионалов!',
      icon: '🌱',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 1 })
    },
    {
      id: 'task-master-5',
      name: 'Исполнитель',
      description: '⚔️ Ты доказал, что можешь больше! 5 задач покорены. Путь к мастерству продолжается.',
      icon: '⚔️',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 5 })
    },
    {
      id: 'task-master-10',
      name: 'Ветеран поля боя',
      description: '🛡️ 10 задач позади! Тебя знают как надежного воина. Репутация растет, а опыт крепнет.',
      icon: '🛡️',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 10 })
    },
    {
      id: 'task-master-25',
      name: 'Мастер своего дела',
      description: '👑 25 побед! Ты достиг уровня эксперта. Твои навыки отточены, а имя гремит по всей платформе.',
      icon: '👑',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 25 })
    },
    {
      id: 'task-master-50',
      name: 'Легенда платформы',
      description: '💎 50 задач! Ты вошел в историю. О тебе слагают легенды, а новички мечтают достичь твоего уровня.',
      icon: '💎',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 50 })
    },
    // Тесты - путь знания
    {
      id: 'first-test',
      name: 'Ученик мудрости',
      description: '📜 Первый тест пройден! Знания открывают новые горизонты. Путь к сертификации начат.',
      icon: '📜',
      condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 1 })
    },
    {
      id: 'test-master-5',
      name: 'Хранитель знаний',
      description: '🎓 5 сертификаций! Ты стал настоящим эрудитом. Твоя экспертиза признана во всех областях.',
      icon: '🎓',
      condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 5 })
    },
    // Рейтинги и отзывы
    {
      id: 'high-rating',
      name: 'Звёздный профи',
      description: '⭐ Твой рейтинг сияет как звезда! 4.5+ - это признак истинного мастера. Клиенты тебе доверяют.',
      icon: '⭐',
      condition: JSON.stringify({ type: 'avgRating', operator: 'gte', value: 4.5 })
    },
    {
      id: 'positive-reviews-10',
      name: 'Любимец клиентов',
      description: '💝 10 восторженных отзывов! Твоя работа радует сердца. Ты создаешь не просто проекты, а эмоции.',
      icon: '💝',
      condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 10 })
    },
    // XP - путешествие опыта
    {
      id: 'xp-100',
      name: 'Странник опыта',
      description: '🔥 100 XP накоплено! Ты набрал первые боевые очки. Путешествие в мир профессионализма только начинается.',
      icon: '🔥',
      condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 100 })
    },
    {
      id: 'xp-500',
      name: 'Ветеран битв',
      description: '⚡ 500 XP! Ты прошел через множество испытаний. Опыт сделал тебя сильнее, умнее и увереннее.',
      icon: '⚡',
      condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 500 })
    },
    {
      id: 'xp-1000',
      name: 'Мастер всех времён',
      description: '🌟 1000 XP набрано! Ты достиг вершин мастерства. Твои достижения вдохновляют целое поколение.',
      icon: '🌟',
      condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 1000 })
    },
    // Уровни - эволюция
    {
      id: 'level-5',
      name: 'Возвышенный',
      description: '🚀 5 уровень покорен! Ты поднялся на новую высоту. Мир видит в тебе настоящего профессионала.',
      icon: '🚀',
      condition: JSON.stringify({ type: 'level', operator: 'gte', value: 5 })
    },
    {
      id: 'level-10',
      name: 'Божественный',
      description: '💫 10 уровень достигнут! Ты достиг божественных высот мастерства. Твои способности выходят за пределы обычного.',
      icon: '💫',
      condition: JSON.stringify({ type: 'level', operator: 'gte', value: 10 })
    },
    // Дополнительные игровые бейджи
    {
      id: 'rapid-fire',
      name: 'Быстрый удар',
      description: '🎯 Выполнил 3 задачи за короткое время! Скорость и качество - твои союзники.',
      icon: '🎯',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 3 })
    },
    {
      id: 'perfectionist',
      name: 'Перфекционист',
      description: '✨ Получил 20+ отзывов с максимальной оценкой! Твоя работа - это произведение искусства.',
      icon: '✨',
      condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 20 })
    },
    {
      id: 'knowledge-seeker',
      name: 'Искатель знаний',
      description: '📚 Прошел 10+ сертификаций! Твоя жажда знаний неутолима. Ты истинный гурман обучения.',
      icon: '📚',
      condition: JSON.stringify({ type: 'passedTests', operator: 'gte', value: 10 })
    },
    {
      id: 'xp-master-2000',
      name: 'Великий мастер',
      description: '🏆 2000 XP! Ты достиг уровня великих мастеров. Твои достижения записаны в анналах истории.',
      icon: '🏆',
      condition: JSON.stringify({ type: 'totalXP', operator: 'gte', value: 2000 })
    },
    {
      id: 'task-hunter-100',
      name: 'Охотник за заданиями',
      description: '🗡️ 100 задач выполнено! Ты настоящий охотник за проектами. Ни одна задача не ускользнет от тебя.',
      icon: '🗡️',
      condition: JSON.stringify({ type: 'completedTasks', operator: 'gte', value: 100 })
    },
    {
      id: 'social-butterfly',
      name: 'Социальная бабочка',
      description: '🦋 Получил 50+ положительных отзывов! Ты мастер общения и работы с людьми. Все тебя любят!',
      icon: '🦋',
      condition: JSON.stringify({ type: 'positiveReviews', operator: 'gte', value: 50 })
    }
  ]

  let createdCount = 0
  let updatedCount = 0

  for (const badge of badges) {
    const existing = await prisma.badge.findUnique({
      where: { id: badge.id }
    })

    if (existing) {
      await prisma.badge.update({
        where: { id: badge.id },
        data: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          condition: badge.condition
        }
      })
      updatedCount++
      console.log(`   ↳ Обновлён: ${badge.name}`)
    } else {
      await prisma.badge.create({
        data: badge
      })
      createdCount++
      console.log(`   ✅ Создан: ${badge.name}`)
    }
  }

  console.log(`🏅 Бейджи готовы: создано ${createdCount}, обновлено ${updatedCount}`)
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
