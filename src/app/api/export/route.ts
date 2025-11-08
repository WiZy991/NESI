import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/export?type=tasks|messages|reviews&format=csv|json
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'tasks'
    const format = searchParams.get('format') || 'json'

    let data: any[] = []

    switch (type) {
      case 'tasks':
        // Экспорт задач пользователя
        const tasks = await prisma.task.findMany({
          where: {
            OR: [
              { customerId: user.id },
              { executorId: user.id },
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            status: true,
            deadline: true,
            createdAt: true,
            completedAt: true,
            customer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            executor: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            subcategory: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        data = tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          price: task.price?.toString() || '',
          status: task.status,
          deadline: task.deadline?.toISOString() || '',
          createdAt: task.createdAt.toISOString(),
          completedAt: task.completedAt?.toISOString() || '',
          customerName: task.customer.fullName || task.customer.email,
          executorName: task.executor?.fullName || task.executor?.email || '',
          category: task.subcategory?.category.name || '',
          subcategory: task.subcategory?.name || '',
        }))
        break

      case 'messages':
        // Экспорт сообщений пользователя
        const messages = await prisma.message.findMany({
          where: {
            OR: [
              { senderId: user.id },
              { task: { customerId: user.id } },
              { task: { executorId: user.id } },
            ],
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            task: {
              select: {
                id: true,
                title: true,
              },
            },
            sender: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        data = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
          taskId: msg.task?.id || '',
          taskTitle: msg.task?.title || '',
          senderName: msg.sender.fullName || msg.sender.email,
          isOwn: msg.sender.id === user.id,
        }))
        break

      case 'reviews':
        // Экспорт отзывов
        const reviews = await prisma.review.findMany({
          where: {
            OR: [
              { fromUserId: user.id },
              { toUserId: user.id },
            ],
          },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            task: {
              select: {
                id: true,
                title: true,
              },
            },
            fromUser: {
              select: {
                fullName: true,
                email: true,
              },
            },
            toUser: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        data = reviews.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
          taskId: review.task.id,
          taskTitle: review.task.title,
          fromUserName: review.fromUser?.fullName || review.fromUser?.email || '',
          toUserName: review.toUser?.fullName || review.toUser?.email || '',
          isFromMe: review.fromUser?.id === user.id,
        }))
        break

      default:
        return NextResponse.json({ error: 'Неверный тип данных' }, { status: 400 })
    }

    if (format === 'csv') {
      // Генерация CSV
      if (data.length === 0) {
        return NextResponse.json({ error: 'Нет данных для экспорта' }, { status: 404 })
      }

      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header]
            // Экранируем кавычки и запятые
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value || ''
          }).join(',')
        ),
      ]

      const csv = csvRows.join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM для Excel

      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } else {
      // JSON формат
      return NextResponse.json({ data }, {
        headers: {
          'Content-Disposition': `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.json"`,
        },
      })
    }
  } catch (error: any) {
    console.error('Ошибка при экспорте данных:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при экспорте данных' },
      { status: 500 }
    )
  }
}

