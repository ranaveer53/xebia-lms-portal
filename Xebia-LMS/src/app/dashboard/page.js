"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Button from "../../components/common/Button";
import MetricCard from "../../components/common/MetricCard";
import { useGetCourses } from "../../hooks/useCourses";
import { useGetCategories } from "../../hooks/useCategories";
import { SkeletonPulse, CourseCardSkeleton } from "../../components/common/Skeleton";
import { useQuery } from "@tanstack/react-query";
import { assessmentService } from "../../services/api";
import {
  BookOpen,
  Award,
  Clock,
  ArrowRight,
  ShieldCheck,
  Flame,
  Activity,
  Compass,
  Tag,
  ClipboardList
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Consultant";
  const userEmail = session?.user?.email || "";

  const { data: courses, isLoading: coursesLoading } = useGetCourses();
  const { data: categories, isLoading: categoriesLoading } = useGetCategories();

  // Dynamic assessments query
  const { data: assignedAssessments = [], isLoading: assessmentsLoading } = useQuery({
    queryKey: ["assigned-assessments", userEmail],
    queryFn: () => assessmentService.getAssessmentsForLearner(userEmail),
    enabled: !!userEmail,
  });

  // Dynamic results query
  const { data: submissions = [] } = useQuery({
    queryKey: ["my-submissions", userEmail],
    queryFn: () => assessmentService.getResults(userEmail),
    enabled: !!userEmail,
  });

  // Mock progress database corresponding to enrolled courses
  const enrollmentProgress = {
    "course-nextjs": { percentage: 60, currentLesson: "server-client-components", lessonTitle: "Server vs. Client Components" },
    "course-springboot": { percentage: 25, currentLesson: "spring-context-setup", lessonTitle: "Spring Core & Setup" },
  };

  const getCompletedCount = () => {
    return Object.values(enrollmentProgress).filter((c) => c.percentage === 100).length;
  };

  const getIncompleteCount = () => {
    return Object.keys(enrollmentProgress).length - getCompletedCount();
  };

  // Dynamically build activity feed
  const recentActivities = [
    ...submissions.map((sub) => ({
      id: sub.id,
      type: "assessment",
      text: `${sub.passed ? "Passed" : "Completed"} assessment '${sub.assessmentTitle}' with ${sub.percentage}%`,
      time: new Date(sub.submittedAt).toLocaleDateString()
    })),
    { id: "act-1", type: "completion", text: "Completed lesson 'App Router Directory Structure'", time: "2 hours ago" },
    { id: "act-2", type: "enrollment", text: "Enrolled in 'Next.js Production Architecture'", time: "2 days ago" },
  ].slice(0, 5); // Limit to top 5 activities

  const completedBadgesCount = submissions.filter(s => s.passed).length;

  return (
    <>
      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-dark via-primary to-secondary rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-md">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-accent/20 to-transparent blur-3xl" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10">
            <Flame className="w-4 h-4 text-accent animate-pulse" />
            <span>Learning streak: 5 days</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
              Welcome back, {userName}!
            </h1>
            <p className="text-xs md:text-sm text-white/80 max-w-2xl leading-relaxed">
              Expand your skills matrix this quarter. Finish your active courses to acquire certification badges in Next.js and Kubernetes ecosystems.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Courses In Progress"
          value={coursesLoading ? "..." : getIncompleteCount()}
          icon={BookOpen}
          trend="+1 this week"
          description="Enrolled catalog active entries"
          gradientScheme="primary"
        />
        <MetricCard
          title="Completed Badges"
          value={completedBadgesCount}
          icon={Award}
          trend={`${completedBadgesCount > 0 ? "100% pass score" : "No badges yet"}`}
          description="Syllabus segments fully completed"
          gradientScheme="primary"
        />
        <MetricCard
          title="Hours spent learning"
          value="12.5 hrs"
          icon={Clock}
          trend="+2.4 hrs vs last week"
          description="Active learning duration telemetry"
          gradientScheme="primary"
        />
      </div>

      {/* 3. Core Grid: Continue Learning vs Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Continue Learning list & My Assessments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Continue Learning */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-primary flex items-center gap-2">
              <span>Continue Learning</span>
              <span className="px-2.5 py-0.5 text-[10px] bg-primary/10 rounded-full font-bold text-primary">Active</span>
            </h2>

            {coursesLoading ? (
              <div className="space-y-4">
                <CourseCardSkeleton />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {courses?.filter((c) => enrollmentProgress[c.id]).map((course) => {
                  const progress = enrollmentProgress[course.id];
                  return (
                    <Card key={course.id} className="hover:shadow-md transition-shadow">
                      <CardBody className="p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="space-y-2 flex-1 w-full min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-accent/10 border border-accent/25 rounded-md text-[9px] font-black text-accent uppercase tracking-wider">
                              {course.level}
                            </span>
                            <span className="text-xs text-text-muted font-medium">{course.duration}</span>
                          </div>
                          <h3 className="text-base font-black text-foreground truncate leading-snug">{course.title}</h3>
                          <p className="text-xs text-text-muted flex items-center gap-1.5 truncate font-medium">
                            <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0" />
                            <span>Active lesson: {progress.lessonTitle}</span>
                          </p>
                          
                          {/* Progress slider bar */}
                          <div className="pt-2 flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent transition-all duration-300 rounded-full"
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-foreground">{progress.percentage}%</span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 w-full sm:w-auto">
                          <Link href={`/learn/${course.slug}/${progress.currentLesson}`}>
                            <Button variant="primary" size="sm" className="w-full justify-center">
                              <span>Resume</span>
                              <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Button>
                          </Link>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned Assessments */}
          {assignedAssessments.length > 0 && (
            <div className="space-y-4 pt-2">
              <h2 className="text-lg font-black text-primary flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-accent" />
                <span>My Assessments</span>
                <span className="px-2.5 py-0.5 text-[10px] bg-accent/10 rounded-full font-bold text-accent">
                  {assignedAssessments.length} Assigned
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedAssessments.map((assessment) => {
                  const hasSubmitted = submissions.find(s => s.assessmentId === assessment.id);
                  return (
                    <Card key={assessment.id} className={`hover:shadow-md transition-shadow border-l-4 ${hasSubmitted ? "border-l-emerald-500" : "border-l-accent"}`}>
                      <CardBody className="p-5 flex flex-col gap-3 justify-between h-full">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-black text-foreground text-sm line-clamp-1">{assessment.title}</h3>
                            {hasSubmitted && (
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${hasSubmitted.passed ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                                {hasSubmitted.passed ? "Passed" : "Failed"} ({hasSubmitted.percentage}%)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">{assessment.description}</p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-text-muted font-semibold">
                          <span>{assessment.questions?.length || 0} Questions</span>
                          <span>{assessment.durationMinutes} Min</span>
                          <span>Passing Score: {assessment.passingScore}%</span>
                        </div>
                        <Link href={`/assessment/${assessment.id}`}>
                          <Button variant={hasSubmitted ? "outline" : "primary"} size="sm" className="w-full justify-center mt-1">
                            <span>{hasSubmitted ? "Retake Assessment" : "Start Assessment"}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        </Link>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="space-y-6">
          <h2 className="text-lg font-black text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            <span>Recent Activity</span>
          </h2>
          
          <Card>
            <CardBody className="p-5 flex flex-col gap-4">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3 items-start text-xs border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground">{act.text}</p>
                    <span className="text-[10px] text-text-muted block font-medium">{act.time}</span>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* 4. Section: Recommended Courses */}
      <div className="space-y-6">
        <h2 className="text-lg font-black text-primary flex items-center gap-2">
          <Compass className="w-5 h-5 text-accent" />
          <span>Recommended for You</span>
        </h2>

        {coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CourseCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.filter((c) => !enrollmentProgress[c.id]).map((course) => (
              <Card key={course.id} className="h-full flex flex-col hoverable" hoverable>
                {/* Thumbnail banner overlay */}
                <div className="h-40 bg-gray-100 relative overflow-hidden flex-shrink-0 border-b border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-white/90 border border-border rounded-md text-[9px] font-black text-foreground uppercase tracking-wider shadow-xs">
                    {course.level}
                  </span>
                </div>

                <CardBody className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                      {categories?.find((cat) => cat.id === course.categoryId)?.name || "Academy"}
                    </span>
                    <h3 className="text-sm font-black text-foreground leading-snug line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                    <span className="text-xs font-semibold text-text-muted">{course.duration}</span>
                    <Link href={`/courses/${course.slug}`}>
                      <Button variant="outline" size="sm" className="group">
                        <span>Syllabus</span>
                        <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 5. Section: Popular Categories */}
      <div className="space-y-6">
        <h2 className="text-lg font-black text-primary flex items-center gap-2">
          <Tag className="w-5 h-5 text-accent" />
          <span>Popular Categories</span>
        </h2>

        {categoriesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonPulse className="h-28 w-full" />
            <SkeletonPulse className="h-28 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories?.map((cat) => (
              <Link key={cat.id} href={`/categories#${cat.slug}`}>
                <Card className="hover:border-primary/50 transition-all hover:bg-white/60 h-full">
                  <CardBody className="p-5 flex flex-col justify-between gap-3 h-full">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-black text-primary leading-tight truncate">{cat.name}</h3>
                      <p className="text-xs text-text-muted line-clamp-2 leading-normal">
                        {cat.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 text-[10px] text-accent font-black uppercase tracking-wider">
                      <span>{cat.coursesCount || 0} pathways</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
