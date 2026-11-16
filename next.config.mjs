/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

// Build-time guard: NEVER allow mock mode in production builds
if (
  process.env.VERCEL_ENV === 'production' &&
  process.env.NEXT_PUBLIC_MOCK === 'true'
) {
  throw new Error(
    'BUILD ABORTED: NEXT_PUBLIC_MOCK=true is forbidden when VERCEL_ENV=production.'
  );
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/parents/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/api/parents/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  ...(isGithubPages
    ? {
        output: 'export',
        basePath: '/Gender-Reveal',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
