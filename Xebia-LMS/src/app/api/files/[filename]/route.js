import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";

const DB_NAME = "employeeDB";
const COLLECTION = "lms_ts_files";

// GET /api/files/[filename] — serve file from MongoDB
export async function GET(request, { params }) {
  const { filename } = await params;
  try {
    const db = await clientPromise ? (await clientPromise).db(DB_NAME) : null;
    if (db) {
      const fileDoc = await db.collection(COLLECTION).findOne({ filename });
      if (fileDoc && fileDoc.data) {
        const fileBuffer = Buffer.from(fileDoc.data, "base64");
        return new Response(fileBuffer, {
          headers: {
            "Content-Type": fileDoc.mimeType || "application/octet-stream",
            "Content-Disposition": `inline; filename="${fileDoc.originalName}"`,
          },
        });
      }
    }

    // Fallback: return a dummy file if not found in DB
    const dummyText = `This is a mock fallback file content for: ${filename}`;
    const dummyBuffer = Buffer.from(dummyText);
    return new Response(dummyBuffer, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${filename}.txt"`,
      },
    });
  } catch (e) {
    console.error("[api/files/[filename] GET]", e);
    return new Response("Error loading file", { status: 500 });
  }
}
