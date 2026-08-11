import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";
import { INITIAL_CLASSES } from "@/data/mockData";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_classes";

async function getDb() {
  const client = await clientPromise;
  if (!client) return null;
  return client.db(DB_NAME);
}

function cleanDoc(doc) {
  const { _id, ...rest } = doc;
  return { id: doc.id || _id.toString(), ...rest };
}

export async function GET() {
  try {
    const db = await getDb();
    if (db) {
      const data = await db.collection(COLLECTION).find({}).toArray();
      if (data.length === 0) {
        await db.collection(COLLECTION).insertMany(INITIAL_CLASSES.map(c => ({ ...c })));
        return NextResponse.json(INITIAL_CLASSES);
      }
      return NextResponse.json(data.map(cleanDoc));
    }
    return NextResponse.json(INITIAL_CLASSES);
  } catch (e) {
    return NextResponse.json(INITIAL_CLASSES);
  }
}
