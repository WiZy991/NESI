import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      reviewsReceived: {
        include: {
          fromUser: true,
          task: true,
        },
      },
      avatarFile: true, // 👈 подтягиваем аватар
    },
  });

  // Если есть avatarFileId — добавляем ссылку на API
  const avatarUrl = fullUser?.avatarFileId
    ? `/api/files/${fullUser.avatarFileId}`
    : null;

  return NextResponse.json({ user: { ...fullUser, avatarUrl } });
}

export async function PATCH(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") || "";
    let dataToUpdate: any = {};

    if (contentType.includes("multipart/form-data")) {
      // === multipart/form-data ===
      const formData = await req.formData();

      const fullName = formData.get("fullName") as string;
      const role = formData.get("role") as string;
      const password = formData.get("password") as string | null;
      const description = formData.get("description") as string | null;
      const location = formData.get("location") as string | null;
      const skills = formData.get("skills") as string | null;
      const avatar = formData.get("avatar") as File | null;

      if (!fullName || !role) {
        return NextResponse.json({ error: "Имя и роль обязательны" }, { status: 400 });
      }

      dataToUpdate = { fullName, role, description, location };

      if (skills) {
        dataToUpdate.skills = skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      if (password && password.length > 0) {
        const hashed = await bcrypt.hash(password, 10);
        dataToUpdate.password = hashed;
      }

      if (avatar && avatar.size > 0) {
        const bytes = Buffer.from(await avatar.arrayBuffer());

        // сохраняем в File
        const savedFile = await prisma.file.create({
          data: {
            id: randomUUID(),
            filename: avatar.name,
            mimetype: avatar.type,
            size: avatar.size,
            data: bytes,
          },
        });

        dataToUpdate.avatarFileId = savedFile.id;
      }
    } else {
      // === JSON ===
      const body = await req.json();
      const { fullName, role, password, description, location, skills } = body;

      if (!fullName || !role) {
        return NextResponse.json({ error: "Имя и роль обязательны" }, { status: 400 });
      }

      dataToUpdate = { fullName, role, description, location };

      if (skills) {
        dataToUpdate.skills = Array.isArray(skills)
          ? skills
          : (skills as string).split(",").map((s) => s.trim()).filter(Boolean);
      }

      if (password && password.length > 0) {
        const hashed = await bcrypt.hash(password, 10);
        dataToUpdate.password = hashed;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      include: { avatarFile: true },
    });

    const avatarUrl = updatedUser.avatarFileId
      ? `/api/files/${updatedUser.avatarFileId}`
      : null;

    return NextResponse.json({ user: { ...updatedUser, avatarUrl } });
  } catch (err: any) {
    console.error("❌ Ошибка обновления профиля:", err);
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 });
  }
}
