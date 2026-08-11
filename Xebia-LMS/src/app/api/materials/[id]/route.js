import { NextResponse } from 'next/server';
import clientPromise from '@/services/mongodb';

const DB_NAME = 'employeeDB';
const COLLECTION = 'lms_ts_materials';

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
