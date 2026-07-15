"use client";

import React, { useState } from "react";
import { useApp } from "../../lib/context";
import Filters from "../../components/filters/Filters";
import { Calendar, Users, MapPin, Video } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ClassesPage() {
  const router = useRouter();
  const { currentUser, classes } = useApp();
  const [timeFilter, setTimeFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All Batches");

  const userRole = currentUser?.role || "learner";

  // Filter classes based on selected filters
  const filteredClasses = classes.filter((c) => {
    if (batchFilter !== "All Batches" && c.batch !== batchFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">
            {userRole === "teacher" || userRole === "admin" ? "Class Directories" : "My Active Classes"}
          </h1>
          <p className="text-xs text-text-muted font-semibold mt-1">
            {userRole === "teacher" || userRole === "admin"
              ? "Manage batch assignments, course topics, and schedules."
              : "Access your current lectures, study materials, and virtual links."}
          </p>
        </div>

        <Filters
          selectedTime={timeFilter}
          onTimeChange={setTimeFilter}
          selectedBatch={batchFilter}
          onBatchChange={setBatchFilter}
        />
      </div>

      {filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="bg-white border border-border p-6 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
                      {cls.batch}
                    </span>
                    <h2 className="text-lg font-black text-foreground mt-3">{cls.name}</h2>
                    <span className="text-xs text-text-muted font-semibold block mt-0.5">{cls.subject}</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                    <Calendar size={22} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
                  <div className="flex items-center gap-2 text-xs text-foreground font-semibold">
                    <Video size={16} className="text-accent" />
                    <span>{(cls as any).virtualRoomLink ? "Virtual Room" : "Virtual Room"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground font-semibold">
                    <Users size={16} className="text-primary" />
                    <span>
                      {userRole === "teacher" || userRole === "admin" ? `${(cls as any).studentCount || "—"} Registered` : `Instructor: ${cls.teacherName}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 mt-6 flex justify-between items-center">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{cls.time}</span>
                <button
                  onClick={() => {
                    if (userRole === "teacher" || userRole === "admin") {
                      router.push("/learners");
                    } else {
                      const link = (cls as any).virtualRoomLink;
                      if (link) {
                        window.open(link, "_blank");
                      } else {
                        alert("No virtual room link available for this class.");
                      }
                    }
                  }}
                  className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  {userRole === "teacher" || userRole === "admin" ? "Manage Students" : "Join Lecture"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-border p-12 text-center rounded-2xl">
          <span className="text-sm font-bold text-text-muted uppercase tracking-wider">No lectures match current filters.</span>
        </div>
      )}
    </div>
  );
}
