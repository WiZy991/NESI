/**
 * Схемы валидации с использованием Zod
 * Используются для валидации данных на сервере
 */
import { z } from 'zod'

// Валидация email
export const emailSchema = z
  .string()
  .min(1, 'Email обязателен')
  .email('Некорректный формат email')
  .max(255, 'Email слишком длинный')

// Валидация пароля
export const passwordSchema = z
  .string()
  .min(6, 'Пароль должен содержать минимум 6 символов')
  .max(128, 'Пароль слишком длинный (максимум 128 символов)')

// Валидация имени
export const fullNameSchema = z
  .string()
  .min(1, 'Имя обязательно')
  .max(100, 'Имя слишком длинное (максимум 100 символов)')
  .trim()

// Валидация описания
export const descriptionSchema = z
  .string()
  .min(1, 'Описание обязательно')
  .max(5000, 'Описание слишком длинное (максимум 5000 символов)')
  .trim()

// Схема регистрации
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  role: z.enum(['customer', 'executor']),
})

// Схема входа
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Пароль обязателен'),
})

// Схема создания задачи
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Название обязательно')
    .max(200, 'Название слишком длинное (максимум 200 символов)')
    .trim(),
  description: descriptionSchema,
  subcategoryId: z.string().min(1, 'Подкатегория обязательна'),
  price: z.number().positive().optional(),
  deadline: z.string().datetime().optional().or(z.date().optional()),
})

// Схема отправки сообщения
export const sendMessageSchema = z.object({
  recipientId: z.string().min(1, 'ID получателя обязателен'),
  content: z
    .string()
    .max(5000, 'Сообщение слишком длинное (максимум 5000 символов)')
    .trim(),
})

// Схема обновления профиля
export const updateProfileSchema = z.object({
  fullName: fullNameSchema.optional(),
  description: z.string().max(1000, 'Описание слишком длинное').trim().optional(),
  location: z.string().max(200, 'Местоположение слишком длинное').trim().optional(),
  skills: z.string().max(500, 'Навыки слишком длинные').trim().optional(),
  role: z.enum(['customer', 'executor']).optional(),
})

// Схема отклика на задачу
export const taskResponseSchema = z.object({
  message: z
    .string()
    .max(2000, 'Сообщение слишком длинное (максимум 2000 символов)')
    .trim(),
  price: z.number().positive('Цена должна быть положительной'),
})

// Схема восстановления пароля
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

// Схема сброса пароля
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Токен обязателен'),
  password: passwordSchema,
})

// Валидация с обработкой ошибок
export function validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true
  data: T
} | {
  success: false
  errors: string[]
} {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((e) => e.message),
      }
    }
    return {
      success: false,
      errors: ['Ошибка валидации данных'],
    }
  }
}

