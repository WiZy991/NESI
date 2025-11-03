import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { validatePassword } from '@/lib/errorHandler'

export async function POST(req: Request) {
  try {
    // Получаем текущего пользователя из токена
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { oldPassword, newPassword } = await req.json()

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Укажите старый и новый пароль' }, { status: 400 })
    }

    // Валидация нового пароля
    try {
      validatePassword(newPassword)
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Проверка, что новый пароль отличается от старого
    if (oldPassword === newPassword) {
      return NextResponse.json({ error: 'Новый пароль должен отличаться от старого' }, { status: 400 })
    }

    // Проверяем текущий пароль
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    const isValid = await bcrypt.compare(oldPassword, dbUser.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 })
    }

    // Хешируем новый пароль
    const hashed = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    })

    return NextResponse.json({ success: true, message: 'Пароль успешно изменён' })
  } catch (err) {
    console.error('Ошибка при смене пароля:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
