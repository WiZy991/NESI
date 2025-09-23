import { prisma } from "@/lib/prisma";
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
      return new NextResponse("Файл не найден", { status: 404 });
    }

    // Если бинарь хранится в базе (Buffer)
    if (file.data) {
      const uint8 = new Uint8Array(file.data as Buffer); // ✅ преобразуем
      return new NextResponse(uint8, {
        headers: {
          "Content-Type": file.mimetype || "application/octet-stream",
          // inline → браузер попробует показать (картинки/pdf)
          // attachment → скачивание
          "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
        },
      });
    }

    // Если файл хранится по внешней ссылке
    if (file.url) {
      return NextResponse.redirect(file.url);
    }

    return new NextResponse("Файл пуст", { status: 404 });
  } catch (err) {
    console.error("Ошибка при выдаче файла:", err);
    return new NextResponse("Ошибка сервера", { status: 500 });
  }
}
