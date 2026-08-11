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

// POST /api/events/[id]/register?userId=...
export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const event = await db.collection(COLLECTION).findOne({ id });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const registeredUsers = event.registeredUsers || [];
    if (!registeredUsers.includes(userId)) {
      registeredUsers.push(userId);
    }

    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { id },
      { $set: { registeredUsers } },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      message: "Successfully registered",
      event: cleanDoc(result)
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/events/[id]/register?userId=...
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const event = await db.collection(COLLECTION).findOne({ id });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const registeredUsers = (event.registeredUsers || []).filter(u => u !== userId);

    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { id },
      { $set: { registeredUsers } },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      message: "Successfully cancelled registration",
      event: cleanDoc(result)
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
