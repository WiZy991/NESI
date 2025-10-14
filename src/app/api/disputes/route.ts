import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

//Получить споры пользователя
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const disputes = await prisma.dispute.findMany({
    where: { userId: user.id },
    include: { task: { select: { id: true, title: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ disputes });
}

//Создать спор по задаче
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { taskId, reason, details } = await req.json();

  if (!taskId || !reason) {
    return NextResponse.json({ error: "Не хватает данных" }, { status: 400 });
  }

  // Проверяем, что пользователь связан с задачей
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      OR: [{ customerId: user.id }, { executorId: user.id }],
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Нет доступа к задаче" }, { status: 403 });
  }

  const dispute = await prisma.dispute.create({
    data: {
      taskId,
      userId: user.id,
      reason,
      details,
      status: "open",
    },
  });

  return NextResponse.json({ dispute });
}
