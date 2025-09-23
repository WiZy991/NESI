import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Некорректный файл" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Сохраняем в БД
    const savedFile = await prisma.file.create({
      data: {
        id: randomUUID(),
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        data: buffer, // ⚠️ хранение бинаря в БД (MVP)
      },
    });

    return NextResponse.json({ id: savedFile.id });
  } catch (err) {
    console.error("Ошибка загрузки файла:", err);
    return NextResponse.json({ error: "Ошибка загрузки файла" }, { status: 500 });
  }
}
