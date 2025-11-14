/**
 * Типы для API responses
 * Используются для строгой типизации ответов API
 */

import { Prisma } from '@prisma/client'

// Базовые типы
export type ApiError = {
  error: string
  details?: string
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Типы для задач
export type TaskResponse = {
  id: string
  title: string
  description: string
  price: number | null
  status: string
  deadline: Date | null
  createdAt: Date
  customer: {
    id: string
    fullName: string | null
    email: string
  }
  executor?: {
    id: string
    fullName: string | null
    email: string
  } | null
  subcategory: {
    id: string
    name: string
    minPrice: number
    category: {
      id: string
      name: string
    }
  }
  files?: Array<{
    id: string
    filename: string
    mimetype: string
    size: number
  }>
  responses?: Array<{
    id: string
    message: string | null
    price: number | null
    status: string
    createdAt: Date
    user: {
      id: string
      fullName: string | null
      email: string
      avgRating: number | null
    }
    statusHistory?: Array<{
      id: string
      status: string
      note: string | null
      createdAt: Date
      changedBy: {
        id: string
        fullName: string | null
        email: string
      }
    }>
  }>
}

export type TasksListResponse = {
  tasks: TaskResponse[]
  pagination: PaginationMeta
}

// Типы для пользователей
export type UserResponse = {
  id: string
  fullName: string | null
  email: string
  role: string
  avatarUrl?: string | null
  xp?: number
  avgRating?: number | null
  completedTasksCount?: number
  level?: {
    id: string
    name: string
  } | null
}

export type UsersListResponse = {
  users: UserResponse[]
  pagination: PaginationMeta
}

// Типы для сообщений
export type MessageResponse = {
  id: string
  content: string | null
  createdAt: Date
  editedAt?: Date | null
  sender: {
    id: string
    fullName: string | null
    email: string
  }
  fileUrl?: string | null
  fileName?: string | null
  replyTo?: {
    id: string
    content: string
    sender: {
      id: string
      fullName: string | null
      email: string
    }
  } | null
}

export type MessagesListResponse = {
  messages: MessageResponse[]
}

// Типы для откликов
export type TaskResponseItem = {
  id: string
  taskId: string
  userId: string
  message: string | null
  price: number | null
  status: string
  createdAt: Date
  task: {
    id: string
    title: string
    description: string
    price: number | null
    status: string
    createdAt: Date
    customer: {
      id: string
      fullName: string | null
      email: string
    }
    subcategory: {
      id: string
      name: string
      category: {
        id: string
        name: string
      }
    }
  }
  statusHistory?: Array<{
    id: string
    status: string
    note: string | null
    createdAt: Date
    changedBy: {
      id: string
      fullName: string | null
      email: string
    }
  }>
}

export type TaskResponsesListResponse = {
  responses: TaskResponseItem[]
  pagination: PaginationMeta
}

// Типы для чатов
export type ChatResponse = {
  id: string
  type: 'private' | 'task'
  lastMessage?: {
    id: string
    content: string | null
    createdAt: Date
    sender: {
      id: string
      fullName: string | null
      email: string
    }
  } | null
  unreadCount?: number
  otherUser?: {
    id: string
    fullName: string | null
    email: string
    avatarUrl?: string | null
  }
  task?: {
    id: string
    title: string
  }
}

export type ChatsListResponse = {
  chats: ChatResponse[]
}

// Типы для уведомлений
export type NotificationResponse = {
  id: string
  message: string
  link: string | null
  type: string
  read: boolean
  createdAt: Date
}

export type NotificationsListResponse = {
  notifications: NotificationResponse[]
  pagination: PaginationMeta
}

// Типы для профиля
export type ProfileResponse = {
  id: string
  email: string
  fullName: string | null
  role: string
  description: string | null
  location: string | null
  skills: string[]
  avatarUrl: string | null
  balance: Prisma.Decimal
  frozenBalance: Prisma.Decimal
  xp: number
  xpComputed: number
  completedTasksCount: number
  avgRating: number | null
  createdAt: Date
  reviewsReceived?: Array<{
    id: string
    rating: number
    comment: string | null
    createdAt: Date
    fromUser: {
      id: string
      fullName: string | null
      email: string
    }
    task: {
      id: string
      title: string
    }
  }>
  badges?: Array<{
    id: string
    earnedAt: Date
    badge: {
      id: string
      name: string
      description: string | null
      icon: string
      targetRole: string | null
      condition: string | null
    }
  }>
  certifications?: Array<{
    id: string
    level: number
    grantedAt: Date
    subcategory: {
      id: string
      name: string
    }
  }>
  executedTasks?: Array<{
    id: string
    title: string
    description: string
    price: number | null
    completedAt: Date
    customer: {
      id: string
      fullName: string | null
      email: string
    }
    review?: {
      id: string
      rating: number
      comment: string | null
    } | null
  }>
}

