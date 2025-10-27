import { getUserFromRequest } from '@/lib/auth'
import { toNumber } from '@/lib/money'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
	const user = await getUserFromRequest(req)
	if (!user)
		return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

	const fresh = await prisma.user.findUnique({
		where: { id: user.id },
		select: { balance: true, frozenBalance: true },
	})

	return NextResponse.json({
		balance: toNumber(fresh?.balance ?? 0),
		frozenBalance: toNumber(fresh?.frozenBalance ?? 0),
		availableBalance:
			toNumber(fresh?.balance ?? 0) - toNumber(fresh?.frozenBalance ?? 0),
	})
}
