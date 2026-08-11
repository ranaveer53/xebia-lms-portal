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
    const data = await req.json();
    const client = await clientPromise;
    if (!client) {
      // Mock mode
      return NextResponse.json(data.map(d => ({ ...d, status: 'reviewed' })));
    }
    const db = client.db(DB_NAME);
    const updated = [];
    for (const item of data) {
      const result = await db.collection(COLLECTION).findOneAndUpdate(
        { id: item.id },
        { $set: { marks: item.marks, feedback: item.feedback, status: 'graded', gradedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      if (result) updated.push(cleanDoc(result));
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
