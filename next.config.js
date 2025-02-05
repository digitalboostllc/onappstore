/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      "avatars.githubusercontent.com",
      "i.imgur.com",
      "static.macupdate.com",
      "screenshots.macupdate.com"
    ],
  },
  experimental: {
    cpus: 1
  }
}

module.exports = nextConfig 