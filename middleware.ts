import { verifyJWT } from '@/lib/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl

	// Публичные маршруты
	const publicRoutes = [
		'/',
		'/login',
		'/register',
		'/forgot-password',
		'/reset-password',
		'/favicon.ico',
	]

	// Разрешаем доступ к Next.js статикам и некоторым API
	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/images') ||
		pathname.startsWith('/api/auth') ||
		pathname.startsWith('/api/files') ||
		pathname.startsWith('/api/categories')
	) {
		return NextResponse.next()
	}

	// Подготавливаем базовый ответ с безопасными заголовками
	const response = NextResponse.next()
	response.headers.set('X-Frame-Options', 'DENY')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
	response.headers.set('X-XSS-Protection', '1; mode=block')

	// Кеширование статики
	if (pathname.startsWith('/_next/static/') || pathname.startsWith('/api/files/')) {
		response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
	}

	//Получаем токен
	let token = ''
	const authHeader = req.headers.get('authorization')
	if (authHeader?.startsWith('Bearer ')) {
		token = authHeader.split(' ')[1]
	} else if (req.cookies.has('token')) {
		token = req.cookies.get('token')?.value || ''
	}

	//Если пользователь уже авторизован и идёт на /login или /register → редирект на /tasks
	if (token && (pathname === '/login' || pathname === '/register')) {
		try {
			verifyJWT(token)
			const redirectUrl = req.nextUrl.clone()
			redirectUrl.pathname = '/tasks'
			return NextResponse.redirect(redirectUrl)
		} catch (error) {
			// Невалидный токен → очищаем cookie
			response.cookies.delete('token')
			return response
		}
	}

	// Если пользователь не авторизован и идёт НЕ на публичные маршруты → редиректим на /login
	const isPublic = publicRoutes.some(route => pathname.startsWith(route))

	if (!token && !isPublic) {
		if (pathname.startsWith('/api/')) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}
		const loginUrl = req.nextUrl.clone()
		loginUrl.pathname = '/login'
		return NextResponse.redirect(loginUrl)
	}

	//Проверяем токен на защищённых маршрутах
	if (token) {
		try {
			verifyJWT(token)
		} catch (error) {
			// Невалидный токен — очищаем и редиректим
			response.cookies.delete('token')
			const loginUrl = req.nextUrl.clone()
			loginUrl.pathname = '/login'
			return NextResponse.redirect(loginUrl)
		}
	}

	return response
}

// Применяем middleware ко всем путям, кроме статики
export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
