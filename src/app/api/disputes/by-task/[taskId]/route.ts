import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function GET(
	req: Request,
	{ params }: { params: { taskId: string } }
) {
	try {
		const JWT_SECRET = process.env.JWT_SECRET
		if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined')

		const authHeader = req.headers.get('authorization')
		if (!authHeader) {
			return NextResponse.json({ error: 'Нет токена' }, { status: 401 })
		}

		const token = authHeader.replace('Bearer ', '').trim()
		let decoded: any

		try {
			decoded = jwt.verify(token, JWT_SECRET)
		} catch {
			return NextResponse.json(
				{ error: 'Недействительный токен' },
				{ status: 403 }
			)
		}

		const { taskId } = params

		const dispute = await (prisma as any).dispute.findFirst({
			where: { taskId },
			include: {
				User: {
					select: { id: true, fullName: true, email: true, role: true },
				},
			},
		})

		if (!dispute) {
			return NextResponse.json({ exists: false })
		}

		return NextResponse.json({
			exists: true,
			dispute,
		})
	} catch (error) {
		console.error('Ошибка получения спора:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
