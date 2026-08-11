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

// GET /api/events/[id]
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const db = await getDb();
    if (db) {
      const doc = await db.collection(COLLECTION).findOne({ id });
      if (doc) return NextResponse.json(cleanDoc(doc));
    }
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/events/[id]
export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const db = await getDb();
    const updated = { ...body, id };

    if (db) {
      await db.collection(COLLECTION).updateOne(
        { id },
        { $set: updated },
        { upsert: true }
      );
    }
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/events/[id]
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const db = await getDb();
    if (db) {
      await db.collection(COLLECTION).deleteOne({ id });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
