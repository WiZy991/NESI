"use client";

import { useEffect, useState } from "react";

export default function FinancePage() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch(`/api/admin/finance${filter !== "all" ? `?type=${filter}` : ""}`)
      .then((res) => res.json())
      .then(setTransactions);
  }, [filter]);

  async function changeStatus(id, status) {
    await fetch(`/api/admin/finance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Финансы</h1>

      <div className="mb-4 flex gap-2">
        {["all", "deposit", "withdraw", "escrow", "payout"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded ${
              filter === type ? "bg-green-600" : "bg-gray-800"
            }`}
          >
            {type === "all" ? "Все" : type}
          </button>
        ))}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-green-900/30">
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Пользователь</th>
            <th className="p-2 text-left">Сумма</th>
            <th className="p-2 text-left">Тип</th>
            <th className="p-2 text-left">Статус</th>
            <th className="p-2 text-left">Дата</th>
            <th className="p-2 text-left">Действия</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b border-gray-700">
              <td className="p-2">{t.id.slice(0, 8)}...</td>
              <td className="p-2">{t.user?.email || "—"}</td>
              <td className="p-2">{t.amount} ₽</td>
              <td className="p-2 capitalize">{t.type}</td>
              <td className="p-2">{t.status}</td>
              <td className="p-2">
                {new Date(t.createdAt).toLocaleDateString()}
              </td>
              <td className="p-2 flex gap-2">
                {["approved", "rejected"].map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(t.id, s)}
                    className={`px-2 py-1 rounded ${
                      s === "approved" ? "bg-green-700" : "bg-red-700"
                    }`}
                  >
                    {s === "approved" ? "Одобрить" : "Отклонить"}
                  </button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
