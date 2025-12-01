import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	// Оптимизация изображений
	images: {
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 60 * 60 * 24 * 30, // 30 дней
		dangerouslyAllowSVG: true,
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
	},

	// Сжатие
	compress: true,

	// Оптимизация бандла
	experimental: {
		optimizePackageImports: ['lucide-react', 'react-icons'],
	},

	// Кеширование статических ресурсов
	async headers() {
		return [
			{
				source: '/api/files/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
			{
				source: '/_next/static/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
			{
				source: '/public/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=86400, stale-while-revalidate=604800',
					},
				],
			},
		]
	},

	// Оптимизация для продакшена
	...(process.env.NODE_ENV === 'production' && {
		output: 'standalone',
		poweredByHeader: false,
		generateEtags: false,
	}),
}

export default nextConfig
