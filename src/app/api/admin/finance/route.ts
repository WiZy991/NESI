import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — получить все транзакции
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  
  const where = type ? { type } : {};

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      user: {
        select: { email: true, fullName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, status } = body;

  const updated = await prisma.transaction.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
