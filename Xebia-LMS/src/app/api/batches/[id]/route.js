import { NextResponse } from 'next/server';
import clientPromise from '@/services/mongodb';

const DB_NAME = 'employeeDB';
const COLLECTION = 'lms_ts_batches';

function cleanDoc(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: doc.id || _id?.toString(), ...rest };
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    if (!client) return NextResponse.json({ id, batchName: 'Mock Batch' });
    const db = client.db(DB_NAME);
    const doc = await db.collection(COLLECTION).findOne({ id });
    return NextResponse.json(doc ? cleanDoc(doc) : null);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const client = await clientPromise;
    if (!client) return NextResponse.json({ id, ...updates });
    const db = client.db(DB_NAME);
    const doc = await db.collection(COLLECTION).findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return NextResponse.json(doc ? cleanDoc(doc) : null);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    if (!client) return NextResponse.json({ success: true });
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION).deleteOne({ id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
