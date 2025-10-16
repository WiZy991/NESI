import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
	const admin = await getUserFromRequest(req)
	if (!admin || admin.role !== 'admin') {
		return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
	}

	const disputes = await (prisma as any).dispute.findMany({
		orderBy: { createdAt: 'desc' },
		include: {
			Task: {
				select: { id: true, title: true, status: true },
			},
			User: {
				select: { id: true, fullName: true, email: true },
			},
		},
	})

	return NextResponse.json({ disputes })
}

export async function PATCH(req: Request) {
	const admin = await getUserFromRequest(req)
	if (!admin || admin.role !== 'admin') {
		return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
	}

	const { id, status, resolution } = await req.json()

	if (!id || !status) {
		return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
	}

	const updated = await (prisma as any).dispute.update({
		where: { id },
		data: {
			status,
			resolution,
			resolvedAt: new Date(),
		},
	})

	return NextResponse.json({ dispute: updated })
}

export async function POST(req: Request) {
	const admin = await getUserFromRequest(req)
	if (!admin || admin.role !== 'admin') {
		return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
	}

	const { taskId, userId, reason, details } = await req.json()

	if (!taskId || !userId || !reason) {
		return NextResponse.json({ error: 'Не хватает данных' }, { status: 400 })
	}

	const dispute = await (prisma as any).dispute.create({
		data: {
			taskId,
			userId,
			reason,
			details,
		},
	})

	return NextResponse.json({ dispute })
}
