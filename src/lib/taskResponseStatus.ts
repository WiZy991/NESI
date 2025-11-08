import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const TASK_RESPONSE_STATUSES = ['pending', 'viewed', 'responded', 'hired', 'rejected'] as const
export type TaskResponseStatusValue = (typeof TASK_RESPONSE_STATUSES)[number]

type Tx = Prisma.TransactionClient

type RecordOptions = {
	note?: string | null
	changedById?: string | null
	tx?: Tx
}

export async function recordTaskResponseStatus(
	responseId: string,
	status: TaskResponseStatusValue,
	options: RecordOptions = {}
) {
	const { note, changedById, tx } = options
	const client = tx ?? prisma

	await client.taskResponse.update({
		where: { id: responseId },
		data: { status } as any,
	})

	await (client as any).taskResponseStatusHistory.create({
		data: {
			responseId,
			status,
			note: note ?? null,
			changedById: changedById ?? null,
		},
	})
}

export async function appendTaskResponseHistory(
	responseId: string,
	status: TaskResponseStatusValue,
	options: RecordOptions = {}
) {
	const { note, changedById, tx } = options
	const client = tx ?? prisma

	await (client as any).taskResponseStatusHistory.create({
		data: {
			responseId,
			status,
			note: note ?? null,
			changedById: changedById ?? null,
		},
	})
}

