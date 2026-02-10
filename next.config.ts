import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pxvxupzgwortdvcyclxl.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'unjsmncquvssasvjunii.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
  transpilePackages: ['@react-pdf/renderer'],
  experimental: {
    esmExternals: 'loose'
  }
};

export default nextConfig;
