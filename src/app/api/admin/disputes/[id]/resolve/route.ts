import { sendNotificationToUser } from '@/app/api/notifications/stream/route'
import { getUserFromRequest } from '@/lib/auth'
import {
	dispatchDisputeNotifications,
	resolveDisputeWithFinancials,
} from '@/lib/disputes/resolveDispute'
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

	try {
		const { dispute, notifications } = await resolveDisputeWithFinancials({
			disputeId: id,
			decision: decision as 'customer' | 'executor',
			comment,
		})

		await dispatchDisputeNotifications(notifications)

		return NextResponse.json({ success: true, dispute })
	} catch (error: any) {
		if (error?.message === 'DISPUTE_NOT_FOUND') {
			return NextResponse.json({ error: 'Спор не найден' }, { status: 404 })
		}
		if (error?.message === 'TASK_NOT_FOUND') {
			return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
		}

		console.error('Ошибка при разрешении спора админом:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}