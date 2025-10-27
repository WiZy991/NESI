/**
 * Утилиты для работы с денежными суммами
 */

import { Decimal } from '@prisma/client/runtime/library'

/**
 * Конвертирует число в Decimal
 */
export function toDecimal(value: number | string | Decimal): Decimal {
	if (value instanceof Decimal) {
		return value
	}
	return new Decimal(value)
}

/**
 * Конвертирует Decimal в число (для отображения)
 */
export function toNumber(
	value: Decimal | number | string | null | undefined
): number {
	if (value === null || value === undefined) {
		return 0
	}
	if (typeof value === 'number') {
		return value
	}
	if (typeof value === 'string') {
		return parseFloat(value)
	}
	return parseFloat(value.toString())
}

/**
 * Форматирует сумму для отображения с валютой
 */
export function formatMoney(
	value: Decimal | number | string | null | undefined,
	currency: string = '₽'
): string {
	const num = toNumber(value)
	return `${num.toFixed(2)} ${currency}`
}

/**
 * Форматирует сумму без валюты (только число с копейками)
 */
export function formatAmount(
	value: Decimal | number | string | null | undefined
): string {
	const num = toNumber(value)
	return num.toFixed(2)
}

/**
 * Проверяет, достаточно ли средств на балансе
 */
export function hasEnoughBalance(
	balance: Decimal | number | string,
	frozenBalance: Decimal | number | string,
	requiredAmount: Decimal | number | string
): boolean {
	const balanceNum = toNumber(balance)
	const frozenNum = toNumber(frozenBalance)
	const requiredNum = toNumber(requiredAmount)

	const availableBalance = balanceNum - frozenNum
	return availableBalance >= requiredNum
}

/**
 * Вычисляет доступный баланс (баланс минус замороженные средства)
 */
export function getAvailableBalance(
	balance: Decimal | number | string,
	frozenBalance: Decimal | number | string
): number {
	const balanceNum = toNumber(balance)
	const frozenNum = toNumber(frozenBalance)
	return Math.max(0, balanceNum - frozenNum)
}

/**
 * Округляет сумму до 2 знаков после запятой
 */
export function roundMoney(value: number | string): Decimal {
	const num = typeof value === 'string' ? parseFloat(value) : value
	return new Decimal(Math.round(num * 100) / 100)
}

/**
 * Вычисляет процент от суммы
 */
export function calculatePercentage(
	amount: Decimal | number | string,
	percentage: number
): Decimal {
	const amountNum = toNumber(amount)
	const result = amountNum * (percentage / 100)
	return roundMoney(result)
}

/**
 * Проверяет, является ли сумма положительной
 */
export function isPositiveAmount(value: Decimal | number | string): boolean {
	return toNumber(value) > 0
}

/**
 * Парсит ввод пользователя в безопасную денежную сумму
 */
export function parseUserInput(input: string | number): Decimal | null {
	try {
		const str = typeof input === 'number' ? input.toString() : input.trim()

		// Удаляем все, кроме цифр, точки и запятой
		const cleaned = str.replace(/[^\d.,]/g, '')

		// Заменяем запятую на точку
		const normalized = cleaned.replace(',', '.')

		// Проверяем, что это валидное число
		if (!/^\d+\.?\d{0,2}$/.test(normalized)) {
			return null
		}

		const value = parseFloat(normalized)

		if (isNaN(value) || value < 0) {
			return null
		}

		return roundMoney(value)
	} catch {
		return null
	}
}
