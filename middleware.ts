import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const { pathname, search } = url

<<<<<<< HEAD
	// Публичные маршруты
	const publicRoutes = [
		'/',
		'/login',
		'/register',
		'/forgot-password',
		'/reset-password',
		'/favicon.ico',
		'/tasks',
	]
=======
  // 1) Пропускаем статику/шрифты/картинки
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    /\.(?:ico|png|jpg|jpeg|svg|gif|webp|css|js|map|txt|woff2?|ttf)$/.test(pathname)
  if (isStaticAsset) return NextResponse.next()
>>>>>>> 6527f404b94729b43368a58f898957f716fe7c30

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
      (
        pathname === '/api/tasks' ||
        pathname === '/api/categories' ||
        pathname === '/api/specialists'
      )

    if (!hasValidToken) {
      if (allowApiForGuest) return NextResponse.next()
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

<<<<<<< HEAD
	// Список защищённых маршрутов
	const protectedRoutes = [
		'/profile',
		'/tasks/create',
		'/tasks/edit',
		'/dashboard',
		'/chats',
		'/notifications',
		'/admin',
		'/api/profile',
		'/api/tasks/create',
		'/api/tasks/edit',
		'/api/tasks/delete',
		'/api/chats',
		'/api/cert',
	]

	const isProtected = protectedRoutes.some(route => {
		// Точное совпадение или начинается с маршрута и следующий символ это / или конец строки
		return (
			pathname === route ||
			(pathname.startsWith(route) &&
				(pathname[route.length] === '/' || pathname.length === route.length))
		)
	})
=======
    // есть валидный токен → пропускаем
    return NextResponse.next()
  }

  // 6) Правила для страниц без токена (гостя)
  if (!hasValidToken) {
    // Ровно /tasks и /specialists гостю можно
    if (isExactPublicPage) return NextResponse.next()
>>>>>>> 6527f404b94729b43368a58f898957f716fe7c30

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

  // 7) Минимальные security-заголовки (опционально)
  const res = NextResponse.next()
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  return res
}

export const config = {
  // применяем везде, кроме статики
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|css|js|map|txt|woff2?|ttf)$).*)'],
}
