import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";
import { INITIAL_ASSESSMENTS } from "@/data/mockData";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_assessments";
const SUBMISSIONS_COLLECTION = "lms_ts_submissions";

async function getDb() {
  const client = await clientPromise;
  if (!client) return null;
  return client.db(DB_NAME);
}

function cleanDoc(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: doc.id || _id.toString(), ...rest };
}

async function loadAssessments(db) {
  if (!db) return INITIAL_ASSESSMENTS;
  const data = await db.collection(COLLECTION).find({}).toArray();
  if (data.length === 0) {
    // Seed with mock data
    const toInsert = INITIAL_ASSESSMENTS.map(a => ({ ...a }));
    await db.collection(COLLECTION).insertMany(toInsert);
    return INITIAL_ASSESSMENTS;
  }
  return data.map(cleanDoc);
}

// GET /api/assessments
export async function GET(request) {
  try {
    const db = await getDb();
    const assessments = await loadAssessments(db);
    return NextResponse.json(assessments);
  } catch (e) {
    console.error("[assessments GET]", e);
    return NextResponse.json(INITIAL_ASSESSMENTS);
  }
}

// POST /api/assessments  (create draft)
// POST /api/assessments/draft  (handled below via path)
export async function POST(request) {
  try {
    const body = await request.json();
    const db = await getDb();

    const newAssessment = {
      ...body,
      id: body.id || `a-${Date.now()}`,
      createdAt: body.createdAt || new Date().toISOString(),
      status: body.status || "draft",
    };

    if (db) {
      await db.collection(COLLECTION).updateOne(
        { id: newAssessment.id },
        { $set: newAssessment },
        { upsert: true }
      );
    }

    return NextResponse.json(newAssessment, { status: 201 });
  } catch (e) {
    console.error("[assessments POST]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
