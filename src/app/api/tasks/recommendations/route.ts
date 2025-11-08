import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getTaskRecommendations } from '@/lib/taskReco'

export async function GET(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		const url = new URL(req.url)
		const limitParam = url.searchParams.get('limit')
		const refresh = url.searchParams.get('refresh') === 'true'

		const limit = limitParam ? parseInt(limitParam, 10) : undefined
		const recommendations = await getTaskRecommendations(user.id, {
			limit,
			refresh,
		})

		return NextResponse.json({ recommendations })
	} catch (error: any) {
		console.error('❌ Ошибка получения рекомендаций задач:', error)
		return NextResponse.json(
			{
				error: 'Не удалось получить рекомендации',
				details: error?.message ?? String(error),
			},
			{ status: 500 }
		)
	}
}

