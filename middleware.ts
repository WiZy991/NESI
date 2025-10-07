import { verifyJWT } from '@/lib/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl

	// --- Публичные маршруты, куда можно без авторизации ---
	const publicRoutes = [
		'/',
		'/login',
		'/register',
		'/forgot-password',
		'/reset-password',
		'/favicon.ico',
		'/api/auth',
		'/api/categories',
	]

	// --- Пропускаем статику и картинки ---
	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/images') ||
		pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/)
	) {
		return NextResponse.next()
	}

	// --- Получаем токен ---
	let token = ''
	const authHeader = req.headers.get('authorization')
	if (authHeader?.startsWith('Bearer ')) {
		token = authHeader.split(' ')[1]
	} else if (req.cookies.has('token')) {
		token = req.cookies.get('token')?.value || ''
	}

	// --- Проверяем публичный путь ---
	const isPublic = publicRoutes.some(route => pathname.startsWith(route))

	// Неавторизованный пользователь → редирект на /login ---
	if (!token && !isPublic) {
		if (pathname.startsWith('/api/')) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}
		const loginUrl = req.nextUrl.clone()
		loginUrl.pathname = '/login'
		return NextResponse.redirect(loginUrl)
	}

	// Авторизованный лезет на /login или /register → редирект на /tasks ---
	if (token && (pathname === '/login' || pathname === '/register')) {
		try {
			await verifyJWT(token)
			const redirectUrl = req.nextUrl.clone()
			redirectUrl.pathname = '/tasks'
			return NextResponse.redirect(redirectUrl)
		} catch {
			// если токен битый — очищаем и пропускаем
			const res = NextResponse.next()
			res.cookies.delete('token')
			return res
		}
	}

	// --- 3️⃣ Проверка валидности токена на защищённых маршрутах ---
	if (token) {
		try {
			await verifyJWT(token)
		} catch {
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

// --- Обязательно! middleware должен применяться ко всем страницам ---
export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)'],
}
