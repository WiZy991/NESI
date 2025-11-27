import Link from 'next/link'
import Script from 'next/script'

type BreadcrumbItem = {
	label: string
	href: string
}

type BreadcrumbsProps = {
	items: BreadcrumbItem[]
	showSchema?: boolean
}

export default function Breadcrumbs({
	items,
	showSchema = true,
}: BreadcrumbsProps) {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'

	const schema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.label,
			item: item.href.startsWith('http')
				? item.href
				: `${baseUrl}${item.href}`,
		})),
	}

	return (
		<>
			<nav className='mb-6' aria-label='Хлебные крошки'>
				<ol className='flex items-center gap-2 text-sm text-gray-400 flex-wrap'>
					{items.map((item, index) => (
						<li key={item.href} className='flex items-center gap-2'>
							{index > 0 && <span>/</span>}
							{index === items.length - 1 ? (
								<span className='text-emerald-400'>{item.label}</span>
							) : (
								<Link
									href={item.href}
									className='hover:text-emerald-400 transition-colors'
								>
									{item.label}
								</Link>
							)}
						</li>
					))}
				</ol>
			</nav>
			{showSchema && (
				<Script
					id='breadcrumb-schema'
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(schema),
					}}
				/>
			)}
		</>
	)
}

