// Утилиты для компонента Header

export const formatNotificationTime = (timestamp: string) => {
	const date = new Date(timestamp)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMins = Math.floor(diffMs / 60000)
	const diffHours = Math.floor(diffMs / 3600000)
	const diffDays = Math.floor(diffMs / 86400000)

	if (diffMins < 1) return 'только что'
	if (diffMins < 60) return `${diffMins} мин. назад`
	if (diffHours < 24) return `${diffHours} ч. назад`
	if (diffDays === 1) return 'вчера'
	if (diffDays < 7) return `${diffDays} дн. назад`

	return date.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: 'short',
	})
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
	message: 'Сообщения',
	review: 'Отзывы',
	task: 'Задачи',
	warning: 'Предупреждения',
	response: 'Отклики',
	response_reminder: 'Напоминания',
	reminder: 'Напоминания',
	hire: 'Назначения',
	hire_request: 'Запросы на наём',
	assignment: 'Назначения',
	payment: 'Платежи',
	expense: 'Списания',
	income: 'Поступления',
	commission: 'Комиссии',
	refund: 'Возвраты',
	dispute: 'Споры',
	badge: 'Награды',
	freeze: 'Заморозка',
	earn: 'Начисления',
	system: 'Система',
	broadcast: 'Системные',
	chatPresence: 'Чаты',
	other: 'Прочее',
}

export const getNotificationTypeLabel = (type: string) =>
	NOTIFICATION_TYPE_LABELS[type] ?? NOTIFICATION_TYPE_LABELS.other ?? 'Прочее'

