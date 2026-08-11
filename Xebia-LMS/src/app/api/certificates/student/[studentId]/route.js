import { NextResponse } from 'next/server';
import clientPromise from '@/services/mongodb';

const DB_NAME = 'employeeDB';
const COLLECTION = 'lms_ts_certificates';

function cleanDoc(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: doc.id || _id?.toString(), ...rest };
}

export async function GET(req, { params }) {
  try {
    const { studentId } = await params;
    const client = await clientPromise;
    if (!client) return NextResponse.json([]);
    const db = client.db(DB_NAME);
    const docs = await db.collection(COLLECTION).find({ studentId }).toArray();
    return NextResponse.json(docs.map(cleanDoc));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
