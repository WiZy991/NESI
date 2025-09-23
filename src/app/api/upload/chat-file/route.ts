import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "png",
  "jpg",
  "jpeg",
  "gif",
];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Недопустимый тип файла" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Файл слишком большой (макс 10МБ)" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Сохраняем в таблицу File
    const saved = await prisma.file.create({
      data: {
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        data: buffer,
      },
    });

    return NextResponse.json({
      id: saved.id,
      url: `/api/files/${saved.id}`,
    });
  } catch (err) {
    console.error("❌ Ошибка загрузки файла:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
