import { NextResponse } from "next/server";

// GET /api/dashboard — stub response to prevent 404 console errors
export async function GET() {
  return NextResponse.json({
    totalCourses: 4,
    completedCourses: 1,
    inProgressCourses: 2,
    activeLearners: 120,
    averagePassingRate: 85,
    upcomingDeadlines: 3,
    learningHours: 34.5
  });
}
