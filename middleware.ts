import { verifyJWT } from '@/lib/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl

	// --- Публичные маршруты ---
	const publicRoutes = [
		'/login',
		'/register',
		'/forgot-password',
		'/reset-password',
		'/favicon.ico',
		'/api/auth',
		'/api/categories',
	]

	// --- Пропускаем статику, изображения и служебные пути ---
	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/images') ||
		pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff2?)$/)
	) {
		return NextResponse.next()
	}

	// --- Получаем токен из куков или заголовков ---
	let token = ''
	const authHeader = req.headers.get('authorization')
	if (authHeader?.startsWith('Bearer ')) {
		token = authHeader.split(' ')[1]
	} else if (req.cookies.has('token')) {
		token = req.cookies.get('token')?.value || ''
	}

	const isPublic = publicRoutes.some(route => pathname.startsWith(route))

	//Если токена нет и это не публичный маршрут → редирект на /login ---
	if (!token && !isPublic) {
		if (pathname.startsWith('/api/')) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}
		const loginUrl = req.nextUrl.clone()
		loginUrl.pathname = '/login'
		return NextResponse.redirect(loginUrl)
	}

	//Если токен есть и пользователь пытается попасть на /login или /register → редирект на / ---
	if (token && (pathname === '/login' || pathname === '/register')) {
		const decoded = await verifyJWT(token)
		if (decoded) {
			const redirectUrl = req.nextUrl.clone()
			redirectUrl.pathname = '/'
			return NextResponse.redirect(redirectUrl)
		} else {
			const res = NextResponse.next()
			res.cookies.delete('token')
			return res
		}
	}

	//3️⃣ Проверка токена для всех остальных маршрутов ---
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

	// --- Безопасные заголовки ---
	const response = NextResponse.next()
	response.headers.set('X-Frame-Options', 'DENY')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
	response.headers.set('X-XSS-Protection', '1; mode=block')

	return response
}

// --- Применяем middleware ко всем маршрутам, кроме статики ---
export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|css|js|woff2?)$).*)',
	],
}
