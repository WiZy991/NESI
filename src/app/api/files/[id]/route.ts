import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка авторизации
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const file = await prisma.file.findUnique({
      where: { id: params.id },
    });

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }

    // Проверка прав доступа: файл должен быть связан с сообщением, задачей или пользователем
    // Для простоты проверяем через связи в базе данных
    const hasAccess = await prisma.$transaction(async (tx) => {
      // Файл в сообщениях задач
      const inTaskMessage = await tx.message.findFirst({
        where: { fileId: params.id },
        include: {
          task: {
            select: {
              customerId: true,
              executorId: true,
            },
          },
        },
      });

      if (inTaskMessage) {
        const task = inTaskMessage.task;
        return (
          task.customerId === user.id ||
          task.executorId === user.id ||
          user.role === "admin"
        );
      }

      // Файл в приватных сообщениях
      const inPrivateMessage = await tx.privateMessage.findFirst({
        where: { fileId: params.id },
        select: {
          senderId: true,
          recipientId: true,
        },
      });

      if (inPrivateMessage) {
        return (
          inPrivateMessage.senderId === user.id ||
          inPrivateMessage.recipientId === user.id ||
          user.role === "admin"
        );
      }

      // Файл в задачах (прикрепленные файлы)
      const inTask = await tx.task.findFirst({
        where: {
          files: {
            some: { id: params.id },
          },
        },
        select: {
          customerId: true,
          executorId: true,
        },
      });

      if (inTask) {
        return (
          inTask.customerId === user.id ||
          inTask.executorId === user.id ||
          user.role === "admin"
        );
      }

      // Файл как аватар пользователя
      const asAvatar = await tx.user.findFirst({
        where: {
          avatarFileId: params.id,
        },
      });

      if (asAvatar) {
        // Свой аватар или админ
        return asAvatar.id === user.id || user.role === "admin";
      }

      // Портфолио (если есть связь)
      const inPortfolio = await tx.portfolioItem.findFirst({
        where: {
          fileId: params.id,
        },
        include: {
          user: {
            select: { id: true },
          },
        },
      });

      if (inPortfolio) {
        return (
          inPortfolio.user.id === user.id ||
          user.role === "admin"
        );
      }

      // Если файл ни с чем не связан - запрещаем доступ (или разрешаем админу)
      return user.role === "admin";
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      );
    }

    // Если бинарь хранится в базе
    if (file.data) {
      return new NextResponse(file.data as Buffer, {
        headers: {
          "Content-Type": file.mimetype || "application/octet-stream", 
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
            file.filename
          )}`, 
        },
      });
    }

    
    if (file.url) {
      return NextResponse.redirect(file.url);
    }

    return NextResponse.json({ error: "Файл пуст" }, { status: 404 });
  } catch (err) {
    console.error("Ошибка при выдаче файла:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
