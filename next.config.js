/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'https://ohmni-backend.onrender.com/:path*',
      },
    ]
  },
}

module.exports = nextConfig 