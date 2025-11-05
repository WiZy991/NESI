import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/admin/badges/cleanup
 * Удаляет все неправильно присвоенные badges (когда targetRole не совпадает с ролью пользователя)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    // Получаем все UserBadge записи с информацией о badge и user
    const allUserBadges = await prisma.userBadge.findMany({
      include: {
        badge: {
          select: {
            id: true,
            name: true,
            targetRole: true,
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          }
        }
      }
    })

    // Находим неправильно присвоенные badges
    const incorrectBadges = allUserBadges.filter(ub => {
      const badge = ub.badge
      const user = ub.user
      
      // Если у badge указана роль, она должна совпадать с ролью пользователя
      // targetRole = null означает "для всех ролей"
      if (badge.targetRole !== null && badge.targetRole !== user.role) {
        return true
      }
      return false
    })

    console.log(`[Badges Cleanup] Найдено ${incorrectBadges.length} неправильно присвоенных badges из ${allUserBadges.length} всего`)

    // Удаляем неправильные badges
    const errors: string[] = []
    let deletedCount = 0

    for (const incorrectBadge of incorrectBadges) {
      try {
        await prisma.userBadge.delete({
          where: { id: incorrectBadge.id }
        })
        deletedCount++
        console.log(`[Badges Cleanup] ✅ Удалено: "${incorrectBadge.badge.name}" (targetRole: ${incorrectBadge.badge.targetRole}) у пользователя ${incorrectBadge.user.email} (роль: ${incorrectBadge.user.role})`)
      } catch (error: any) {
        const errorMsg = `Ошибка удаления badge ${incorrectBadge.id}: ${error.message}`
        console.error(`[Badges Cleanup] ❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Очистка завершена',
      stats: {
        total: allUserBadges.length,
        incorrect: incorrectBadges.length,
        deleted: deletedCount,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('[Badges Cleanup] Ошибка:', error)
    return NextResponse.json({ 
      error: 'Ошибка при очистке badges',
      details: error.message 
    }, { status: 500 })
  }
}
