/**
 * Утилиты для редиректов со старых URL на новые SEO-friendly URL
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { slugify } from './slugify'

/**
 * Редирект со старого URL профиля на новый
 */
export async function redirectUserProfile(
  userId: string,
  req: NextRequest
): Promise<NextResponse | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        seoSlug: true,
        blocked: true,
      },
    })

    if (!user || user.blocked) {
      return null
    }

    const slug = user.seoSlug || slugify(user.fullName || user.email || '')
    const path = user.role === 'executor' ? 'freelancer' : 'customer'
    const newUrl = req.nextUrl.clone()
    newUrl.pathname = `/${path}/${user.id}/${slug}`
    newUrl.search = ''

    return NextResponse.redirect(newUrl, 301)
  } catch (error) {
    return null
  }
}

/**
 * Редирект со старого URL задачи на новый
 */
export async function redirectTask(
  taskId: string,
  req: NextRequest
): Promise<NextResponse | null> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        seoSlug: true,
        status: true,
      },
    })

    if (!task || task.status !== 'open') {
      return null
    }

    const slug = task.seoSlug || slugify(task.title)
    const newUrl = req.nextUrl.clone()
    newUrl.pathname = `/task/${task.id}/${slug}`
    newUrl.search = ''

    return NextResponse.redirect(newUrl, 301)
  } catch (error) {
    return null
  }
}

