
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr, n = 1) {
  if (!arr.length) return [];
  if (n === 1) return arr[Math.floor(Math.random() * arr.length)];
  const copy = arr.slice();
  const res = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    res.push(copy.splice(idx, 1)[0]);
  }
  return res;
}

// заранее захэшированный пароль "123456"
const PASSWORD_HASH = "$2a$10$1wUlxtFxkXv9TT.3J1.T6eGJ5gLj9qK3hHHw0XnMzpT6hUdyxxc8K";

async function main() {
  console.log("Старт seed...");

  // 1) Создаём 1000 пользователей (createMany — быстро)
  const USERS_COUNT = 1000;
  const usersData = [];
  for (let i = 1; i <= USERS_COUNT; i++) {
    usersData.push({
      email: `user${i}@example.com`,
      password: PASSWORD_HASH,
      fullName: `Test User ${i}`,
      role: i % 10 === 0 ? "customer" : "executor", // ~10% customers
      blocked: false,
      description: `Автогенерированный тестовый профиль ${i}`,
      skills: [], // пустой массив, корректно для Postgres array
      xp: 0,
      completedTasksCount: 0,
      avgRating: 0,
    });
  }

  console.log("Вставляем пользователей (createMany)...");
  await prisma.user.createMany({
    data: usersData,
    skipDuplicates: true,
  });
  console.log("Пользователи созданы.");

  // 2) Получаем всех пользователей из БД для дальнейших ссылок
  const allUsers = await prisma.user.findMany({
    select: { id: true, role: true, email: true },
  });

  // Если по какой-то причине мало customer'ов, сделаем несколько вручную
  let customers = allUsers.filter((u) => u.role === "customer");
  const executors = allUsers.filter((u) => u.role === "executor");

  if (customers.length < 20) {
    console.log("Недостаточно customers — апдейтим часть пользователей в customers...");
    const toMake = 20 - customers.length;
    const candidates = allUsers.filter((u) => u.role !== "customer").slice(0, toMake);
    for (const c of candidates) {
      await prisma.user.update({ where: { id: c.id }, data: { role: "customer" } });
    }
    // пересчитываем
    const refreshed = await prisma.user.findMany({ select: { id: true, role: true } });
    customers = refreshed.filter((u) => u.role === "customer");
  }

  console.log(`Customers: ${customers.length}, Executors: ${executors.length}`);

  // 3) Создаём задачи: для N клиентов создаём M задач
  const TASKS_PER_CUSTOMER = 10; // можно подправить
  const taskIds = [];

  console.log("Создаём задачи...");
  for (let i = 0; i < Math.min(customers.length, 50); i++) {
    const cust = customers[i];
    const tasksBatch = [];
    for (let j = 0; j < TASKS_PER_CUSTOMER; j++) {
      tasksBatch.push({
        title: `Тестовая задача ${i * TASKS_PER_CUSTOMER + j + 1}`,
        description: `Описание тестовой задачи ${i * TASKS_PER_CUSTOMER + j + 1}`,
        price: randInt(500, 10000),
        customerId: cust.id,
        status: "open",
      });
    }
    // создаём пачкой
    const created = await prisma.task.createMany({ data: tasksBatch });
    // createMany не возвращает ids — создаём отдельно чтобы получить ids либо создаём по одной (медленнее).
    // Для простоты — создаём по одной задаче (чтобы получить id).
    for (const t of tasksBatch) {
      const single = await prisma.task.create({ data: t, select: { id: true } });
      taskIds.push(single.id);
    }
    console.log(`Создано задач для customer ${cust.id}`);
  }

  console.log(`Всего задач создано: ${taskIds.length}`);

  // 4) Создаём отклики: для каждой задачи — от 3 до 7 откликов от случайных исполнителей
  console.log("Создаём отклики (TaskResponse)...");
  let responsesCount = 0;
  for (const taskId of taskIds) {
    const responders = pickRandom(executors, randInt(3, 7));
    for (const r of responders) {
      try {
        await prisma.taskResponse.create({
          data: {
            taskId,
            userId: r.id,
            message: `Привет! Могу выполнить задачу. Цена: ${randInt(400, 9000)}`,
            price: randInt(400, 9000),
          },
        });
        responsesCount++;
      } catch (e) {
        // игнорируем дубликаты или ошибки уникальности
        // console.warn("response create error", e.message);
      }
    }
  }
  console.log(`Откликов создано: ~${responsesCount}`);

  // 5) Создаём сообщения в задачах (Message): для первых 100 задач создаём по несколько сообщений
  console.log("Создаём сообщения в задачах...");
  let messagesCount = 0;
  const sampleTasks = taskIds.slice(0, 100);
  for (const taskId of sampleTasks) {
    // берём customer и произвольного исполнителя
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { customerId: true } });
    const cust = task.customerId;
    const randExec = pickRandom(executors);
    const msgs = [
      { content: "Здравствуйте! Я готов обсудить задачу.", senderId: randExec.id, taskId },
      { content: "Отлично, напишите сроки и детали.", senderId: cust, taskId },
      { content: "Приложил файлы и спецификацию.", senderId: randExec.id, taskId },
    ];
    for (const m of msgs) {
      await prisma.message.create({ data: m });
      messagesCount++;
    }
  }
  console.log(`Сообщений в задачах создано: ${messagesCount}`);

  // 6) Создаём личные сообщения (PrivateMessage) между пользователями
  console.log("Создаём личные сообщения (private)...");
  let pmCount = 0;
  for (let i = 0; i < 200; i++) {
    const a = pickRandom(allUsers);
    let b = pickRandom(allUsers);
    // убедимся, что не сам себе
    if (a.id === b.id) {
      b = allUsers[(allUsers.indexOf(a) + 1) % allUsers.length];
    }
    await prisma.privateMessage.create({
      data: {
        senderId: a.id,
        recipientId: b.id,
        content: `Тестовое личное сообщение ${i + 1}`,
      },
    });
    pmCount++;
  }
  console.log(`Личных сообщений создано: ${pmCount}`);

  // 7) Комьюнити: посты, комментарии, лайки, просмотры
  console.log("Создаём посты в комьюнити и взаимодействия...");
  const communityPosts = [];
  for (let i = 0; i < 100; i++) {
    const author = pickRandom(allUsers);
    const post = await prisma.communityPost.create({
      data: {
        title: `Тестовый пост ${i + 1}`,
        content: `Контент тестового поста ${i + 1}`,
        authorId: author.id,
      },
      select: { id: true },
    });
    communityPosts.push(post.id);
  }

  // Комментарии и лайки
  let commComments = 0;
  let commLikes = 0;
  let commViews = 0;
  for (const postId of communityPosts) {
    // 0..5 комментариев
    const cCount = randInt(0, 5);
    for (let k = 0; k < cCount; k++) {
      const author = pickRandom(allUsers);
      await prisma.communityComment.create({
        data: {
          content: `Тестовый комментарий ${k + 1}`,
          authorId: author.id,
          postId,
        },
      });
      commComments++;
    }

    // 0..10 лайков от случайных юзеров (unique constraint ensures no dupes)
    const likeUsers = pickRandom(allUsers, Math.min(10, allUsers.length));
    const likeArr = Array.isArray(likeUsers) ? likeUsers : [likeUsers];
    for (const lu of likeArr) {
      try {
        await prisma.communityLike.create({
          data: {
            userId: lu.id,
            postId,
          },
        });
        commLikes++;
      } catch (e) {
        // игнорируем дубликаты
      }
    }

    // просмотры
    const viewCount = randInt(0, 20);
    for (let v = 0; v < viewCount; v++) {
      const u = pickRandom(allUsers);
      await prisma.communityView.create({
        data: {
          postId,
          userId: u ? u.id : null,
        },
      });
      commViews++;
    }
  }
  console.log(`Комьюнити: посты ${communityPosts.length}, комментарии ${commComments}, лайки ${commLikes}, просмотры ${commViews}`);

  // 8) Немного апдейтов по пользователям: зададим некоторым сертификацию и рейтинг
  console.log("Добавляем сертификаты/рейтинг/статистику для части исполнителей...");
  const someExecutors = executors.slice(0, 100);
  for (let i = 0; i < someExecutors.length; i++) {
    const ex = someExecutors[i];
    try {
      // увеличим xp и completedTasksCount, avgRating
      await prisma.user.update({
        where: { id: ex.id },
        data: {
          xp: randInt(100, 5000),
          completedTasksCount: randInt(1, 50),
          avgRating: Math.round((Math.random() * 4 + 1) * 10) / 10, // 1.0 - 5.0
        },
      });
    } catch (e) {
      // ignore
    }
  }

  console.log("Seed завершён. Проверьте данные в базе.");

  // финал
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Ошибка в seed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
