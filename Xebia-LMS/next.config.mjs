/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

    // When in mock mode, do NOT proxy these to the backend — local Next.js API routes handle them
    const localOnlyEndpoints = useMock
      ? ["assessments", "submissions", "classes", "materials", "batches", "certificates"]
      : [];

    const allEndpoints = [
      "classes", "assessments", "submissions", "materials", "certificates",
      "batches", "upload", "uploads", "dashboard", "courses", "categories", "modules",
      "submodules", "contents", "content", "iam", "analytics", "files", "events"
    ];

    const rewrites = [];
    for (const ep of allEndpoints) {
      if (localOnlyEndpoints.includes(ep)) continue; // handled by local Next.js API routes
      rewrites.push({ source: `/api/${ep}`, destination: `${backendUrl}/api/${ep}` });
      rewrites.push({ source: `/api/${ep}/:path*`, destination: `${backendUrl}/api/${ep}/:path*` });
    }

    return rewrites;
  },
};

export default nextConfig;

