import { NextResponse } from 'next/server';
import clientPromise from '@/services/mongodb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'employeeDB';
const COLLECTION = 'lms_ts_files';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const originalName = file.name;
    const ext = originalName.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    const mimeType = file.type;
    const size = file.size;
    const fileUrl = `/api/files/${filename}`;
    
    const fileDoc = { id: filename, originalName, filename, fileUrl, mimeType, size, uploadedAt: new Date().toISOString() };
    
    const client = await clientPromise;
    if (client) {
      const db = client.db(DB_NAME);
      await db.collection(COLLECTION).insertOne({ ...fileDoc });
    }
    
    return NextResponse.json(fileDoc);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
