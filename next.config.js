const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
  experimental: {
    serverActions: {}, // ✅ исправлено: теперь объект, как требует Next.js
  },
}

module.exports = nextConfig
