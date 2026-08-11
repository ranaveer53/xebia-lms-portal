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

// GET /api/events
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const db = await getDb();
    if (!db) return NextResponse.json([]);

    const query = {};
    if (category) query.category = category;
    if (mode) query.mode = mode;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const data = await db.collection(COLLECTION).find(query).toArray();
    return NextResponse.json(data.map(cleanDoc));
  } catch (e) {
    console.error("[events GET]", e);
    return NextResponse.json([]);
  }
}

// POST /api/events
export async function POST(request) {
  try {
    const body = await request.json();
    const db = await getDb();

    const event = {
      ...body,
      id: body.id || `evt-${Date.now()}`,
      status: body.status || "draft",
      registeredUsers: body.registeredUsers || [],
      createdAt: new Date().toISOString(),
    };

    if (db) {
      await db.collection(COLLECTION).updateOne(
        { id: event.id },
        { $set: event },
        { upsert: true }
      );
    }

    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    console.error("[events POST]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
