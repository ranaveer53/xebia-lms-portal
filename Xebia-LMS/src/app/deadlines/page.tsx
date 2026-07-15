"use client";

import React, { useState } from "react";
import { useApp } from "../../lib/context";
import Filters from "../../components/filters/Filters";
import { Calendar, Clock, AlertTriangle, Play, FileText, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeadlinesPage() {
  const router = useRouter();
  const { currentUser, assessments, submissions } = useApp();
  const [timeFilter, setTimeFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All Batches");

  const userRole = currentUser?.role || "learner";
  const userId = currentUser?.id || "";

  // Get active assessments deadlines
  const publishedAssessments = assessments.filter(a => a.status === "published");

  const filteredDeadlines = publishedAssessments
    .filter((a) => {
      if (userRole === "learner") {
        const studentBatch = currentUser?.batch?.trim();
        if (!studentBatch) return true; // no batch = see all published
        const bl = studentBatch.toLowerCase();
        return a.batches?.some(b => b.trim().toLowerCase() === bl) || (a.batch?.trim().toLowerCase() === bl);
      }
      if (batchFilter !== "All Batches") {
        return a.batches?.includes(batchFilter) || a.batch === batchFilter;
      }
      return true;
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const getSubStatus = (assessmentId: string) => {
    const sub = submissions.find(s => s.assessmentId === assessmentId && s.learnerId === userId);
    return !!sub;
  };

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Schedules & Deadlines</h1>
          <p className="text-xs text-text-muted font-semibold mt-1">
            Keep track of upcoming quiz deadlines, cutoffs, and scheduled submissions.
          </p>
        </div>

        <Filters
          selectedTime={timeFilter}
          onTimeChange={setTimeFilter}
          selectedBatch={batchFilter}
          onBatchChange={setBatchFilter}
          hideBatch={userRole === "learner"}
        />
      </div>

      {/* Deadlines List */}
      <div className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">
          Chronological Cutoff Schedule
        </h3>

        {filteredDeadlines.length > 0 ? (
          <div className="relative border-l border-border/60 ml-4 pl-6 space-y-6 py-2">
            {filteredDeadlines.map((item) => {
              const isSubmitted = userRole === "learner" && getSubStatus(item.id);
              const isOverdue = new Date(item.deadline) < new Date();
              
              return (
                <div key={item.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-all ${
                    isSubmitted
                      ? "border-emerald-500 bg-emerald-50"
                      : isOverdue
                      ? "border-rose-500 bg-rose-50"
                      : "border-primary bg-primary/5"
                  }`} />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-xl bg-[#F7F8FC]/50 hover:bg-[#F7F8FC] transition-all">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/10">
                          {item.batch}
                        </span>
                        <span className="text-[10px] font-black uppercase text-text-muted bg-white px-2.5 py-0.5 rounded-full border border-border">
                          {item.subject}
                        </span>
                        {isOverdue && !isSubmitted && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            <AlertTriangle size={10} /> Overdue
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <CheckCircle size={10} /> Submitted
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-foreground pt-1">{item.title}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted font-semibold pt-1">
                        <Clock size={12} className="text-primary" />
                        <span>Deadline: {new Date(item.deadline).toLocaleString()}</span>
                      </div>
                    </div>

                    {userRole === "learner" && !isSubmitted && !isOverdue && (
                      <button
                        onClick={() => router.push(`/assessments/submit/${item.id}`)}
                        className="bg-primary hover:bg-primary-dark text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all flex-shrink-0"
                      >
                        <Play size={10} /> Start Solving
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs font-bold text-text-muted uppercase tracking-widest bg-[#F7F8FC]/50 rounded-xl border border-dashed border-border">
            No deadlines scheduled for current batch
          </div>
        )}
      </div>

    </div>
  );
}
