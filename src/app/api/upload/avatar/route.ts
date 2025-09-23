import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Некорректный файл" }, { status: 400 });
    }

    // Читаем бинарные данные
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Сохраняем запись в таблице File
    const saved = await prisma.file.create({
      data: {
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        data: buffer,
      },
    });

    // ⚠️ Тут нужно знать userId (например, брать из JWT/сессии)
    // Для примера я просто верну ID файла
    return NextResponse.json({
      id: saved.id,
      url: `/api/files/${saved.id}`,
    });
  } catch (err) {
    console.error("Ошибка загрузки файла:", err);
    return NextResponse.json(
      { error: "Ошибка загрузки файла" },
      { status: 500 }
    );
  }
}
