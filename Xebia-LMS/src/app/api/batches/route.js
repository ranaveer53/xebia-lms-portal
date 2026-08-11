import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";
import { BATCHES } from "@/data/mockData";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_batches";

async function getDb() {
  const client = await clientPromise;
  if (!client) return null;
  return client.db(DB_NAME);
}

// GET /api/batches — return list of batch names
export async function GET() {
  try {
    const db = await getDb();
    if (db) {
      const data = await db.collection(COLLECTION).find({}).toArray();
      if (data.length === 0) {
        const batchDocs = BATCHES.map((name, i) => ({ id: `batch-${i + 1}`, name }));
        await db.collection(COLLECTION).insertMany(batchDocs);
        return NextResponse.json(BATCHES);
      }
      return NextResponse.json(data.map(d => d.name || d.id));
    }
    return NextResponse.json(BATCHES);
  } catch (e) {
    return NextResponse.json(BATCHES);
  }
}
