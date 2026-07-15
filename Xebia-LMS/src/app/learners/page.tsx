"use client";

import React, { useState } from "react";
import { useApp } from "../../lib/context";
import Filters from "../../components/filters/Filters";
import { UserCheck, Mail, BookOpen, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LearnersPage() {
  const router = useRouter();
  const { currentUser } = useApp();
  const [timeFilter, setTimeFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All Batches");
  const [search, setSearch] = useState("");

  const userRole = currentUser?.role || "learner";

  // Mock list of students since our database only contains seed credentials
  const studentsList = [
    { id: "l-1", name: "Flores Juanita", email: "learner@lms.com", batch: "Batch A", completed: 2, avgScore: "95%", status: "Active" },
    { id: "l-2", name: "John Doe", email: "john.doe@lms.com", batch: "Batch B", completed: 1, avgScore: "88%", status: "Active" },
    { id: "l-3", name: "Esther Miles", email: "esther.miles@lms.com", batch: "Batch A", completed: 2, avgScore: "92%", status: "Active" },
    { id: "l-4", name: "Alex Mercer", email: "alex.mercer@lms.com", batch: "Batch C", completed: 0, avgScore: "N/A", status: "Inactive" },
    { id: "l-5", name: "Sarah Connor", email: "sarah.connor@lms.com", batch: "Batch D", completed: 1, avgScore: "78%", status: "Active" }
  ];

  if (userRole !== "teacher" && userRole !== "admin") {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs font-bold text-rose-600">
        Access Denied. Only instructors and administrators can view the Learners Directory.
      </div>
    );
  }

  const filteredStudents = studentsList.filter((s) => {
    if (batchFilter !== "All Batches" && s.batch !== batchFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Registered Learners</h1>
          <p className="text-xs text-text-muted font-semibold mt-1">Review student progress, batch enrollments, and academic scores.</p>
        </div>

        <Filters
          selectedTime={timeFilter}
          onTimeChange={setTimeFilter}
          selectedBatch={batchFilter}
          onBatchChange={setBatchFilter}
        />
      </div>

      {/* Search Input */}
      <div className="bg-white border border-border p-4 rounded-2xl shadow-xs flex items-center gap-3">
        <Search size={18} className="text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter students by name or email address..."
          className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-text-muted"
        />
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            className="bg-white border border-border p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                    {student.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{student.name}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-text-muted font-semibold mt-0.5">
                      <Mail size={12} />
                      <span>{student.email}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  student.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-zinc-50 text-zinc-500 border-zinc-200"
                }`}>
                  {student.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4 mt-4">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Batch Enroll</span>
                  <span className="text-xs font-semibold text-foreground block mt-0.5">{student.batch}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Average Grade</span>
                  <span className="text-xs font-black text-primary block mt-0.5">{student.avgScore}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 mt-6 flex justify-between items-center text-xs font-bold text-text-muted">
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-primary" />
                <span>{student.completed} Assessments Done</span>
              </div>
              <button
                onClick={() => router.push(`/submissions?learnerId=${student.id}`)}
                className="text-primary hover:underline cursor-pointer"
              >
                Profile
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
