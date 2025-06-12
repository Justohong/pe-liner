/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 빌드 시 ESLint 검사를 건너뜁니다.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 