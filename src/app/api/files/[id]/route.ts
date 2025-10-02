import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const file = await prisma.file.findUnique({
      where: { id: params.id },
    });

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }

    // Если бинарь хранится в базе
    if (file.data) {
      return new NextResponse(file.data as Buffer, {
        headers: {
          "Content-Type": file.mimeType || "application/octet-stream", 
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
            file.name
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
