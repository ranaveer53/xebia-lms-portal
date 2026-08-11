import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_submissions";

async function getDb() {
  const client = await clientPromise;
  if (!client) return null;
  return client.db(DB_NAME);
}

function cleanDoc(doc) {
  const { _id, ...rest } = doc;
  return { id: doc.id || _id.toString(), ...rest };
}

// GET /api/submissions?learnerId=...&assessmentId=...&status=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const learnerId = searchParams.get("learnerId");
    const assessmentId = searchParams.get("assessmentId");
    const status = searchParams.get("status");

    const db = await getDb();
    if (!db) return NextResponse.json([]);

    const query = {};
    if (learnerId) query.learnerId = learnerId;
    if (assessmentId) query.assessmentId = assessmentId;
    if (status) query.status = status;

    const data = await db.collection(COLLECTION).find(query).toArray();
    return NextResponse.json(data.map(cleanDoc));
  } catch (e) {
    console.error("[submissions GET]", e);
    return NextResponse.json([]);
  }
}

// POST /api/submissions — submit an assessment
export async function POST(request) {
  try {
    const body = await request.json();
    const db = await getDb();

    const submission = {
      ...body,
      id: body.id || `sub-${Date.now()}`,
      submittedAt: body.submittedAt || new Date().toISOString(),
      status: body.status || "submitted",
    };

    if (db) {
      // Prevent duplicate submissions for same learner + assessment
      if (submission.learnerId && submission.assessmentId) {
        await db.collection(COLLECTION).updateOne(
          { learnerId: submission.learnerId, assessmentId: submission.assessmentId },
          { $set: submission },
          { upsert: true }
        );
      } else {
        await db.collection(COLLECTION).insertOne(submission);
      }
    }

    return NextResponse.json(submission, { status: 201 });
  } catch (e) {
    console.error("[submissions POST]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
