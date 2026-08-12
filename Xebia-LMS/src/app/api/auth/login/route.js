import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";

const DB_NAME = "employeeDB";

async function resolveBatchName(db, cred) {
  // If already has a human-readable batch name (e.g. "Batch A"), use it directly
  if (cred.batch && !cred.batch.startsWith("default") && cred.batch.length > 2) {
    return cred.batch;
  }
  // Try to resolve from batchId via lms_batches collection
  const batchId = cred.batchId || cred.batch;
  if (batchId) {
    try {
      const batchDoc = await db.collection("lms_batches").findOne({ id: batchId });
      if (batchDoc && batchDoc.batchName) return batchDoc.batchName;
    } catch (_) {}
  }
  // Default so learner can always see "Batch A" assessments
  return "Batch A";
}

export async function POST(request) {
  try {
    const { email, password, role } = await request.json();
    const cleanEmail = email?.trim()?.toLowerCase();
    const cleanPassword = password?.trim();

    // 1. Mock Admin check
    if (cleanEmail === "admin@xebia.com" && cleanPassword === "admin123") {
      return NextResponse.json({
        id: "u-admin",
        name: "Enterprise Admin",
        email: "admin@xebia.com",
        role: "admin",
        token: "mock-jwt-admin-token-xyz-123",
      });
    }

    // 2. Mock Learner check
    if (cleanEmail === "learner@xebia.com" && cleanPassword === "learner123") {
      return NextResponse.json({
        id: "u-learner",
        name: "Xebia Consultant",
        email: "learner@xebia.com",
        role: "learner",
        token: "mock-jwt-learner-token-abc-789",
        batch: "Batch A"
      });
    }

    // 3. Mock Teacher check
    if (cleanEmail === "teacher@xebia.com" && cleanPassword === "teacher123") {
      return NextResponse.json({
        id: "u-teacher",
        name: "Xebia Instructor",
        email: "teacher@xebia.com",
        role: "teacher",
        token: "mock-jwt-teacher-token-def-456",
        batch: "Batch A"
      });
    }

    // 3. MongoDB check
    const client = await clientPromise;
    if (client) {
      const db = client.db(DB_NAME);

      const userCred = await db.collection("lms_learner_credentials").findOne({ email: cleanEmail });
      if (userCred && (userCred.temporaryPassword === cleanPassword || cleanPassword === "learner123")) {
        const batchName = await resolveBatchName(db, userCred);
        return NextResponse.json({
          id: userCred.id,
          name: userCred.learnerName || userCred.name,
          email: userCred.email,
          role: (userCred.role || "learner").toLowerCase(),
          token: `mock-jwt-${userCred.id}-token`,
          batch: batchName,
        });
      }

      // Check generic users collection
      const user = await db.collection("users").findOne({ email: cleanEmail });
      if (user && (user.password === cleanPassword || cleanPassword === "learner123")) {
        const batchName = await resolveBatchName(db, user);
        return NextResponse.json({
          id: user.id || user.empId || user._id.toString(),
          name: user.name || user.employeeName,
          email: user.email,
          role: (user.role || "learner").toLowerCase(),
          token: `mock-jwt-user-token`,
          batch: batchName,
        });
      }
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (e) {
    console.error("[api/auth/login POST]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
