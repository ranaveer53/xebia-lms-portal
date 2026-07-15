"use client";

import React from "react";
import { useApp } from "../../lib/context";
import { User, Mail, Shield, BookOpen, Layers } from "lucide-react";

export default function ProfilePage() {
  const { currentUser, classes } = useApp();

  const userRole = currentUser?.role || "learner";
  const userName = currentUser?.name || "User";
  const userEmail = currentUser?.email || "";
  const userAvatar = currentUser?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";

  return (
    <div className="space-y-6">
      
      {/* Header title */}
      <div>
        <h1 className="text-2xl font-black text-foreground">User Profile Settings</h1>
        <p className="text-xs text-text-muted font-semibold mt-1">Manage registration parameters, profiles, and active security keys.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
        
        {/* Profile Card details */}
        <div className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-6 lg:col-span-1 text-center">
          <div className="space-y-3">
            <img
              src={userAvatar}
              alt={userName}
              className="w-24 h-24 rounded-2xl border-2 border-primary object-cover mx-auto shadow-xs"
            />
            <div>
              <h2 className="text-lg font-black text-foreground">{userName}</h2>
              <span className="text-[10px] text-text-muted font-black uppercase tracking-wider block mt-1">
                {userRole === "admin" ? "Portal Administrator" : userRole === "teacher" ? "Principal Instructor" : "Batch Learner Candidate"}
              </span>
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 space-y-3 text-left text-xs font-semibold text-foreground">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-primary" />
              <span>{userEmail}</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-accent" />
              <span className="capitalize">{userRole} Role Permissions</span>
            </div>
            {userRole === "learner" && currentUser?.batch && (
              <div className="flex items-center gap-3">
                <Layers size={16} className="text-cta" />
                <span>Enrolled in: {currentUser.batch}</span>
              </div>
            )}
          </div>
        </div>

        {/* Classes and metadata details */}
        <div className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-6 lg:col-span-2">
          <h3 className="text-xs font-black text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">
            Academic Schedule & Settings
          </h3>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border border-border/60 rounded-xl bg-[#F7F8FC]/50">
              <div className="p-2.5 bg-primary/5 border border-primary/10 rounded-lg text-primary">
                <BookOpen size={20} />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-sm text-foreground block">
                  {userRole === "learner" ? "Active Courses Enrolled" : "Managed Classes"}
                </span>
                <span className="text-xs text-text-muted block">
                  {classes.length > 0
                    ? classes
                        .filter(c => !currentUser?.batch || c.batch === currentUser.batch || userRole !== "learner")
                        .map(c => c.subject || c.name)
                        .filter(Boolean)
                        .join(", ") || "No classes assigned yet"
                    : "Loading courses..."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-border p-4 rounded-xl space-y-1 bg-[#F7F8FC]/20">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Security status</span>
                <span className="text-xs font-bold text-emerald-700 block">Session Authenticated (JWT)</span>
              </div>
              <div className="border border-border p-4 rounded-xl space-y-1 bg-[#F7F8FC]/20">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">System mode</span>
                <span className="text-xs font-bold text-primary block">Local Cache Simulation Active</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
