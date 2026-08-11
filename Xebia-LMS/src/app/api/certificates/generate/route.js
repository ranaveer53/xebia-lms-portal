import { NextResponse } from 'next/server';
import clientPromise from '@/services/mongodb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'employeeDB';

function cleanDoc(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: doc.id || _id?.toString(), ...rest };
}

export async function POST(req) {
  try {
    const { studentId, assessmentId } = await req.json();
    const client = await clientPromise;
    
    let certId = uuidv4();
    let certDoc = {
      id: certId,
      studentId,
      studentName: 'Mock Student',
      assessmentId,
      assessmentTitle: 'Mock Assessment',
      subject: 'Mock Subject',
      batch: 'Mock Batch',
      issuedAt: new Date().toISOString(),
      percentage: 95
    };

    if (!client) {
      return NextResponse.json(certDoc);
    }
    
    const db = client.db(DB_NAME);
    const sub = await db.collection('lms_ts_submissions').findOne({ studentId, assessmentId });
    if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    
    const assessment = await db.collection('lms_ts_assessments').findOne({ id: assessmentId });
    const totalMarks = assessment?.totalMarks || sub.totalMarks || 100;
    const marks = sub.marks || 0;
    const percentage = (marks / totalMarks) * 100;
    
    if (percentage < 90) {
      return NextResponse.json({ error: 'Score is below 90%' }, { status: 400 });
    }
    
    certDoc = {
      id: certId,
      studentId: sub.studentId,
      studentName: sub.studentName || 'Student',
      assessmentId: sub.assessmentId,
      assessmentTitle: assessment?.title || sub.assessmentTitle || 'Assessment',
      subject: assessment?.subject || 'Subject',
      batch: sub.batch || 'General',
      issuedAt: new Date().toISOString(),
      percentage
    };
    
    await db.collection('lms_ts_certificates').insertOne({ ...certDoc });
    return NextResponse.json(certDoc);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
