import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_materials";

async function getDb() {
  const client = await clientPromise;
  if (!client) return null;
  return client.db(DB_NAME);
}

function cleanDoc(doc) {
  const { _id, ...rest } = doc;
  return { id: doc.id || _id.toString(), ...rest };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batch = searchParams.get("batch");
    const db = await getDb();
    if (!db) return NextResponse.json([]);
    const query = batch ? { batch } : {};
    const data = await db.collection(COLLECTION).find(query).toArray();
    return NextResponse.json(data.map(cleanDoc));
  } catch (e) {
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const db = await getDb();
    const material = {
      ...body,
      id: body.id || `mat-${Date.now()}`,
      uploadedAt: body.uploadedAt || new Date().toISOString(),
    };
    if (db) {
      await db.collection(COLLECTION).updateOne({ id: material.id }, { $set: material }, { upsert: true });
    }
    return NextResponse.json(material, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
