import { NextResponse } from 'next/server';
import clientPromise from '@/services/mongodb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'employeeDB';
const COLLECTION = 'lms_ts_batches';

const MOCK_BATCHES = [
  { id: 'batch-1', batchName: 'Batch A', createdAt: new Date().toISOString() },
  { id: 'batch-2', batchName: 'Batch B', createdAt: new Date().toISOString() },
  { id: 'batch-3', batchName: 'Batch C', createdAt: new Date().toISOString() },
  { id: 'batch-4', batchName: 'Batch D', createdAt: new Date().toISOString() }
];

function cleanDoc(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: doc.id || _id?.toString(), ...rest };
}

export async function GET() {
  try {
    const client = await clientPromise;
    if (!client) return NextResponse.json(MOCK_BATCHES);
    const db = client.db(DB_NAME);
    const docs = await db.collection(COLLECTION).find({}).toArray();
    if (docs.length === 0) {
      // Seed data
      await db.collection(COLLECTION).insertMany([...MOCK_BATCHES]);
      return NextResponse.json(MOCK_BATCHES);
    }
    return NextResponse.json(docs.map(cleanDoc));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const newDoc = { id: uuidv4(), createdAt: new Date().toISOString(), ...data };
    const client = await clientPromise;
    if (!client) return NextResponse.json(newDoc);
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION).insertOne({ ...newDoc });
    return NextResponse.json(newDoc);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
