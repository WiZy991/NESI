import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'

	return [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 1,
		},
		// Для заказчиков
		{
			url: `${baseUrl}/business`,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 0.9,
		},
		{
			url: `${baseUrl}/tasks`,
			lastModified: new Date(),
			changeFrequency: 'hourly',
			priority: 0.9,
		},
		{
			url: `${baseUrl}/tasks/new`,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 0.8,
		},
		{
			url: `${baseUrl}/specialists`,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 0.9,
		},
		// Для исполнителей
		{
			url: `${baseUrl}/talents`,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 0.9,
		},
		{
			url: `${baseUrl}/cert`,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 0.8,
		},
		// Общие страницы
		{
			url: `${baseUrl}/about`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.7,
		},
		{
			url: `${baseUrl}/privacy`,
			lastModified: new Date(),
			changeFrequency: 'yearly',
			priority: 0.5,
		},
		{
			url: `${baseUrl}/terms`,
			lastModified: new Date(),
			changeFrequency: 'yearly',
			priority: 0.5,
		},
			{
				url: `${baseUrl}/community`,
				lastModified: new Date(),
				changeFrequency: 'hourly',
				priority: 0.8,
			},
			{
				url: `${baseUrl}/faq`,
				lastModified: new Date(),
				changeFrequency: 'monthly',
				priority: 0.7,
			},
		]
}

