import { NextResponse } from 'next/server';
import clientPromise from '@/services/mongodb';

const DB_NAME = 'employeeDB';
const COLLECTION = 'lms_ts_submissions';

function cleanDoc(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: doc.id || _id?.toString(), ...rest };
}

export async function POST(req) {
  try {
    const ids = await req.json();
    const client = await clientPromise;
    if (!client) {
      // Mock mode
      return NextResponse.json(ids.map(id => ({ id, status: 'reviewed' })));
    }
    const db = client.db(DB_NAME);
    const updated = [];
    for (const id of ids) {
      const result = await db.collection(COLLECTION).findOneAndUpdate(
        { id },
        { $set: { status: 'reviewed' } },
        { returnDocument: 'after' }
      );
      if (result) updated.push(cleanDoc(result));
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
