import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
	try {
		const admin = await getUserFromRequest(req)

		if (!admin || String(admin.role) !== 'admin') {
			return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
		}

		const { searchParams } = new URL(req.url)
		const role = searchParams.get('role')

		if (!role || (role !== 'executor' && role !== 'customer')) {
			return NextResponse.json({ error: 'Неверная роль' }, { status: 400 })
		}

		const count = await prisma.user.count({
			where: {
				role: role,
				blocked: false,
			},
		})

		return NextResponse.json({ count })
	} catch (error) {
		console.error('Ошибка при получении количества пользователей:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}

