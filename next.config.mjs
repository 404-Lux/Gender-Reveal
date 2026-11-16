/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
