import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarFileId: true, // ⚡ новое поле
        skills: true,
        location: true,
        description: true,
        reviewsReceived: { select: { rating: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // если есть avatarFileId → строим ссылку
    const avatarUrl = user.avatarFileId
      ? `/api/files/${user.avatarFileId}`
      : null;

    return NextResponse.json({ user: { ...user, avatarUrl } });
  } catch (error) {
    console.error("Ошибка получения пользователя:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
