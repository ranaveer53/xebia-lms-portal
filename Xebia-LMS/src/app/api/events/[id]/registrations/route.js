import { NextResponse } from "next/server";
import clientPromise from "@/services/mongodb";

const DB_NAME = "employeeDB";
const EVENTS_COLLECTION = "lms_ts_events";
const USERS_COLLECTION = "lms_learner_credentials";

async function getDb() {
  const client = await clientPromise;
  if (!client) return null;
  return client.db(DB_NAME);
}

// GET /api/events/[id]/registrations
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const db = await getDb();
    if (!db) return NextResponse.json([]);

    const event = await db.collection(EVENTS_COLLECTION).findOne({ id });
    if (!event) return NextResponse.json([]);

    const registeredUserIds = event.registeredUsers || [];
    if (registeredUserIds.length === 0) return NextResponse.json([]);

    // Query details for all registered users
    const users = await db.collection(USERS_COLLECTION).find({
      id: { $in: registeredUserIds }
    }).toArray();

    // Map to registration responses
    const responses = users.map(user => ({
      userId: user.id,
      name: user.learnerName || user.name || "Student",
      email: user.email,
      registrationDate: event.createdAt || new Date().toISOString(),
      status: "Registered"
    }));

    return NextResponse.json(responses);
  } catch (e) {
    console.error("[events/[id]/registrations GET]", e);
    return NextResponse.json([]);
  }
}
