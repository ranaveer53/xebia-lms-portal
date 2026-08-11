import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_events";

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

// POST /api/events/[id]/publish
export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { id },
      { $set: { status: "published", publishedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    if (!result) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json(cleanDoc(result));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
