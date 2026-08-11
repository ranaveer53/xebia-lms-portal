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

// GET /api/assessments/[id]
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const db = await getDb();
    if (db) {
      await ensureSeeded(db);
      const doc = await db.collection(COLLECTION).findOne({ id });
      if (doc) return NextResponse.json(cleanDoc(doc));
    }
    const fallback = INITIAL_ASSESSMENTS.find(a => a.id === id);
    if (fallback) return NextResponse.json(fallback);
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/assessments/[id] — update assessment
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

// PATCH /api/assessments/[id] — partial update (used for publish by ID, status change)
export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const db = await getDb();

    // Try to parse body, but PATCH /publish has no body so handle gracefully
    let body = {};
    try { body = await request.json(); } catch (e) {}

    const patch = { ...body, status: body.status || "published", publishedAt: new Date().toISOString() };

    if (db) {
      await ensureSeeded(db);
      await db.collection(COLLECTION).updateOne(
        { id },
        { $set: patch },
        { upsert: false }
      );
      const updated = await db.collection(COLLECTION).findOne({ id });
      if (updated) return NextResponse.json(cleanDoc(updated));
    }

    // Fallback: return mock record with published status
    const mock = INITIAL_ASSESSMENTS.find(a => a.id === id);
    return NextResponse.json({ ...(mock || { id }), ...patch });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/assessments/[id]
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
