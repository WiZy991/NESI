import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // В Next.js 15+ params - это промис, нужно await'ить
    const { id } = await params;
    
    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }

    // Проверяем, является ли файл аватаром - если да, то доступен публично
    const asAvatar = await prisma.user.findFirst({
      where: {
        avatarFileId: id,
      },
    });

    if (asAvatar) {
      // Аватары доступны публично - возвращаем сразу
      if (file.data) {
        return new NextResponse(file.data as Buffer, {
          headers: {
            "Content-Type": file.mimetype || "image/png",
            "Cache-Control": "public, max-age=31536000", // Кешируем на год
          },
        });
      }
      if (file.url) {
        return NextResponse.redirect(file.url);
      }
      return NextResponse.json({ error: "Файл пуст" }, { status: 404 });
    }

    // Сначала проверяем, является ли файл частью публичного контента (посты/комментарии сообщества)
    // Эти файлы доступны всем без авторизации
    const [inCommunityPost, inCommunityComment] = await Promise.all([
      prisma.communityPost.findFirst({
        where: {
          OR: [
            { imageUrl: { contains: id } },
            { imageUrl: { contains: `/api/files/${id}` } },
          ],
          isDeleted: false,
        },
        select: { id: true },
      }),
      prisma.communityComment.findFirst({
        where: {
          OR: [
            { imageUrl: { contains: id } },
            { imageUrl: { contains: `/api/files/${id}` } },
          ],
        },
        select: { id: true },
      }),
    ]);

    // Если файл из поста или комментария сообщества - доступен публично
    if (inCommunityPost || inCommunityComment) {
      if (file.data) {
        const buffer = file.data as Buffer
        const isVideo = file.mimetype?.startsWith('video/')
        
        // Поддержка Range requests для видео (необходимо для потоковой загрузки)
        const range = req.headers.get('range')
        if (isVideo && range) {
          const parts = range.replace(/bytes=/, "").split("-")
          const start = parseInt(parts[0], 10)
          const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1
          const chunksize = (end - start) + 1
          const chunk = buffer.slice(start, end + 1)
          
          return new NextResponse(chunk, {
            status: 206, // Partial Content
            headers: {
              "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
              "Accept-Ranges": "bytes",
              "Content-Length": chunksize.toString(),
              "Content-Type": file.mimetype || "application/octet-stream",
              "Cache-Control": "public, max-age=31536000",
            },
          })
        }
        
        // Для изображений и видео без range request - возвращаем весь файл
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": file.mimetype || "application/octet-stream",
            "Content-Length": buffer.length.toString(),
            "Accept-Ranges": "bytes", // Поддержка range requests
            "Cache-Control": "public, max-age=31536000",
          },
        });
      }
      if (file.url) {
        return NextResponse.redirect(file.url);
      }
      return NextResponse.json({ error: "Файл пуст" }, { status: 404 });
    }

    // Для остальных файлов требуется авторизация
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    // Проверка прав доступа: файл должен быть связан с сообщением, задачей или пользователем
    // Выполняем проверки параллельно для оптимизации производительности
    const [
      inTaskMessage,
      inPrivateMessage,
      inTask,
      inPortfolio,
    ] = await Promise.all([
      // Файл в сообщениях задач - проверяем через fileId и fileUrl
      prisma.message.findFirst({
        where: {
          OR: [
            { fileId: id },
            { fileUrl: { contains: id } },
            { fileUrl: { contains: `/api/files/${id}` } },
          ],
        },
        include: {
          task: {
            select: {
              customerId: true,
              executorId: true,
            },
          },
        },
      }),
      // Файл в приватных сообщениях - проверяем через fileId и fileUrl
      prisma.privateMessage.findFirst({
        where: {
          OR: [
            { fileId: id },
            { fileUrl: { contains: id } },
            { fileUrl: { contains: `/api/files/${id}` } },
          ],
        },
        select: {
          senderId: true,
          recipientId: true,
        },
      }),
      // Файл в задачах (прикрепленные файлы)
      prisma.task.findFirst({
        where: {
          files: {
            some: { id },
          },
        },
        select: {
          customerId: true,
          executorId: true,
        },
      }),
      // Портфолио
      prisma.portfolio.findFirst({
        where: {
          imageUrl: {
            contains: id,
          },
        },
        select: {
          userId: true,
        },
      }).then(result => result ? { user: { id: result.userId } } : null),
    ]);

    // Проверяем доступ на основе найденных связей
    let hasAccess = false;

    if (inTaskMessage) {
      const task = inTaskMessage.task;
      hasAccess =
        task.customerId === user.id ||
        task.executorId === user.id ||
        user.role === "admin";
    } else if (inPrivateMessage) {
      hasAccess =
        inPrivateMessage.senderId === user.id ||
        inPrivateMessage.recipientId === user.id ||
        user.role === "admin";
    } else if (inTask) {
      // Файлы задач доступны всем авторизованным пользователям
      hasAccess = true;
    } else if (inPortfolio) {
      hasAccess = inPortfolio?.user?.id === user.id || user.role === "admin";
    } else {
      // Если файл ни с чем не связан - разрешаем только админу
      hasAccess = user.role === "admin";
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      );
    }

    // Если бинарь хранится в базе
    if (file.data) {
      const buffer = file.data as Buffer
      
      // Определяем типы файлов один раз
      const isImage = file.mimetype?.startsWith('image/')
      const isVideo = file.mimetype?.startsWith('video/')
      
      // Поддержка Range requests для видео (необходимо для потоковой загрузки)
      const range = req.headers.get('range')
      if (isVideo && range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1
        const chunksize = (end - start) + 1
        const chunk = buffer.slice(start, end + 1)
        
        return new NextResponse(chunk, {
          status: 206, // Partial Content
          headers: {
            "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize.toString(),
            "Content-Type": file.mimetype || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000",
          },
        })
      }
      
      // Проверяем, нужно ли принудительное скачивание (параметр ?download=true)
      const url = new URL(req.url)
      const forceDownload = url.searchParams.get('download') === 'true'
      const headers: Record<string, string> = {
        "Content-Type": file.mimetype || "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Accept-Ranges": "bytes", // Поддержка range requests
        "Cache-Control": "public, max-age=31536000", // Кешируем файлы
      }
      
      // Используем attachment для скачивания, если:
      // 1. Это не изображение и не видео (документы и т.д.)
      // 2. Или запрошено принудительное скачивание (параметр ?download=true)
      if ((!isImage && !isVideo) || forceDownload) {
        headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(
          file.filename
        )}`
      }
      
      return new NextResponse(buffer, { headers });
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


