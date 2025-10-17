import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(
	req: Request,
	{ params }: { params: { id: string } }
) {
	const admin = await getUserFromRequest(req)
	if (!admin || admin.role !== 'admin') {
		return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
	}

	const { id } = params
	const { decision, comment } = await req.json()

	if (!['customer', 'executor'].includes(decision)) {
		return NextResponse.json({ error: 'Неверное решение' }, { status: 400 })
	}

	const dispute = await (prisma as any).dispute.findUnique({
		where: { id },
		include: { Task: true },
	})
	if (!dispute) {
		return NextResponse.json({ error: 'Спор не найден' }, { status: 404 })
	}

	// Обновляем статус спора
	const updated = await (prisma as any).dispute.update({
		where: { id },
		data: {
			status: 'resolved',
			resolution: comment || null,
			resolvedAt: new Date(),
			adminDecision: decision, // ← добавь это поле в модель dispute (String)
		},
	})

	// ⚙️ Дополнительная логика (на будущее):
	// если админ поддержал заказчика → задачу можно отменить
	// если админ поддержал исполнителя → задачу можно завершить
	if (decision === 'customer') {
		await (prisma as any).task.update({
			where: { id: dispute.taskId },
			data: { status: 'cancelled' },
		})
	} else if (decision === 'executor') {
		await (prisma as any).task.update({
			where: { id: dispute.taskId },
			data: { status: 'completed' },
		})
	}

	return NextResponse.json({ success: true, dispute: updated })
}
