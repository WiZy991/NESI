// Утилиты для компонента TaskDetailPageContent

export const statusColors: Record<string, string> = {
	open: 'bg-green-500/20 text-green-300 border-green-500/30',
	in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
	completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
	cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
}

export function getStatusName(status: string): string {
	const names: Record<string, string> = {
		open: 'Открыта',
		in_progress: 'В работе',
		completed: 'Завершена',
		cancelled: 'Отменена',
	}
	return names[status] || status
}

export function getUserProfileLink(
	currentUserId: string | undefined,
	targetUserId: string
): string {
	return currentUserId === targetUserId ? '/profile' : `/users/${targetUserId}`
}

