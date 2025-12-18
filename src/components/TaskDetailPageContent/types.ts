// Типы для компонента TaskDetailPageContent

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

export type Task = {
	id: string
	title: string
	description: string
	status: TaskStatus
	price: number
	createdAt: string
	customerId: string
	executorId?: string | null
	customer: {
		id: string
		fullName?: string | null
		email: string
		accountType?: string | null
		companyName?: string | null
	}
	executor?: {
		id: string
		fullName?: string | null
		email: string
		accountType?: string | null
		companyName?: string | null
	} | null
	subcategory?: {
		id: string
		name: string
		minPrice: number
	} | null
	subcategoryId?: string | null
	cancellationRequestedAt?: string | null
	cancellationReason?: string | null
	files?: Array<{
		id: string
		filename: string
		mimetype: string
		size: number
	}>
	responses?: Array<{
		id: string
		message: string
		price: number
		userId?: string
		createdAt?: string
		user: {
			id: string
			fullName?: string | null
			email: string
			accountType?: string | null
			companyName?: string | null
		}
	}>
	review?: Array<{
		id: string
		rating: number
		comment?: string | null
		fromUserId: string
		toUserId: string
		createdAt: string
		fromUser?: {
			fullName?: string | null
		}
	}>
}

export type DisputeInfo = {
	status: 'open' | 'resolved' | 'rejected'
	adminDecision?: 'customer' | 'executor'
	resolution?: string | null
}
