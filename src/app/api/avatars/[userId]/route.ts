// /api/avatars/[userId]/route.ts
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
	req: NextRequest,
	{ params }: { params: { userId: string } }
) {
	try {
		const { userId } = params

		// Получаем пользователя с аватаркой
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				avatarFile: {
					select: {
						id: true,
						filename: true,
						mimetype: true,
						data: true,
					},
				},
			},
		})

		if (!user) {
			return NextResponse.json(
				{ error: 'Пользователь не найден' },
				{ status: 404 }
			)
		}

		// Если у пользователя нет аватарки
		if (!user.avatarFile || !user.avatarFile.data) {
			return NextResponse.json(
				{ error: 'Аватарка не найдена' },
				{ status: 404 }
			)
		}

		// Возвращаем аватарку как изображение
		return new NextResponse(user.avatarFile.data, {
			headers: {
				'Content-Type': user.avatarFile.mimetype,
				'Content-Length': user.avatarFile.data.length.toString(),
				'Cache-Control': 'public, max-age=31536000', // Кешируем на год
			},
		})
	} catch (error) {
		console.error('Ошибка получения аватарки:', error)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
