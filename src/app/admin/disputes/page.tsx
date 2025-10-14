import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AdminDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    include: {
      task: { select: { id: true, title: true } },
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-4">Споры</h1>

      {disputes.length === 0 ? (
        <p className="text-gray-400">Нет открытых споров</p>
      ) : (
        <table className="w-full text-sm border border-gray-800">
          <thead>
            <tr className="bg-gray-800">
              <th className="p-2 text-left">Задача</th>
              <th className="p-2 text-left">Пользователь</th>
              <th className="p-2 text-left">Причина</th>
              <th className="p-2 text-left">Описание</th>
              <th className="p-2 text-left">Статус</th>
              <th className="p-2 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => (
              <tr key={d.id} className="border-t border-gray-800">
                <td className="p-2 text-emerald-400">
                  <Link href={`/admin/tasks/${d.task.id}`} className="hover:underline">
                    {d.task.title}
                  </Link>
                </td>
                <td className="p-2">
                  {d.user.fullName || d.user.email}
                </td>
                <td className="p-2 text-red-300 font-medium">{d.reason}</td>

                {/* 💬 Описание спора */}
                <td className="p-2 text-gray-300 max-w-[250px] truncate" title={d.details || '—'}>
                  {d.details || <span className="text-gray-500 italic">Без описания</span>}
                </td>

                <td className="p-2">
                  {d.status === 'open' ? (
                    <span className="px-2 py-1 rounded bg-yellow-800 text-yellow-300 text-xs uppercase">
                      Открыт
                    </span>
                  ) : d.status === 'resolved' ? (
                    <span className="px-2 py-1 rounded bg-green-800 text-green-300 text-xs uppercase">
                      Решён
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs uppercase">
                      {d.status}
                    </span>
                  )}
                </td>

                <td className="p-2 flex gap-2">
                  <Link
                    href={`/admin/disputes/${d.id}`}
                    className="px-2 py-1 bg-blue-700 hover:bg-blue-800 rounded text-xs"
                  >
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
