import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

// 📦 Получить споры пользователя
export async function GET(req: Request) {
	const user = await getUserFromRequest(req)
	if (!user)
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	const disputes = await (prisma as any).dispute.findMany({
		where: { userId: user.id },
		include: {
			Task: {
				select: { id: true, title: true, status: true },
			},
		},
		orderBy: { createdAt: 'desc' },
	})

	return NextResponse.json({ disputes })
}

// ⚡ Создать спор по задаче
export async function POST(req: Request) {
	const user = await getUserFromRequest(req)
	if (!user)
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	const { taskId, reason, details } = await req.json()

	if (!taskId || !reason) {
		return NextResponse.json({ error: 'Не хватает данных' }, { status: 400 })
	}

	// Проверяем, связан ли пользователь с задачей
	const task = await prisma.task.findFirst({
		where: {
			id: taskId,
			OR: [{ customerId: user.id }, { executorId: user.id }],
		},
	})

	if (!task) {
		return NextResponse.json({ error: 'Нет доступа к задаче' }, { status: 403 })
	}

	// Проверяем, не существует ли уже спор по этой задаче
	const existing = await (prisma as any).dispute.findFirst({
		where: { taskId },
	})
	if (existing) {
		return NextResponse.json({ error: 'Спор уже создан' }, { status: 400 })
	}

	// Создаём новый спор
	const dispute = await (prisma as any).dispute.create({
		data: {
			id: `dispute_${taskId}_${Date.now()}`,
			taskId,
			userId: user.id,
			reason,
			details,
			status: 'open',
		},
	})

	return NextResponse.json({ dispute })
}
