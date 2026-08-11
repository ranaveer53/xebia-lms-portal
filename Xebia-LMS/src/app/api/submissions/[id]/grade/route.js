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

// PATCH /api/submissions/[id]/grade — grade a submission
export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { marks, feedback } = body;
    const db = await getDb();

    const patch = {
      marksObtained: marks,
      feedback: feedback || "",
      status: "graded",
      gradedAt: new Date().toISOString(),
    };

    if (db) {
      const result = await db.collection(COLLECTION).findOneAndUpdate(
        { id },
        { $set: patch },
        { returnDocument: "after" }
      );
      if (result) return NextResponse.json(cleanDoc(result));
    }

    return NextResponse.json({ id, ...patch });
  } catch (e) {
    console.error(`[submissions/${id}/grade PATCH]`, e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
