"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function CancelExecutorButton({
  taskId,
}: {
  taskId: string;
}) {
  const router = useRouter();
  const { token } = useUser();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    if (!token) {
      setErr("Нет авторизации");
      return;
    }
    if (!confirm("Отменить исполнителя и вернуть средства?")) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`);

      router.refresh(); 

    } catch (e: any) {
      setErr(e.message || "Не удалось отменить");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60"
      >
        {loading ? "Отмена..." : "Отменить исполнителя"}
      </button>
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
    </div>
  );
}
