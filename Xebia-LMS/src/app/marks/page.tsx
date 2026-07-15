"use client";

import React, { useState } from "react";
import { useApp } from "../../lib/context";
import Filters from "../../components/filters/Filters";
import { FileCheck, Sparkles, TrendingUp, Search } from "lucide-react";

export default function MarksPage() {
  const { currentUser, submissions } = useApp();
  const [timeFilter, setTimeFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All Batches");
  const [search, setSearch] = useState("");

  const userRole = currentUser?.role || "learner";
  const userId = currentUser?.id || "";

  // Filter graded submissions
  const gradedList = submissions.filter((s) => {
    if (s.status !== "marked") return false;
    if (search && !s.learnerName.toLowerCase().includes(search.toLowerCase()) && !s.assessmentTitle.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (userRole === "learner") {
      if (s.learnerId !== userId) return false;
      // Only filter by batch if the learner has one set; otherwise show all their submissions
      const studentBatch = currentUser?.batch?.trim();
      if (studentBatch && s.batch && s.batch.trim().toLowerCase() !== studentBatch.toLowerCase()) return false;
    } else {
      if (batchFilter !== "All Batches" && s.batch !== batchFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">
            {userRole === "teacher" || userRole === "admin" ? "Academic Grades Board" : "My Graded Scorecards"}
          </h1>
          <p className="text-xs text-text-muted font-semibold mt-1">
            {userRole === "teacher" || userRole === "admin"
              ? "Review overall candidate performance metrics and feedback sheets."
              : "Review your scored marks, performance breakdowns, and instructor feedback."}
          </p>
        </div>

        <Filters
          selectedTime={timeFilter}
          onTimeChange={setTimeFilter}
          selectedBatch={batchFilter}
          onBatchChange={setBatchFilter}
          hideBatch={userRole !== "teacher" && userRole !== "admin"}
        />
      </div>

      {/* Stats summary banner */}
      <div className="bg-gradient-to-br from-[#4A1E47] via-[#6C1D5F] to-[#84117C] text-white p-6 rounded-2xl shadow-xs relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-white/70 uppercase tracking-widest block">Summary stats</span>
            <h2 className="text-xl font-black">
              {userRole === "teacher" || userRole === "admin" ? "Class Average score: 86.4%" : "Your Completed track is active."}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 border border-white/10 rounded-xl">
              <TrendingUp size={24} className="text-accent" />
            </div>
            <div>
              <span className="text-xs text-white/70 font-semibold block">Total Evaluated</span>
              <span className="text-base font-black">{gradedList.length} Quizzes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      {(userRole === "teacher" || userRole === "admin") && (
        <div className="bg-white border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <Search size={18} className="text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search marks by student name or assessment topic..."
            className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-text-muted"
          />
        </div>
      )}

      {/* Graded List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
        {gradedList.length > 0 ? (
          gradedList.map((grade) => (
            <div
              key={grade.id}
              className="bg-white border border-border p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 mr-2">
                      {grade.batch}
                    </span>
                    <span className="text-[10px] font-black uppercase text-text-muted bg-[#F7F8FC] px-2.5 py-1 rounded-full border border-border">
                      {grade.subject}
                    </span>
                    <h3 className="font-black text-lg text-foreground mt-3 leading-tight">
                      {grade.assessmentTitle}
                    </h3>
                    {(userRole === "teacher" || userRole === "admin") && (
                      <span className="text-xs font-bold text-primary block mt-1">Student: {grade.learnerName}</span>
                    )}
                  </div>
                  
                  <div className="inline-flex items-baseline gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3.5 py-2 rounded-xl font-black">
                    <span className="text-xl">{grade.marksObtained}</span>
                    <span className="text-[10px] text-emerald-600">/{grade.totalMarks}</span>
                  </div>
                </div>

                {/* Feedback Panel */}
                <div className="bg-[#F7F8FC] border border-border/50 p-4 rounded-xl space-y-1.5">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">
                    Instructor Evaluation Remarks
                  </span>
                  <p className="text-xs text-foreground font-semibold leading-relaxed">
                    {grade.feedback || "Excellent answer set. Core design tokens and structure rules are correctly implemented."}
                  </p>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 mt-6 flex justify-between items-center text-xs font-bold text-text-muted">
                <div className="flex items-center gap-1.5">
                  <FileCheck size={14} className="text-emerald-500" />
                  <span>Evaluated successfully</span>
                </div>
                <span className="text-[11px] font-medium">
                  {new Date(grade.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-border p-12 text-center rounded-2xl col-span-2">
            <span className="text-sm font-bold text-text-muted uppercase tracking-wider">
              No graded assessments found
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
