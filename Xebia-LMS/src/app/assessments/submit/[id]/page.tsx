"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../../../../lib/context";
import { useParams, useRouter } from "next/navigation";
import { Assessment, Submission, Certificate } from "../../../../types";
import { ArrowLeft, Clock, FileText, CheckCircle, Download, UploadCloud, X, Send, Eye, Award } from "lucide-react";
import FilePreviewModal from "../../../../components/files/FilePreviewModal";
import CertificatePreviewModal from "../../../../components/certificates/CertificatePreviewModal";
import { apiService } from "../../../../lib/apiService";

const formatSize = (bytes?: number) => {
  if (!bytes) return "0.0 MB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};


const handleDownloadFile = async (e: React.MouseEvent, fileUrl: string, originalName: string) => {
  e.preventDefault();
  try {
    const downloadUrl = fileUrl.includes("/files/preview/") 
      ? fileUrl.replace("/files/preview/", "/files/download/") 
      : fileUrl;
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error("Failed to fetch file for download");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading file:", error);
    window.open(fileUrl, "_blank");
  }
};

export default function SubmitAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params?.id as string;
  const { currentUser, assessments, submitAssessment, submissions } = useApp();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  
  // File submission states (for file attachment assessments)
  const [subFile, setSubFile] = useState<File | null>(null);
  
  const [submitted, setSubmitted] = useState(false);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);

  const userId = currentUser?.id || "";
  const userName = currentUser?.name || "Student";
  const userRole = currentUser?.role || "learner";

  useEffect(() => {
    if (assessmentId) {
      const match = assessments.find((a) => a.id === assessmentId);
      if (match) {
        setAssessment(match);
      }
    }
  }, [assessmentId, assessments]);

  // Only count as existing submission if actually submitted (not virtual pending/missing entries from backend)
  const existingSub = submissions.find((s) => 
    s.assessmentId === assessmentId && 
    s.learnerId === userId &&
    s.status !== "pending" &&
    s.status !== "missing"
  );

  useEffect(() => {
    if (existingSub && assessment && (existingSub.status === "marked" || existingSub.status === "Auto Graded")) {
      const pct = existingSub.percentage !== undefined ? existingSub.percentage : ((existingSub.marksObtained || 0) / existingSub.totalMarks) * 100;
      if (pct >= 90) {
        apiService.generateCertificate(userId, assessment.id)
          .then(cert => setCertificate(cert))
          .catch(err => console.error("Error generating/fetching certificate:", err));
      }
    }
  }, [existingSub, userId, assessment]);

  if (userRole !== "learner") {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs font-bold text-rose-600">
        Access Denied. Only student candidates can solve assessments.
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSelectOption = (qId: string, opt: string) => {
    setAnswers({ ...answers, [qId]: opt });
  };

  const handleTextChange = (qId: string, text: string) => {
    setAnswers({ ...answers, [qId]: text });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (assessment.questions.length > 0) {
      // Validate all answered
      const unanswered = assessment.questions.filter((q) => !answers[q.id]);
      if (unanswered.length > 0) {
        if (!confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) {
          return;
        }
      }
    } else {
      // Validate file attached
      if (!subFile) {
        alert("Please attach your solved submission file before submitting.");
        return;
      }
    }

    let uploadedFileUrl = "";
    let uploadedFileName = "";

    if (subFile) {
      try {
        const uploaded = await apiService.uploadFile(subFile);
        uploadedFileUrl = uploaded.fileUrl;
        uploadedFileName = uploaded.originalName;
      } catch (err) {
        alert("Failed to upload solved submission file. Please try again.");
        return;
      }
    }

    const newSub: Submission = {
      id: "s-" + Date.now(),
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      subject: assessment.subject,
      batch: assessment.batch,
      learnerId: userId,
      learnerName: userName,
      answers: answers,
      status: "submitted",
      totalMarks: assessment.totalMarks,
      submittedAt: new Date().toISOString(),
      submittedFileName: uploadedFileName || undefined,
      submittedFileUrl: uploadedFileUrl || undefined
    };

    await submitAssessment(newSub);
    setSubmitted(true);
  };

  if (submitted || existingSub) {
    return (
      <div className="max-w-md mx-auto bg-white border border-border p-8 rounded-2xl shadow-md text-center space-y-6 mt-12 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
          <CheckCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Assessment Submitted</h2>
          <p className="text-xs text-text-muted font-bold tracking-wide">
            Your answers have been securely logged in the system.
          </p>
        </div>
        
        {(existingSub?.status === "marked" || existingSub?.status === "Auto Graded") && (
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-center space-y-1.5">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Evaluated Score</span>
            <span className="text-2xl font-black text-emerald-700">{existingSub.marksObtained} / {existingSub.totalMarks}</span>
            {existingSub.feedback && (
              <p className="text-xs text-foreground italic border-t border-emerald-100 pt-2 mt-2 leading-relaxed">
                Feedback: {existingSub.feedback}
              </p>
            )}
          </div>
        )}

        {certificate && (
          <div className="bg-purple-50/50 border border-[#84117C]/15 p-5 rounded-xl text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-[#84117C]">
              <Award size={18} className="animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">Certificate Unlocked!</span>
            </div>
            <p className="text-[11px] text-text-muted font-semibold leading-relaxed">
              Congratulations! You scored 90% or above and earned an official Xebia certificate.
            </p>
            <button
              onClick={() => router.push(`/certificates/${certificate.id}`)}
              className="w-full bg-[#84117C] hover:bg-[#6c0e66] text-white font-bold py-2.5 rounded-lg text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Award size={14} /> View Certificate
            </button>
          </div>
        )}

        <button
          onClick={() => router.push("/assessments")}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl text-xs uppercase cursor-pointer"
        >
          Return to My Assessments
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header action panel */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/assessments")}
            className="p-2 border border-border rounded-xl text-text-muted hover:text-primary hover:bg-white transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">{assessment.title}</h1>
            <span className="text-xs text-text-muted font-bold tracking-wide">
              Subject: {assessment.subject} | Max Marks: {assessment.totalMarks}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-text-muted bg-white border border-border px-3.5 py-2 rounded-xl">
          <Clock size={14} className="text-primary" />
          <span>Timer Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: instructions / attachments */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">
              Instructions
            </h3>
            <p className="text-xs text-foreground leading-relaxed font-semibold">
              {assessment.instructions}
            </p>

            {(assessment.file || assessment.fileName) && (
              <div className="border border-border p-4 rounded-xl space-y-3 bg-[#F7F8FC]/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/5 border border-primary/10 rounded-lg text-primary">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs text-foreground block truncate">
                      {assessment.file ? assessment.file.originalName : assessment.fileName}
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      {assessment.file ? formatSize(assessment.file.size) : assessment.fileSize}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <a
                    href={assessment.file ? assessment.file.fileUrl : assessment.fileUrl}
                    download
                    onClick={(e) => handleDownloadFile(e, assessment.file ? assessment.file.fileUrl : assessment.fileUrl || "", assessment.file ? assessment.file.originalName : assessment.fileName || "document")}
                    className="bg-white border border-border text-foreground hover:bg-white hover:text-primary font-bold text-xs py-2 rounded-xl text-center flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Download size={14} /> Download
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowInlinePreview(true)}
                    className="bg-primary text-white hover:bg-primary-dark font-bold text-xs py-2 rounded-xl text-center flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Eye size={14} /> View Inline
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right pane: questions player */}
        <div className="space-y-6 lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {assessment.questions.length > 0 ? (
              <div className="space-y-6">
                {assessment.questions.map((q, idx) => (
                  <div key={q.id} className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-border/40 pb-2">
                      <span className="text-xs font-black text-primary uppercase">Question {idx + 1}</span>
                      <span className="text-xs font-semibold text-text-muted">{q.marks} Marks</span>
                    </div>

                    <p className="font-bold text-sm text-foreground">{q.text}</p>

                    {/* MCQ Options */}
                    {q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {q.options.map((opt, i) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectOption(q.id, opt)}
                              className={`p-3.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-3 ${
                                isSelected
                                  ? "bg-primary border-primary text-white shadow-xs"
                                  : "bg-[#F7F8FC]/50 border-border text-foreground hover:bg-[#F7F8FC] hover:border-primary"
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                isSelected
                                  ? "bg-white text-primary border-white"
                                  : "border-border text-text-muted bg-white"
                              }`}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Written text box */}
                    {!q.options && (
                      <textarea
                        value={answers[q.id] || ""}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        placeholder="Type your essay answer details here..."
                        className="w-full bg-[#F7F8FC] border border-border rounded-xl p-3.5 text-xs outline-none focus:border-primary h-36 font-semibold resize-none"
                        required
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // File submission upload form
              <div className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-4">
                <h3 className="text-xs font-black text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">
                  Submit Solved Assessment
                </h3>

                <div className="space-y-4">
                  {!subFile ? (
                    <div className="border border-dashed border-border rounded-2xl p-8 text-center bg-[#F7F8FC]/40 hover:bg-[#F7F8FC] transition-all flex flex-col items-center justify-center gap-3 relative">
                      <input
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setSubFile(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <UploadCloud size={32} className="text-primary" />
                      <div>
                        <span className="font-bold text-xs text-foreground block">Click to upload submission file</span>
                        <span className="text-[10px] text-text-muted block mt-1 uppercase">PDF, Word, or Scanned Document</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-border p-4 rounded-xl flex items-center justify-between gap-4 bg-emerald-50/20 border-emerald-200">
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-emerald-600" />
                        <div>
                          <span className="font-bold text-xs text-foreground block">{subFile.name}</span>
                          <span className="text-[10px] text-text-muted block mt-0.5">
                            {(subFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSubFile(null)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit CTA */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-8 rounded-xl text-xs uppercase cursor-pointer flex items-center gap-2 shadow-xs transition-all"
              >
                <Send size={14} /> Submit Solved Quiz
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Reusable File Preview Modal */}
      <FilePreviewModal
        isOpen={showInlinePreview}
        onClose={() => setShowInlinePreview(false)}
        fileUrl={assessment.file ? assessment.file.fileUrl : assessment.fileUrl || ""}
        originalName={assessment.file ? assessment.file.originalName : assessment.fileName || "document"}
        mimeType={assessment.file ? assessment.file.mimeType : undefined}
        fileSize={assessment.file ? assessment.file.size : assessment.fileSize}
      />
      </div>
  );
}
