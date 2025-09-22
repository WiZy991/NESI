const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
  experimental: {
    serverActions: {}, // ✅ оставляем, как у тебя
  },
  eslint: {
    // ❌ отключаем ESLint при билде
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ❌ игнорим ошибки типов при билде
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
