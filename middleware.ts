import { verifyJWT } from '@/lib/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl

	// Разрешённые маршруты без авторизации
	const publicRoutes = [
		'/',
		'/login',
		'/register',
		'/forgot-password',
		'/reset-password',
		'/tasks',          // список задач можно смотреть
		'/specialists',    // подиум специалистов
		'/favicon.ico',
		'/api/auth',
		'/api/categories',
		'/api/tasks',      // разрешим чтение задач
		'/api/specialists' // разрешим подиум
	]

	// Статика и картинки — пропускаем
	if (
		pathname.startsWith('/_next') ||
		pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff2?)$/)
	) {
		return NextResponse.next()
	}

	// Получаем токен
	let token = ''
	const authHeader = req.headers.get('authorization')
	if (authHeader?.startsWith('Bearer ')) {
		token = authHeader.split(' ')[1]
	} else if (req.cookies.has('token')) {
		token = req.cookies.get('token')?.value || ''
	}

	const isPublic = publicRoutes.some(route => pathname.startsWith(route))

	//Если токена нет ---
	if (!token) {
		// Гостю разрешено:
		// /tasks и /specialists, но не вложенные страницы
		if (
			isPublic ||
			pathname === '/tasks' ||
			pathname === '/specialists'
		) {
			return NextResponse.next()
		}

		// Запретить доступ к подстраницам
		if (
			pathname.startsWith('/tasks/') ||           // просмотр конкретной задачи
			pathname.startsWith('/specialists/') ||     // профиль специалиста
			pathname.startsWith('/profile') ||          // личные кабинеты
			pathname.startsWith('/chats') ||
			pathname.startsWith('/notifications') ||
			pathname.startsWith('/dashboard') ||
			pathname.startsWith('/admin')
		) {
			const loginUrl = req.nextUrl.clone()
			loginUrl.pathname = '/login'
			return NextResponse.redirect(loginUrl)
		}

		// API без токена — только ограниченные эндпоинты
		if (pathname.startsWith('/api/')) {
			if (
				pathname.startsWith('/api/tasks') ||
				pathname.startsWith('/api/categories') ||
				pathname.startsWith('/api/specialists')
			) {
				return NextResponse.next()
			}
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Всё остальное → редирект на /login
		if (!isPublic) {
			const loginUrl = req.nextUrl.clone()
			loginUrl.pathname = '/login'
			return NextResponse.redirect(loginUrl)
		}

		return NextResponse.next()
	}

	//  Если токен есть и юзер идёт на /login или /register — редиректим на /tasks ---
	if (token && (pathname === '/login' || pathname === '/register')) {
		const decoded = await verifyJWT(token)
		if (decoded) {
			const redirectUrl = req.nextUrl.clone()
			redirectUrl.pathname = '/tasks'
			return NextResponse.redirect(redirectUrl)
		} else {
			const res = NextResponse.next()
			res.cookies.delete('token')
			return res
		}
	}

	//  Проверка токена для остальных маршрутов ---
	if (token) {
		const decoded = await verifyJWT(token)
		if (!decoded) {
			const loginUrl = req.nextUrl.clone()
			loginUrl.pathname = '/login'
			const res = NextResponse.redirect(loginUrl)
			res.cookies.delete('token')
			return res
		}
	}

	// Безопасные заголовки
	const response = NextResponse.next()
	response.headers.set('X-Frame-Options', 'DENY')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
	response.headers.set('X-XSS-Protection', '1; mode=block')

	return response
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|css|js|woff2?)$).*)',
	],
}
