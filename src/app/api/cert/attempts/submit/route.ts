import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { awardXP } from '@/lib/level/awardXP'

type Answer = { questionId: string; optionId: string }

export async function POST(req: Request) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

		const { attemptId, answers, correctAnswers } = (await req.json()) as {
			attemptId: string
			answers: Answer[]
			correctAnswers?: Record<string, string>
		}
		if (!attemptId || !Array.isArray(answers) || answers.length === 0) {
			return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
		}
		if (!correctAnswers || typeof correctAnswers !== 'object') {
			return NextResponse.json({ error: 'Не переданы правильные ответы' }, { status: 400 })
		}

		const attempt = await prisma.certificationAttempt.findUnique({
			where: { id: attemptId },
			include: {
				test: {
					include: {
						subcategory: true,
					},
				},
			},
		})
		if (!attempt || attempt.userId !== user.id) {
			return NextResponse.json({ error: 'Попытка не найдена' }, { status: 404 })
		}
		if (attempt.finishedAt) {
			return NextResponse.json({ error: 'Попытка уже завершена' }, { status: 400 })
		}

		const test = await prisma.certificationTest.findUnique({
			where: { id: attempt.testId },
			include: { subcategory: true },
		})
		if (!test) return NextResponse.json({ error: 'Тест не найден' }, { status: 404 })

		const deadline = new Date(attempt.startedAt.getTime() + test.timeLimitSec * 1000)
		const outOfTime = new Date() > deadline

		let correct = 0
		const total = answers.length

		for (const a of answers) {
			if (correctAnswers[a.questionId] === a.optionId) {
				correct++
			}
		}

		const score = Math.round((correct / total) * 100)
		const passed = !outOfTime && score >= test.passScore

		await prisma.certificationAttempt.update({
			where: { id: attempt.id },
			data: { finishedAt: new Date(), score, passed },
		})

		if (passed) {
			await prisma.userCertification.upsert({
				where: {
					userId_subcategoryId: { userId: user.id, subcategoryId: test.subcategoryId },
				},
				create: {
					userId: user.id,
					subcategoryId: test.subcategoryId,
					level: 'CERTIFIED',
				},
				update: {},
			})

			try {
				const subcategory = await prisma.subcategory.findUnique({
					where: { id: test.subcategoryId },
					select: { name: true },
				})

				await awardXP(
					user.id,
					10,
					`Пройдена сертификация "${subcategory?.name || 'неизвестная категория'}"`
				)

				const { checkAndAwardBadges } = await import('@/lib/badges/checkBadges')
				await checkAndAwardBadges(user.id)
			} catch (xpError) {
				console.error('[XP] Ошибка начисления XP при сертификации:', xpError)
			}
		}

		return NextResponse.json({
			score,
			passed,
			outOfTime,
			passScore: test.passScore,
		})
	} catch (e) {
		console.error('POST /api/cert/attempts/submit error:', e)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
