import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@web-note/shared', 'mermaid'],
};

export default nextConfig;
