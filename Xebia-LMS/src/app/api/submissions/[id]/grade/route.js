import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_submissions";

async function getDb() {
  const client = await clientPromise;
  if (!client) return null;
  return client.db(DB_NAME);
}

function cleanDoc(doc) {
  const { _id, ...rest } = doc;
  return { id: doc.id || _id.toString(), ...rest };
}

// PATCH /api/submissions/[id]/grade — grade a submission
export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { marks, feedback } = body;
    const db = await getDb();

    const patch = {
      marksObtained: marks,
      feedback: feedback || "",
      status: "graded",
      gradedAt: new Date().toISOString(),
    };

    if (db) {
      const result = await db.collection(COLLECTION).findOneAndUpdate(
        { id },
        { $set: patch },
        { returnDocument: "after" }
      );
      if (result) {
        const submission = result;
        // Auto-generate certificate if score >= 90%
        if (submission.marksObtained !== undefined && submission.totalMarks) {
          const percentage = (submission.marksObtained / submission.totalMarks) * 100;
          if (percentage >= 90 && submission.learnerId && submission.assessmentId) {
            const existingCert = await db.collection("lms_ts_certificates").findOne({
              studentId: submission.learnerId,
              assessmentId: submission.assessmentId
            });
            
            if (!existingCert) {
              const certDoc = {
                id: `cert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                studentId: submission.learnerId,
                studentName: submission.learnerName || 'Student',
                assessmentId: submission.assessmentId,
                assessmentTitle: submission.assessmentTitle || 'Assessment',
                subject: submission.subject || 'Subject',
                batch: submission.batch || 'General',
                issuedAt: new Date().toISOString(),
                percentage
              };
              await db.collection("lms_ts_certificates").insertOne(certDoc);
            }
          }
        }
        return NextResponse.json(cleanDoc(submission));
      }
    }

    return NextResponse.json({ id, ...patch });
  } catch (e) {
    console.error(`[submissions/${id}/grade PATCH]`, e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
