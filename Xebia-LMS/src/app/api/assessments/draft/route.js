import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_assessments";

async function getDb() {
  const client = await clientPromise;
  if (!client) return null;
  return client.db(DB_NAME);
}

// POST /api/assessments/draft — save a draft assessment
export async function POST(request) {
  try {
    const body = await request.json();
    const db = await getDb();

    const assessment = {
      ...body,
      id: body.id || `a-${Date.now()}`,
      status: "draft",
      createdAt: body.createdAt || new Date().toISOString(),
    };

    if (db) {
      await db.collection(COLLECTION).updateOne(
        { id: assessment.id },
        { $set: assessment },
        { upsert: true }
      );
    }

    return NextResponse.json(assessment, { status: 201 });
  } catch (e) {
    console.error("[assessments/draft POST]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
