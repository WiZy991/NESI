import { broadcastOnlineCountUpdate } from '@/app/api/users/activity/stream/route'
import { checkUserBlocked, logActivity } from '@/lib/antifraud'
import { verifyPassword } from '@/lib/auth'
import { signJWT } from '@/lib/jwt'
import prisma from '@/lib/prisma'
import { rateLimit, rateLimitConfigs } from '@/lib/rateLimit'
import { setSecureCookie } from '@/lib/security'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
	try {
		const authRateLimit = rateLimit(rateLimitConfigs.auth)
		const rateLimitResult = await authRateLimit(req)

		if (!rateLimitResult.success) {
			return NextResponse.json(
				{ error: 'Слишком много попыток входа. Попробуйте позже.' },
				{
					status: 429,
					headers: {
						'Retry-After': Math.ceil(
							(rateLimitResult.resetTime - Date.now()) / 15
						).toString(),
						'X-RateLimit-Limit': '10',
						'X-RateLimit-Remaining': '0',
						'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
					},
				}
			)
		}

		const { email, password } = await req.json()
		const user = await prisma.user.findUnique({ where: { email } })

		// ❌ Нет пользователя или неверный пароль
		if (!user || !(await verifyPassword(password, user.password))) {
			return NextResponse.json(
				{ error: 'Неверный логин или пароль' },
				{ status: 401 }
			)
		}

		// 🚫 Проверяем подтверждение почты (через verified)
		if (!user.verified) {
			return NextResponse.json(
				{
					error:
						'Ваш e-mail ещё не подтверждён. Проверьте почту и перейдите по ссылке из письма, чтобы активировать аккаунт.',
				},
				{ status: 403 }
			)
		}

		// 🔒 Проверяем блокировку пользователя
		const blockStatus = await checkUserBlocked(user.id)
		if (blockStatus.isBlocked) {
			const message = blockStatus.until
				? `Ваш аккаунт заблокирован до ${blockStatus.until.toLocaleString(
						'ru-RU'
				  )}. ${blockStatus.reason || ''}`
				: `Ваш аккаунт заблокирован. ${
						blockStatus.reason || 'Обратитесь к администратору.'
				  }`

			// Логируем попытку входа заблокированного юзера
			await logActivity(user.id, 'login_blocked', req, {
				reason: blockStatus.reason,
			})

			return NextResponse.json({ error: message }, { status: 403 })
		}

		// ✅ Всё ок — создаём токен
		const token = signJWT({ userId: user.id, role: user.role })

		// 📊 Логируем успешный вход
		await logActivity(user.id, 'login_success', req)

		// 🔄 Обновляем время последней активности при входе
		await prisma.user.update({
			where: { id: user.id },
			data: { lastActivityAt: new Date() },
		})

		// 📢 Broadcast обновление онлайн счетчика всем подключенным клиентам
		broadcastOnlineCountUpdate().catch(err => {
			console.error('Ошибка broadcast при входе:', err)
		})

		// 📨 Уведомление о входе убрано по запросу

		const response = NextResponse.json({
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
			},
			token,
		})

		// 🍪 Устанавливаем безопасный cookie
		response.cookies.set('token', token, setSecureCookie(token))

		return response
	} catch (error) {
		console.error('Login error:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера: ' + (error as Error).message },
			{ status: 500 }
		)
	}
}
