import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { validateFile } from '@/lib/fileValidation';
import { normalizeFileName, isValidFileName } from '@/lib/security';
import { getUserFromRequest } from '@/lib/auth';
import { createUserRateLimit, rateLimitConfigs } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // Проверка авторизации
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    // Rate limiting для загрузки аватара
    const uploadRateLimit = createUserRateLimit(rateLimitConfigs.upload);
    const rateLimitResult = await uploadRateLimit(req);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много загрузок. Подождите немного.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("avatar") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    // Проверка, что пользователь загружает свой аватар
    if (userId !== user.id) {
      return NextResponse.json(
        { error: "Недостаточно прав" },
        { status: 403 }
      );
    }

    // Проверка, что это изображение
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Только изображения" }, { status: 400 });
    }

    // Защита от path traversal
    if (!isValidFileName(file.name)) {
      return NextResponse.json(
        { error: "Недопустимое имя файла" },
        { status: 400 }
      );
    }

    // Нормализация имени файла
    const safeFileName = normalizeFileName(file.name);

    // Полная валидация файла (magic bytes, размер, тип)
    const validation = await validateFile(file, true);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Используем определенный MIME тип из сигнатуры
    const mimeType = validation.detectedMimeType || file.type;

    // Сохраняем файл
    const savedFile = await prisma.file.create({
      data: {
        id: randomUUID(),
        filename: safeFileName,
        mimetype: mimeType,
        size: file.size,
        data: buffer,
      },
    });

    // Привязываем к пользователю
    await prisma.user.update({
      where: { id: userId },
      data: { avatarFileId: savedFile.id },
    });

    return NextResponse.json({ id: savedFile.id });
  } catch (err) {
    logger.error("Ошибка загрузки аватара", err, { userId });
    return NextResponse.json({ error: "Ошибка загрузки файла" }, { status: 500 });
  }
}
