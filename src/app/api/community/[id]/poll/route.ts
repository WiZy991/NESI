import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { fetchSinglePoll } from '@/lib/communityPoll'

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const user = await getUserFromRequest(req).catch(() => null)

		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const post = await prisma.communityPost.findUnique({
			where: { id },
			select: { id: true, isDeleted: true, isPoll: true },
		})

		if (!post || post.isDeleted || !post.isPoll) {
			return NextResponse.json({ error: 'Опрос не найден' }, { status: 404 })
		}

		const body = await req.json().catch(() => ({}))
		const optionId = typeof body?.optionId === 'string' ? body.optionId : ''

		if (!optionId) {
			return NextResponse.json({ error: 'Не передан вариант ответа' }, { status: 400 })
		}

		const option = await prisma.communityPollOption.findUnique({
			where: { id: optionId },
			select: { id: true, postId: true },
		})

		if (!option || option.postId !== id) {
			return NextResponse.json({ error: 'Вариант ответа не принадлежит этому опросу' }, { status: 400 })
		}

		const existingVote = await prisma.communityPollVote.findFirst({
			where: {
				userId: user.id,
				option: {
					postId: id,
				},
			},
			select: { id: true, optionId: true },
		})

		if (existingVote?.optionId === optionId) {
			const poll = await fetchSinglePoll(id, user.id)
			return NextResponse.json({ ok: true, poll })
		}

		await prisma.$transaction(async tx => {
			if (existingVote) {
				await tx.communityPollVote.delete({
					where: { id: existingVote.id },
				})
			}

			await tx.communityPollVote.create({
				data: {
					optionId,
					userId: user.id,
				},
			})
		})

		const poll = await fetchSinglePoll(id, user.id)

		return NextResponse.json({ ok: true, poll })
	} catch (err: any) {
		console.error('Ошибка голосования в опросе:', {
			message: err?.message,
			code: err?.code,
			stack: err?.stack,
		})
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

