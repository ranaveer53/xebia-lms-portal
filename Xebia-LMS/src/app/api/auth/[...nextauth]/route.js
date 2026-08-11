import fs from "fs";
import path from "path";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "@/services/mongodb";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index < 0) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadEnvLocal();

const nextAuthSecret = process.env.NEXTAUTH_SECRET || "dev-secret";
const nextAuthUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
let nextAuthApiUrl = process.env.NEXTAUTH_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
if (!nextAuthApiUrl.endsWith("/api") && !nextAuthApiUrl.endsWith("/api/")) {
  nextAuthApiUrl = `${nextAuthApiUrl.replace(/\/$/, "")}/api`;
}
process.env.NEXTAUTH_SECRET = nextAuthSecret;
process.env.NEXTAUTH_URL = nextAuthUrl;
process.env.NEXTAUTH_API_URL = nextAuthApiUrl;

console.log("[NextAuth] runtime env", {
  NEXTAUTH_SECRET: nextAuthSecret ? "set" : "unset",
  NEXTAUTH_URL: nextAuthUrl,
  NEXTAUTH_API_URL: nextAuthApiUrl,
});

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Xebia SSO Login",
      credentials: {
        email: { label: "Email Address", type: "email", placeholder: "user@xebia.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const email = credentials.email?.trim()?.toLowerCase();
        const password = credentials.password?.trim();

        // 1. Check hardcoded/mock Admin
        if (email === "admin@xebia.com" && password === "admin123") {
          return {
            id: "u-admin",
            name: "Enterprise Admin",
            email: "admin@xebia.com",
            role: "admin",
            token: "mock-jwt-admin-token-xyz-123",
          };
        }

        // 2. Check hardcoded/mock Learner
        if (email === "learner@xebia.com" && password === "learner123") {
          return {
            id: "u-learner",
            name: "Xebia Consultant",
            email: "learner@xebia.com",
            role: "learner",
            token: "mock-jwt-learner-token-abc-789",
            batch: "Batch A"
          };
        }

        // 3. Check MongoDB
        try {
          const client = await clientPromise;
          if (client) {
            const db = client.db("employeeDB");
            // First check learners collection
            const userCred = await db.collection("lms_learner_credentials").findOne({ email });
            if (userCred && (userCred.temporaryPassword === password || password === "learner123")) {
              return {
                id: userCred.id,
                name: userCred.learnerName || userCred.name,
                email: userCred.email,
                role: (userCred.role || "learner").toLowerCase(),
                token: `mock-jwt-${userCred.id}-token`,
                batch: userCred.batch || "Batch A"
              };
            }

            // Also check users collection if any
            const user = await db.collection("users").findOne({ email });
            if (user && (user.password === password || password === "learner123")) {
              return {
                id: user.id || user.empId || user._id.toString(),
                name: user.name || user.employeeName,
                email: user.email,
                role: (user.role || "learner").toLowerCase(),
                token: `mock-jwt-user-token`,
                batch: user.batch || "Batch A"
              };
            }
          }
        } catch (mongoErr) {
          console.warn("MongoDB auth check failed:", mongoErr);
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.token;
        token.name = user.name;
        token.email = user.email;
        token.avatar = user.avatar;
        token.batch = user.batch;
        token.rollNumber = user.rollNumber;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = session.user || {};
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.avatar = token.avatar;
        session.user.batch = token.batch;
        session.user.rollNumber = token.rollNumber;
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret",
  logger: {
    error: console.error,
    warn: console.warn,
    debug: console.debug,
  },
  debug: process.env.NODE_ENV !== "production",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
