import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@english-coach/database',
    '@english-coach/shared',
    '@english-coach/validation',
  ],
};

export default nextConfig;
