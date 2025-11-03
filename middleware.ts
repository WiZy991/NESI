import { verifyJWT } from '@/lib/jwt'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
	const url = req.nextUrl
	const { pathname, search } = url

	// 1) Пропускаем статику/шрифты/картинки (включая favicon.ico)
	const isStaticAsset =
		pathname.startsWith('/_next') ||
		pathname.startsWith('/favicon.ico') ||
		pathname.startsWith('/favicon-') ||
		pathname.startsWith('/apple-touch-icon') ||
		pathname.startsWith('/site.webmanifest') ||
		/\.(?:ico|png|jpg|jpeg|svg|gif|webp|css|js|map|txt|woff2?|ttf|json)$/.test(
			pathname
		)
	if (isStaticAsset) {
		const res = NextResponse.next()
		// Для статических файлов не добавляем строгие security headers
		return res
	}

	// 2) Явно публичные страницы (роуты верхнего уровня)
	const PUBLIC_PAGES = new Set<string>([
		'/',
		'/login',
		'/register',
		'/forgot-password',
		'/reset-password',
		'/tasks',
		'/specialists',
	])

	const isExactPublicPage = PUBLIC_PAGES.has(pathname)

	// 3) Авторизация по токену из cookie (главный источник правды)
	const token = req.cookies.get('token')?.value || ''
	const hasValidToken = !!(token && verifyJWT(token))

	// 4) Если уже авторизован и идёт на /login или /register → уводим на /tasks
	if (hasValidToken && (pathname === '/login' || pathname === '/register')) {
		const redirectUrl = url.clone()
		redirectUrl.pathname = '/tasks'
		redirectUrl.search = ''
		return NextResponse.redirect(redirectUrl)
	}

	// 5) Правила для API
	if (pathname.startsWith('/api/')) {
		// Гостю разрешено ТОЛЬКО:
		// - GET /api/tasks (лист задач, ровно этот путь)
		// - GET /api/categories
		// - GET /api/specialists
		const isGet = req.method === 'GET'
		const allowApiForGuest =
			isGet &&
			(pathname === '/api/tasks' ||
				pathname === '/api/categories' ||
				pathname === '/api/specialists')

		if (!hasValidToken) {
			if (allowApiForGuest) return NextResponse.next()
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// есть валидный токен → пропускаем
		return NextResponse.next()
	}

	// 6) Правила для страниц без токена (гостя)
	if (!hasValidToken) {
		// Ровно /tasks и /specialists гостю можно
		if (isExactPublicPage) return NextResponse.next()

		// Любые вложенные пути (детали задач/профили спецов) — нельзя
		if (
			pathname.startsWith('/tasks/') ||
			pathname.startsWith('/specialists/') ||
			pathname.startsWith('/profile') ||
			pathname.startsWith('/chats') ||
			pathname.startsWith('/notifications') ||
			pathname.startsWith('/dashboard') ||
			pathname.startsWith('/admin')
		) {
			const loginUrl = url.clone()
			loginUrl.pathname = '/login'
			loginUrl.search = ''
			return NextResponse.redirect(loginUrl)
		}

		// Любой другой неопубликованный маршрут → редирект на логин
		if (!isExactPublicPage) {
			const loginUrl = url.clone()
			loginUrl.pathname = '/login'
			loginUrl.search = ''
			return NextResponse.redirect(loginUrl)
		}
	}

	// 7) Улучшенные security-заголовки
	const res = NextResponse.next()
	
	// Защита от clickjacking
	res.headers.set('X-Frame-Options', 'DENY')
	
	// Защита от MIME type sniffing
	res.headers.set('X-Content-Type-Options', 'nosniff')
	
	// Контроль referrer информации
	res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	
	// Защита от XSS (для старых браузеров)
	res.headers.set('X-XSS-Protection', '1; mode=block')
	
	// Content Security Policy
	// Для SSE endpoints разрешаем соединения без ограничений
	const isSSEEndpoint = pathname === '/api/notifications/stream'
	const isApi = pathname.startsWith('/api/')
	
	if (!isSSEEndpoint) {
		const csp = isApi
			? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';"
			: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: ws: wss:; frame-ancestors 'none';"
		res.headers.set('Content-Security-Policy', csp)
	}
	
	// Permissions Policy (Feature Policy)
	res.headers.set(
		'Permissions-Policy',
		'geolocation=(), microphone=(), camera=(), payment=()'
	)
	
	// Strict Transport Security (только в продакшене с HTTPS)
	if (process.env.NODE_ENV === 'production' && req.nextUrl.protocol === 'https:') {
		res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
	}
	
	return res
}

export const config = {
	// применяем везде, кроме статики
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|css|js|map|txt|woff2?|ttf)$).*)',
	],
}
