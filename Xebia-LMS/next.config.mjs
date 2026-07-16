/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const endpoints = [
      "classes", "assessments", "submissions", "materials", "certificates", 
      "batches", "upload", "uploads", "dashboard", "courses", "categories", "modules", 
      "submodules", "contents", "content", "iam", "analytics", "files", "events"
    ];
    
    const rewrites = [];
    for (const ep of endpoints) {
      rewrites.push({ source: `/api/${ep}`, destination: `${backendUrl}/api/${ep}` });
      rewrites.push({ source: `/api/${ep}/:path*`, destination: `${backendUrl}/api/${ep}/:path*` });
    }
    
    return rewrites;
  },
};

export default nextConfig;
