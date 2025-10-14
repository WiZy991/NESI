import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: { id: string };
}

export default async function DisputeDetailsPage({ params }: Props) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: { select: { id: true, fullName: true, email: true, role: true } },
            },
          },
        },
      },
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (!dispute) return notFound();

  const updateStatus = async (status: string) => {
    "use server";
    await prisma.dispute.update({
      where: { id: dispute.id },
      data: { status, resolvedAt: new Date() },
    });
  };

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-4">Спор #{dispute.id.slice(0, 8)}</h1>

      {/* Основная информация */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mb-6">
        <p>
          <span className="text-gray-400">Статус:</span>{" "}
          <span className={`font-semibold ${
            dispute.status === "open"
              ? "text-yellow-400"
              : dispute.status === "resolved"
              ? "text-green-400"
              : "text-red-400"
          }`}>
            {dispute.status}
          </span>
        </p>
        <p><span className="text-gray-400">Создан:</span> {new Date(dispute.createdAt).toLocaleString()}</p>
        {dispute.resolvedAt && (
          <p><span className="text-gray-400">Решён:</span> {new Date(dispute.resolvedAt).toLocaleString()}</p>
        )}
      </div>

      {/* Информация о задаче */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold mb-2">Задача</h2>
        <p className="text-gray-300">
          <Link
            href={`/admin/tasks/${dispute.task.id}`}
            className="text-blue-400 hover:underline"
          >
            {dispute.task.title}
          </Link>
        </p>
        <p className="text-sm text-gray-400">Статус: {dispute.task.status}</p>
      </div>

      {/* Кто открыл спор */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold mb-2">Инициатор спора</h2>
        <p>{dispute.user.fullName || "—"}</p>
        <p className="text-gray-400">{dispute.user.email}</p>
        <Link
          href={`/admin/users/${dispute.user.id}`}
          className="text-blue-400 hover:underline text-sm"
        >
          Открыть профиль →
        </Link>
      </div>

      {/* Причина */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold mb-2">Причина спора</h2>
        <p className="text-gray-300 whitespace-pre-line">{dispute.reason}</p>
        {dispute.details && (
          <>
            <h3 className="text-gray-400 mt-3 mb-1 text-sm">Дополнительные детали:</h3>
            <p className="text-gray-400 text-sm">{dispute.details}</p>
          </>
        )}
      </div>

      {/* Чат по задаче */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold mb-2">Чат по задаче</h2>
        {dispute.task.messages.length === 0 ? (
          <p className="text-gray-500 text-sm">Сообщений нет</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto p-2 bg-gray-950 rounded-lg">
            {dispute.task.messages.map((m) => (
              <div key={m.id} className="border-b border-gray-800 pb-2">
                <p className="text-sm text-gray-400">
                  <span className="font-semibold text-gray-200">
                    {m.sender.fullName || m.sender.email}
                  </span>{" "}
                  <span className="text-xs text-gray-500">
                    ({m.sender.role})
                  </span>
                </p>
                <p className="text-gray-300 mt-1">{m.content}</p>
                <p className="text-xs text-gray-600">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Решение */}
      <form
        action={async (formData) => {
          "use server";
          const status = formData.get("status") as string;
          const resolution = formData.get("resolution") as string;
          await prisma.dispute.update({
            where: { id: dispute.id },
            data: { status, resolution, resolvedAt: new Date() },
          });
        }}
        className="bg-gray-900 p-4 rounded-lg border border-gray-800"
      >
        <h2 className="text-lg font-semibold mb-3">Решение спора</h2>

        <textarea
          name="resolution"
          placeholder="Комментарий по решению..."
          className="w-full p-2 rounded bg-gray-800 text-gray-100 border border-gray-700 mb-3"
          rows={3}
        />

        <div className="flex gap-2">
          <button
            name="status"
            value="resolved"
            className="px-3 py-1 bg-green-700 rounded hover:bg-green-800"
          >
            Одобрить
          </button>
          <button
            name="status"
            value="rejected"
            className="px-3 py-1 bg-red-700 rounded hover:bg-red-800"
          >
            Отклонить
          </button>
        </div>
      </form>
    </div>
  );
}
