import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'

	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/api/',
					'/admin/',
					'/profile/',
					'/settings/',
					'/chats/',
					'/messages/',
					'/notifications/',
					'/my-tasks/',
					'/responses/',
					'/wallet/',
					'/hire/',
					'/analytics/',
					'/test-*/',
				],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	}
}

