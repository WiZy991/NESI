const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
  experimental: {
    serverActions: {}, // ✅ оставляем, как у тебя
    instrumentationHook: true, // Включаем instrumentation для глобальных обработчиков ошибок
  },
  eslint: {
    // ❌ отключаем ESLint при билде
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ❌ игнорим ошибки типов при билде
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54112',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true, // Отключаем оптимизацию для локальной разработки
  },
}

module.exports = nextConfig
