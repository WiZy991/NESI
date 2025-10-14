import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: { id: string }
}

export default async function AdminTaskPage({ params }: Props) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, email: true, fullName: true } },
      executor: { select: { id: true, email: true, fullName: true } },
      transactions: {
        select: { id: true, amount: true, type: true, createdAt: true, reason: true },
        orderBy: { createdAt: 'desc' },
      },
      messages: {
        include: {
          sender: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!task) return notFound()

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-4">Задача: {task.title}</h1>

      {/* Основная информация */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mb-8">
        <p><span className="text-gray-400">ID:</span> {task.id}</p>
        <p><span className="text-gray-400">Статус:</span> {task.status}</p>
        <p><span className="text-gray-400">Цена:</span> {task.price} ₽</p>
        <p><span className="text-gray-400">Создана:</span> {new Date(task.createdAt).toLocaleDateString()}</p>
        <p><span className="text-gray-400">Обновлена:</span> {new Date(task.updatedAt).toLocaleDateString()}</p>
      </div>

      {/* Описание */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mb-8">
        <h2 className="text-lg font-semibold mb-2">Описание</h2>
        <p className="text-gray-300 whitespace-pre-line">{task.description || 'Без описания'}</p>
      </div>

      {/* Связанные пользователи */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold mb-2">Заказчик</h2>
          {task.customer ? (
            <>
              <p>{task.customer.fullName || '—'}</p>
              <p>{task.customer.email}</p>
              <Link
                href={`/admin/users/${task.customer.id}`}
                className="text-blue-400 hover:underline text-sm"
              >
                Открыть профиль →
              </Link>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Нет данных</p>
          )}
        </div>

        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold mb-2">Исполнитель</h2>
          {task.executor ? (
            <>
              <p>{task.executor.fullName || '—'}</p>
              <p>{task.executor.email}</p>
              <Link
                href={`/admin/users/${task.executor.id}`}
                className="text-blue-400 hover:underline text-sm"
              >
                Открыть профиль →
              </Link>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Не назначен</p>
          )}
        </div>
      </div>

      {/* Финансы по задаче */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mb-8">
        <h2 className="text-lg font-semibold mb-3">Финансовые операции</h2>
        {task.transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет связанных транзакций.</p>
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
              {task.transactions.map((t) => (
                <tr key={t.id} className="border-t border-gray-800">
                  <td className="p-2 capitalize">{t.type}</td>
                  <td className={`p-2 ${t.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {t.amount} ₽
                  </td>
                  <td className="p-2">{t.reason}</td>
                  <td className="p-2">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 💬 Чат между заказчиком и исполнителем */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
        <h2 className="text-lg font-semibold mb-3">💬 Чат по задаче</h2>

        {task.messages.length === 0 ? (
          <p className="text-gray-500 text-sm">Переписка отсутствует.</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {task.messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg ${
                  msg.sender.role === 'customer'
                    ? 'bg-blue-900/40 border border-blue-800'
                    : 'bg-green-900/30 border border-green-700'
                }`}
              >
                <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                  <span>
                    {msg.sender.fullName || msg.sender.email}{' '}
                    <span className="opacity-70">
                      ({msg.sender.role === 'customer' ? 'Заказчик' : 'Исполнитель'})
                    </span>
                  </span>
                  <span>{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-gray-100 whitespace-pre-line">{msg.content}</p>
                {msg.fileUrl && (
                  <a
                    href={msg.fileUrl}
                    target="_blank"
                    className="text-blue-400 text-xs underline mt-1 inline-block"
                  >
                    📎 Прикреплённый файл
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
