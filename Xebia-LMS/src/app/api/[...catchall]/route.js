import { NextResponse } from "next/server";

// Catch-all route to handle un-implemented legacy API endpoints (e.g., /api/courses, /api/categories, /api/analytics/*)
// Returns empty arrays or mock success responses to prevent 404s in layouts.
export async function GET(request, { params }) {
  const { catchall } = await params;
  const path = catchall.join("/");

  console.log(`[API Catch-all GET] fallback response for: /api/${path}`);

  // Return realistic mock responses for analytics to populate leadership page charts
  if (path.startsWith("analytics/")) {
    return NextResponse.json({
      totalEmployees: 2500,
      employeesNominated: 2150,
      employeesTrained: 1850,
      learningCoveragePercentage: 74.5,
      totalSessionsConducted: 145,
      totalAttendees: 2600,
      totalNominations: 2750,
      totalLearningHours: 6500,
      averageHoursPerSession: 4.8,
      totalCertificationsCompleted: 380,
      certificationGrowthPercentage: 14.2,
      employeesTrainedInAI: 850,
      aiCertificationsAchieved: 140,
      aiLearningHours: 2900,
      averageFeedbackRating: 4.62,
      trainingSatisfactionScore: 88,
      recommendationPercentage: 91,
      top10ActiveLearners: [
        { name: "John Doe", progress: 95, track: "Next.js Architecture" },
        { name: "Esther Miles", progress: 92, track: "Kubernetes Pathway" },
        { name: "Sarah Connor", progress: 78, track: "Spring Boot Basics" }
      ]
    });
  }

  return NextResponse.json([]);
}

export async function POST(request, { params }) {
  const { catchall } = await params;
  const path = catchall.join("/");
  console.log(`[API Catch-all POST] fallback response for: /api/${path}`);
  return NextResponse.json({ success: true });
}

export async function PUT(request, { params }) {
  const { catchall } = await params;
  const path = catchall.join("/");
  console.log(`[API Catch-all PUT] fallback response for: /api/${path}`);
  return NextResponse.json({ success: true });
}

export async function DELETE(request, { params }) {
  const { catchall } = await params;
  const path = catchall.join("/");
  console.log(`[API Catch-all DELETE] fallback response for: /api/${path}`);
  return NextResponse.json({ success: true });
}
