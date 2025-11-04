import { getUserFromRequest } from '@/lib/auth'
import { toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

export async function POST(
	req: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const user = await getUserFromRequest(req)
		if (!user)
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		const task = await prisma.task.findUnique({
			where: { id: params.id },
			include: { customer: true, executor: true },
		})

		if (!task)
			return NextResponse.json({ error: 'Task not found' }, { status: 404 })

		if (task.customerId !== user.id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const validStatuses = ['in_progress', 'in progress', 'in-progress']
		if (!task.executorId || !validStatuses.includes(task.status)) {
			return NextResponse.json(
				{ error: `Task is not in progress (actual status = "${task.status}")` },
				{ status: 400 }
			)
		}

		const escrowNum = toNumber(task.escrowAmount)
		if (escrowNum > 0) {
			const escrowDecimal = new Prisma.Decimal(escrowNum)

			await prisma.$transaction([
				prisma.user.update({
					where: { id: task.customerId },
					data: {
						frozenBalance: { decrement: escrowDecimal },
					},
				}),
				prisma.transaction.create({
					data: {
						userId: task.customerId,
						amount: new Prisma.Decimal(0),
						type: 'refund',
						reason: `Разморозка средств за отмену задачи "${task.title}"`,
					},
				}),
			])
		}

		await prisma.task.update({
			where: { id: params.id },
			data: {
				executorId: null,
				status: 'open',
				escrowAmount: new Prisma.Decimal(0),
			},
		})

		if (task.executorId) {
			await prisma.notification.create({
				data: {
					userId: task.executorId,
					type: 'task_cancelled',
					message: `Заказчик отменил задачу: ${task.title}`,
					link: `/tasks/${task.id}`,
				},
			})
		}

		return NextResponse.json({ success: true })
	} catch (err: any) {
		console.error('Cancel error:', err)
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 }
		)
	}
}
