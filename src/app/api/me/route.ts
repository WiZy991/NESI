// /api/me/route.ts
import { getUserFromRequest, getTokenFromRequest } from '@/lib/auth'
import { verifyJWT } from '@/lib/jwt'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
	const user = await getUserFromRequest(req)

	if (!user) {
		// Проверяем, может пользователь заблокирован
		const token = getTokenFromRequest(req)
		if (token) {
			try {
				const payload = verifyJWT(token)
				if (payload?.userId) {
					const blockedUser = await prisma.user.findUnique({
						where: { id: payload.userId },
						select: { blocked: true, email: true },
					})
					
					if (blockedUser && blockedUser.blocked) {
						return NextResponse.json({
							error: 'Ваш аккаунт заблокирован',
							blocked: true,
							reason: 'Нарушение правил платформы',
						}, { status: 403 })
					}
				}
			} catch (e) {}
		}
		
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
	}

	return NextResponse.json({ user })
}
