"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../../lib/context";
import { Certificate } from "../../types";
import { apiService } from "../../lib/apiService";
import { useRouter } from "next/navigation";
import { Award, Download, Eye, Calendar, Sparkles } from "lucide-react";

export default function CertificatesPage() {
  const { currentUser } = useApp();
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = currentUser?.id || "";
  const userRole = currentUser?.role || "learner";

  useEffect(() => {
    if (userId && userRole === "learner") {
      setLoading(true);
      apiService.getStudentCertificates(userId)
        .then(certs => {
          setCertificates(certs);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error loading certificates:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Admins and teachers can also view the certificates list
  // Only redirect completely unauthenticated users

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-black text-foreground">My Certificates</h1>
        <p className="text-xs text-text-muted font-semibold mt-1">
          View, preview, and download your earned academic accomplishments and professional certificates.
        </p>
      </div>

      {/* Accomplishment stats banner */}
      <div className="bg-gradient-to-br from-[#4A1E47] via-[#6C1D5F] to-[#84117C] text-white p-6 rounded-2xl shadow-xs relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-white/70 uppercase tracking-widest block">Accomplishments</span>
            <h2 className="text-xl font-black">
              {certificates.length > 0
                ? `Congratulations! You have unlocked ${certificates.length} certificates.`
                : "Complete quizzes with a score of 90% or higher to unlock certificates."}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 border border-white/10 rounded-xl">
              <Award size={24} className="text-white" />
            </div>
            <div>
              <span className="text-xs text-white/70 font-semibold block">Total Certificates</span>
              <span className="text-base font-black">{certificates.length} Earned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white border border-border p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                      {cert.subject}
                    </span>
                    <h3 className="font-black text-lg text-foreground mt-3 leading-tight font-serif">
                      {cert.assessmentTitle}
                    </h3>
                    <p className="text-[11px] text-text-muted font-bold font-sans">
                      Student: {cert.studentName}
                    </p>
                  </div>
                  
                  {/* Score badge */}
                  <div className="text-right space-y-1">
                    <div className="inline-flex items-baseline gap-0.5 bg-purple-50 text-purple-700 border border-purple-100 px-3.5 py-2 rounded-xl font-black">
                      <span className="text-xl font-serif">{cert.marksObtained}</span>
                      <span className="text-[10px] text-purple-600 font-sans">/{cert.totalMarks}</span>
                    </div>
                    <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 border border-purple-100 rounded-lg block text-center font-sans">
                      {cert.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Metadata details */}
                <div className="grid grid-cols-2 gap-4 border-t border-b border-border/50 py-4 text-xs font-semibold text-text-muted font-sans">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-primary" />
                    <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#84117C]" />
                    <span>Status: {cert.downloadCount > 0 ? "Downloaded" : "Unlocked"}</span>
                  </div>
                </div>

                {/* ID representation */}
                <div className="bg-[#F7F8FC] border border-border/50 px-4 py-2.5 rounded-xl flex items-center justify-between text-[10px] text-text-muted font-bold font-mono">
                  <span>Certificate ID:</span>
                  <span className="uppercase text-[9px] text-zinc-400 font-semibold break-all">{cert.id}</span>
                </div>
              </div>

              {/* Actions row */}
              <div className="border-t border-border/50 pt-4 mt-6 flex gap-3 font-sans">
                <button
                  onClick={() => router.push(`/certificates/${cert.id}`)}
                  className="flex-1 bg-accent hover:bg-accent-dark text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all uppercase"
                >
                  <Eye size={14} /> View Certificate
                </button>
                <button
                  onClick={() => router.push(`/certificates/${cert.id}?download=true`)}
                  className="flex-1 bg-[#84117C] hover:bg-[#6c0e66] text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all text-center uppercase"
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-border p-12 text-center rounded-2xl">
          <span className="text-sm font-bold text-text-muted uppercase tracking-wider block font-sans">
            No certificates unlocked yet
          </span>
          <p className="text-xs text-text-muted font-semibold mt-1 font-sans">
            Achieve a score of 90% or higher on assessments to unlock your certificate of completion.
          </p>
        </div>
      )}
    </div>
  );
}
