import { NextResponse } from 'next/server';
import clientPromise from '@/services/mongodb';

const DB_NAME = 'employeeDB';

function cleanDoc(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: doc.id || _id?.toString(), ...rest };
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json({
        submission: { id, marks: 80, totalMarks: 100, status: 'reviewed' },
        assessment: { id: 'a1', title: 'Mock Assessment' },
        learner: { id: 'l1', name: 'Mock Learner' }
      });
    }
    const db = client.db(DB_NAME);
    const sub = await db.collection('lms_ts_submissions').findOne({ id });
    if (!sub) return NextResponse.json(null);
    const assessment = await db.collection('lms_ts_assessments').findOne({ id: sub.assessmentId });
    const learner = await db.collection('users').findOne({ empId: sub.studentId }) || { name: sub.studentName, empId: sub.studentId };
    return NextResponse.json({
      submission: cleanDoc(sub),
      assessment: assessment ? cleanDoc(assessment) : { title: 'Unknown' },
      learner: { name: learner.name || learner.employeeName, id: learner.empId || sub.studentId }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
