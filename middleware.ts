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

	// Разрешаем доступ к Next.js статикам и API файлов
	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/images') ||
		pathname.startsWith('/api/auth') ||
		pathname.startsWith('/api/files') ||
		pathname.startsWith('/api/categories')
	) {
		return NextResponse.next()
	}

	// Добавляем заголовки безопасности
	const response = NextResponse.next()

	// Security headers
	response.headers.set('X-Frame-Options', 'DENY')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
	response.headers.set('X-XSS-Protection', '1; mode=block')

	// CSP для статических ресурсов
	if (
		pathname.startsWith('/_next/static/') ||
		pathname.startsWith('/api/files/')
	) {
		response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
	}

	// Получаем токен
	let token = ''
	const authHeader = req.headers.get('authorization')
	if (authHeader && authHeader.startsWith('Bearer ')) {
		token = authHeader.split(' ')[1]
	} else if (req.cookies.has('token')) {
		token = req.cookies.get('token')?.value || ''
	}

	//Если токен есть и пользователь лезет на /login или /register — редиректим на /tasks
	if (token && (pathname === '/login' || pathname === '/register')) {
		try {
			verifyJWT(token)
			const redirectUrl = req.nextUrl.clone()
			redirectUrl.pathname = '/tasks'
			return NextResponse.redirect(redirectUrl)
		} catch (error) {
			// Если токен невалиден, просто очищаем cookie и пускаем дальше
			response.cookies.delete('token')
			return response
		}
	}

	// Список защищённых маршрутов
	const protectedRoutes = [
		'/profile',
		'/tasks',
		'/dashboard',
		'/chats',
		'/notifications',
		'/admin',
		'/api/profile',
		'/api/tasks',
		'/api/chats',
	]

	const isProtected = protectedRoutes.some(route => pathname.startsWith(route))

	if (isProtected) {
		// Нет токена — редиректим или ошибка
		if (!token) {
			if (pathname.startsWith('/api/')) {
				return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
			}

			const loginUrl = req.nextUrl.clone()
			loginUrl.pathname = '/login'
			return NextResponse.redirect(loginUrl)
		}

		try {
			verifyJWT(token)
			return response
		} catch (error) {
			if (pathname.startsWith('/api/')) {
				return NextResponse.json({ error: 'Невалидный токен' }, { status: 401 })
			}

			const loginUrl = req.nextUrl.clone()
			loginUrl.pathname = '/login'
			return NextResponse.redirect(loginUrl)
		}
	}

	return response
}

// Middleware применяется ко всем маршрутам, кроме статических
export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
