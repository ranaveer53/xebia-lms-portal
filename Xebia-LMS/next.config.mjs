/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // No proxy rewrites needed — all API calls are handled by local Next.js
  // route handlers in src/app/api/* (runs on Vercel serverless for free).
  // The Spring Boot backend is fully replaced by Next.js API routes + MongoDB Atlas.
};

export default nextConfig;
