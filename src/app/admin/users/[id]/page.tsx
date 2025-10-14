import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default async function UserProfilePage({ params }: Props) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      blocked: true,
      balance: true,
      xp: true,
      avgRating: true,
      completedTasksCount: true,
      createdAt: true,
      _count: {
        select: { tasks: true, responses: true, reviewsReceived: true },
      },
      tasks: {
        select: { id: true, title: true, status: true, price: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      executedTasks: {
        select: { id: true, title: true, status: true, price: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      transactions: {
        select: { id: true, amount: true, type: true, reason: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!user) return notFound()

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-4">Профиль пользователя</h1>

      {/* 🔹 Общая информация */}
      <div className="grid grid-cols-2 gap-4 bg-gray-900 p-4 rounded-lg border border-gray-800">
        <div>
          <p><span className="text-gray-400">ID:</span> {user.id}</p>
          <p><span className="text-gray-400">Email:</span> {user.email}</p>
          <p><span className="text-gray-400">Имя:</span> {user.fullName || '—'}</p>
          <p><span className="text-gray-400">Роль:</span> {user.role}</p>
          <p>
            <span className="text-gray-400">Статус:</span>{' '}
            {user.blocked ? (
              <span className="text-red-400">Заблокирован</span>
            ) : (
              <span className="text-green-400">Активен</span>
            )}
          </p>
        </div>

        <div>
          <p><span className="text-gray-400">Баланс:</span> {user.balance} ₽</p>
          <p><span className="text-gray-400">XP:</span> {user.xp}</p>
          <p><span className="text-gray-400">Рейтинг:</span> {user.avgRating?.toFixed(2) ?? '—'}</p>
          <p><span className="text-gray-400">Выполнено задач:</span> {user.completedTasksCount}</p>
          <p><span className="text-gray-400">Создан:</span> {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* 🔹 Управление пользователем */}
      <div className="mt-6 flex gap-2">
        <form action={`/api/admin/users/${user.id}/block`} method="POST">
          <button
            className={`px-3 py-1 rounded text-sm ${
              user.blocked ? 'bg-green-700 hover:bg-green-800' : 'bg-red-700 hover:bg-red-800'
            }`}
          >
            {user.blocked ? 'Разблокировать' : 'Заблокировать'}
          </button>
        </form>

        {user.role !== 'admin' && (
          <form action={`/api/admin/users/${user.id}/make-admin`} method="POST">
            <button className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm">
              Сделать админом
            </button>
          </form>
        )}
      </div>

      {/* 🔹 Активность */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Активность</h2>
        <ul className="space-y-1 text-sm text-gray-300">
          <li>Задач создано: {user._count.tasks}</li>
          <li>Откликов: {user._count.responses}</li>
          <li>Отзывы получено: {user._count.reviewsReceived}</li>
        </ul>
      </div>

      {/* 🔹 Задачи */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Задачи пользователя</h2>

        {/* 👨‍💼 Как заказчик */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2 text-gray-300">Созданные задачи (customer)</h3>
          {user.tasks.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет созданных задач.</p>
          ) : (
            <table className="w-full text-sm border border-gray-800">
              <thead>
                <tr className="bg-gray-800">
                  <th className="p-2 text-left">Название</th>
                  <th className="p-2">Статус</th>
                  <th className="p-2">Цена</th>
                  <th className="p-2">Дата</th>
                  <th className="p-2">Действие</th>
                </tr>
              </thead>
              <tbody>
                {user.tasks.map((t) => (
                  <tr key={t.id} className="border-t border-gray-800">
                    <td className="p-2">{t.title}</td>
                    <td className="p-2 capitalize">{t.status}</td>
                    <td className="p-2">{t.price} ₽</td>
                    <td className="p-2">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-2">
                      <a
                        href={`/admin/tasks/${t.id}`}
                        className="text-blue-400 hover:underline"
                      >
                        Перейти →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 🧰 Как исполнитель */}
        <div>
          <h3 className="text-lg font-medium mb-2 text-gray-300">Выполняемые задачи (executor)</h3>
          {user.executedTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет выполняемых задач.</p>
          ) : (
            <table className="w-full text-sm border border-gray-800">
              <thead>
                <tr className="bg-gray-800">
                  <th className="p-2 text-left">Название</th>
                  <th className="p-2">Статус</th>
                  <th className="p-2">Оплата</th>
                  <th className="p-2">Дата</th>
                  <th className="p-2">Действие</th>
                </tr>
              </thead>
              <tbody>
                {user.executedTasks.map((t) => (
                  <tr key={t.id} className="border-t border-gray-800">
                    <td className="p-2">{t.title}</td>
                    <td className="p-2 capitalize">{t.status}</td>
                    <td className="p-2">{t.price} ₽</td>
                    <td className="p-2">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-2">
                      <a
                        href={`/admin/tasks/${t.id}`}
                        className="text-blue-400 hover:underline"
                      >
                        Перейти →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 🔹 Финансы */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Финансы пользователя</h2>
        {user.transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">Транзакций пока нет.</p>
        ) : (
          <table className="w-full text-sm border border-gray-800">
            <thead>
              <tr className="bg-gray-800">
                <th className="p-2 text-left">Тип</th>
                <th className="p-2">Сумма</th>
                <th className="p-2">Причина</th>
                <th className="p-2">Дата</th>
              </tr>
            </thead>
            <tbody>
              {user.transactions.map((tr) => (
                <tr key={tr.id} className="border-t border-gray-800">
                  <td className="p-2 capitalize">{tr.type}</td>
                  <td className={`p-2 ${tr.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tr.amount} ₽
                  </td>
                  <td className="p-2">{tr.reason}</td>
                  <td className="p-2">{new Date(tr.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
