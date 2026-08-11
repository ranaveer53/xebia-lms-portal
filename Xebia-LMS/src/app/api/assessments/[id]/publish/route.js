import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";
import { INITIAL_ASSESSMENTS } from "@/data/mockData";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_assessments";

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

async function ensureSeeded(db) {
  if (!db) return;
  const count = await db.collection(COLLECTION).countDocuments();
  if (count === 0) {
    await db.collection(COLLECTION).insertMany(INITIAL_ASSESSMENTS.map(a => ({ ...a })));
  }
}

// PATCH /api/assessments/[id]/publish — publish a draft assessment by ID
export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const db = await getDb();
    const patch = { status: "published", publishedAt: new Date().toISOString() };

    if (db) {
      await ensureSeeded(db);
      const result = await db.collection(COLLECTION).findOneAndUpdate(
        { id },
        { $set: patch },
        { returnDocument: "after", upsert: false }
      );
      if (result) return NextResponse.json(cleanDoc(result));
    }

    // Fallback: return with published status
    const mock = INITIAL_ASSESSMENTS.find(a => a.id === id) || { id };
    return NextResponse.json({ ...mock, ...patch });
  } catch (e) {
    console.error(`[assessments/${id}/publish PATCH]`, e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
