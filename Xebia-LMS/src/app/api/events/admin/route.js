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

// GET /api/events/admin — returns all events including drafts
export async function GET() {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json([]);
    const data = await db.collection(COLLECTION).find({}).toArray();
    return NextResponse.json(data.map(cleanDoc));
  } catch (e) {
    return NextResponse.json([]);
  }
}
