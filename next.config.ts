import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    // Map server-side GEMINI_API_KEY to client-accessible NEXT_PUBLIC_
    // This keeps .env.local simple (one key) while enabling WebSocket
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
};

export default nextConfig;
