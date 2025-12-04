import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // This function tells the Next.js dev server to forward API requests
  // to your backend server running on port 8000.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/:path*', 
      },
    ];
  },
};

export default nextConfig;