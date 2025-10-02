import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: { customer: true, executor: true },
    });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (task.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    
    const validStatuses = ["in_progress", "in progress", "in-progress"];
    if (!task.executorId || !validStatuses.includes(task.status)) {
      return NextResponse.json(
        { error: `Task is not in progress (actual status = "${task.status}")` },
        { status: 400 }
      );
    }

    
    if (task.escrowAmount > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: task.customerId },
          data: {
            balance: { increment: task.escrowAmount },
            frozenBalance: { decrement: task.escrowAmount },
          },
        }),
        prisma.transaction.create({
          data: {
            userId: task.customerId,
            amount: task.escrowAmount,
            type: "refund",
            reason: `Возврат средств за отмену задачи "${task.title}"`,
          },
        }),
      ]);
    }

    
    await prisma.task.update({
      where: { id: params.id },
      data: {
        executorId: null,
        status: "open",
        escrowAmount: 0,
      },
    });

    
    if (task.executorId) {
      await prisma.notification.create({
        data: {
          userId: task.executorId,
          type: "task_cancelled",
          message: `Заказчик отменил задачу: ${task.title}`,
          link: `/tasks/${task.id}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Cancel error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
