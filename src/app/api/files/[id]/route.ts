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

    // Если бинарь хранится в базе
    if (file.data) {
      return new NextResponse(file.data, {
        headers: {
          "Content-Type": file.mimetype,
          "Content-Disposition": `inline; filename="${file.filename}"`,
        },
      });
    }

    // Если файл хранится только по ссылке (например, старые через url)
    if (file.url) {
      return NextResponse.redirect(file.url);
    }

    return new NextResponse("Файл пуст", { status: 404 });
  } catch (err) {
    console.error("Ошибка при выдаче файла:", err);
    return new NextResponse("Ошибка сервера", { status: 500 });
  }
}
