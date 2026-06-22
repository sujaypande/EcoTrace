/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABSE_URL: process.env.DATABSE_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
