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
    const { id } = await params;
    const client = await clientPromise;
    if (!client) return NextResponse.json({ id, percentage: 95 });
    const db = client.db(DB_NAME);
    const doc = await db.collection(COLLECTION).findOne({ id });
    return NextResponse.json(doc ? cleanDoc(doc) : null);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
