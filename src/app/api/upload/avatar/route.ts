import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File;
    const userId = formData.get("userId") as string; 

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Некорректный файл" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Сохраняем файл
    const savedFile = await prisma.file.create({
      data: {
        id: randomUUID(),
        filename: file.name,
        mimetype: file.type,
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
    console.error("Ошибка загрузки файла:", err);
    return NextResponse.json({ error: "Ошибка загрузки файла" }, { status: 500 });
  }
}
