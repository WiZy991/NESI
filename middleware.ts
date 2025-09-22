import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/jwt'

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

  // Разрешаем доступ к Next.js статикам
  if (
    publicRoutes.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
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

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected) {
    let token = ''
    const authHeader = req.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    } else if (req.cookies.has('token')) {
      token = req.cookies.get('token')?.value || ''
    }

    // Токена нет — редиректим или возвращаем ошибку
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
      return NextResponse.next()
    } catch (error) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Невалидный токен' }, { status: 401 })
      }

      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
