import { getUserFromRequest } from '@/lib/auth'
import { getLevelFromXP } from '@/lib/level/calculate'
import {
	getBackgroundById,
	isBackgroundUnlocked,
} from '@/lib/level/profileBackgrounds'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/profile/background
 * Получает текущий выбранный фон профиля
 */
export async function GET(req: NextRequest) {
	let user
	try {
		user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Пытаемся получить настройки, но не падаем если поле еще не существует
		let backgroundId = 'default'
		try {
			const settings = await prisma.userSettings.findUnique({
				where: { userId: user.id },
				select: { profileBackground: true },
			})
			if (settings?.profileBackground) {
				backgroundId = settings.profileBackground
			}
		} catch (dbError: any) {
			// Если поле profileBackground еще не существует в БД (миграция не применена)
			// Или таблица UserSettings не существует - просто возвращаем дефолт
			logger.debug(
				'Не удалось получить фон профиля из БД, используем дефолтное значение',
				{
					userId: user.id,
					error: dbError.message,
					code: dbError.code,
					name: dbError.name,
				}
			)
		}

		return NextResponse.json({
			backgroundId,
		})
	} catch (err: any) {
		logger.error('Ошибка при получении фона профиля', err, {
			userId: user?.id,
			errorMessage: err?.message,
			errorCode: err?.code,
			errorName: err?.name,
			stack: err?.stack,
		})
		// В случае любой ошибки возвращаем дефолтное значение вместо 500
		return NextResponse.json({
			backgroundId: 'default',
			error: 'Не удалось загрузить фон, используется значение по умолчанию',
		})
	}
}

/**
 * PATCH /api/profile/background
 * Устанавливает фон профиля
 */
export async function PATCH(req: NextRequest) {
	try {
		const user = await getUserFromRequest(req)
		if (!user) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
		}

		// Только исполнители могут изменять фон профиля
		if (user.role !== 'executor') {
			return NextResponse.json(
				{ error: 'Изменение фона профиля доступно только для исполнителей' },
				{ status: 403 }
			)
		}

		const { backgroundId } = await req.json()

		if (!backgroundId || typeof backgroundId !== 'string') {
			return NextResponse.json({ error: 'ID фона обязателен' }, { status: 400 })
		}

		// Проверяем, существует ли фон
		const background = getBackgroundById(backgroundId)
		if (!background) {
			return NextResponse.json({ error: 'Фон не найден' }, { status: 404 })
		}

		// Получаем уровень пользователя
		const baseXp = user.xp || 0
		const passedTests = await prisma.certificationAttempt.count({
			where: { userId: user.id, passed: true },
		})
		const xpComputed = baseXp + passedTests * 10
		const levelInfo = await getLevelFromXP(xpComputed)

		// Проверяем, разблокирован ли фон
		if (!isBackgroundUnlocked(backgroundId, levelInfo.level)) {
			return NextResponse.json(
				{ error: `Этот фон доступен с уровня ${background.unlockLevel}` },
				{ status: 403 }
			)
		}

		// Обновляем настройки пользователя
		try {
			await prisma.userSettings.upsert({
				where: { userId: user.id },
				create: {
					userId: user.id,
					profileBackground: backgroundId,
				},
				update: {
					profileBackground: backgroundId,
				},
			})
		} catch (dbError: any) {
			// Если поле profileBackground еще не существует в БД (миграция не применена)
			if (
				dbError.message?.includes('profileBackground') ||
				dbError.code === 'P2021' ||
				dbError.code === 'P2002'
			) {
				logger.warn(
					'Поле profileBackground не найдено в БД или миграция не применена',
					{
						userId: user.id,
						error: dbError.message,
						code: dbError.code,
					}
				)
				// Возвращаем успех, но предупреждаем что фон не сохранен
				return NextResponse.json({
					success: true,
					backgroundId,
					warning:
						'Фон не сохранен в БД. Примените миграцию для полной функциональности.',
				})
			}
			throw dbError
		}

		return NextResponse.json({ success: true, backgroundId })
	} catch (err: any) {
		logger.error('Ошибка при установке фона профиля', err)
		return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
	}
}
