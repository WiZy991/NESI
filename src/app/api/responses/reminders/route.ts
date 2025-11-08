import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { TASK_RESPONSE_STATUSES, appendTaskResponseHistory } from '@/lib/taskResponseStatus'
import { createNotificationWithSettings } from '@/lib/notify'

const AUTO_REMINDER_NOTE = 'AUTO_REMINDER'
const REMINDER_INTERVAL_HOURS = 24
const STALE_THRESHOLD_HOURS = 48

function hoursAgo(hours: number) {
	const now = new Date()
	return new Date(now.getTime() - hours * 60 * 60 * 1000)
}

function verifyCronKey(request: NextRequest) {
	const expected = process.env.CRON_SECRET
	if (!expected) {
		return true
	}
	const provided = request.headers.get('x-cron-key')
	return provided === expected
}

export async function POST(req: NextRequest) {
	if (!verifyCronKey(req)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const staleBefore = hoursAgo(STALE_THRESHOLD_HOURS)
	const cooldownBefore = hoursAgo(REMINDER_INTERVAL_HOURS)

	try {
		const candidates = await prisma.taskResponse.findMany({
			where: {
				status: {
					in: ['pending', 'viewed'],
				},
				updatedAt: {
					lte: staleBefore,
				},
			},
			include: {
				task: {
					select: {
						id: true,
						title: true,
						customerId: true,
					},
				},
				user: {
					select: {
						id: true,
						fullName: true,
					},
				},
				statusHistory: {
					where: {
						note: AUTO_REMINDER_NOTE,
					},
					orderBy: { createdAt: 'desc' },
					take: 1,
				},
			},
		})

		const reminders = candidates.filter((response) => {
			const lastReminder = response.statusHistory[0]
			if (!lastReminder) return true
			return new Date(lastReminder.createdAt) <= cooldownBefore
		})

		let reminderCount = 0

		for (const response of reminders) {
			const { task, user, status } = response
			if (!task || !user) {
				continue
			}

			const taskLink = `/tasks/${task.id}`
			const statusLabel =
				status === 'pending'
					? 'ожидает ответа'
					: status === 'viewed'
					? 'просмотрен заказчиком'
					: status

			const executorMessage = `Напоминаем: ваш отклик по задаче «${task.title}» всё ещё ${statusLabel}.`
			await createNotificationWithSettings({
				userId: user.id,
				message: executorMessage,
				link: taskLink,
				type: 'response',
			})

			if (task.customerId && task.customerId !== user.id) {
				const customerMessage = `Напоминание: ответьте на отклик по задаче «${task.title}». Исполнитель ждет обратной связи.`
				await createNotificationWithSettings({
					userId: task.customerId,
					message: customerMessage,
					link: taskLink,
					type: 'task',
				})
			}

			await appendTaskResponseHistory(response.id, status as (typeof TASK_RESPONSE_STATUSES)[number], {
				note: AUTO_REMINDER_NOTE,
			})

			await prisma.taskResponse.update({
				where: { id: response.id },
				data: {
					updatedAt: new Date(),
				},
			})

			reminderCount += 1
		}

		return NextResponse.json({
			ok: true,
			checked: candidates.length,
			sent: reminderCount,
		})
	} catch (error) {
		console.error('Ошибка при отправке напоминаний по откликам:', error)
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
	}
}

