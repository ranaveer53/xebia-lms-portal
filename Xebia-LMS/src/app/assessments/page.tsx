"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../../lib/context";
import { Assessment, Submission, Certificate, ScorecardResponse } from "../../types";
import Filters from "../../components/filters/Filters";
import { useRouter } from "next/navigation";
import { apiService } from "../../lib/apiService";
import CertificatePreviewModal from "../../components/certificates/CertificatePreviewModal";
import {
  FileText,
  FilePlus,
  Upload,
  Download,
  Calendar,
  Layers,
  Trash2,
  Play,
  CheckCircle,
  Clock,
  Eye,
  X,
  Sparkles,
  Award
} from "lucide-react";

export default function AssessmentsPage() {
  const router = useRouter();
  const { currentUser, assessments, submissions, deleteAssessment, saveAssessment, publishAssessment } = useApp();
  const [timeFilter, setTimeFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All Batches");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(null);
  
  // File upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadBatches, setUploadBatches] = useState<string[]>([]);
  const [uploadBatchDropdownOpen, setUploadBatchDropdownOpen] = useState(false);
  const [uploadBatchSearch, setUploadBatchSearch] = useState("");
  const [uploadDeadline, setUploadDeadline] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Dynamic batch list from backend
  const [allBatchNames, setAllBatchNames] = useState<string[]>([]);
  useEffect(() => {
    apiService.getBatches()
      .then(batches => {
        const names = batches.map(b => b.batchName).filter(Boolean);
        setAllBatchNames(names.length > 0 ? names : ["Batch A", "Batch B", "Batch C", "Batch D"]);
      })
      .catch(() => {
        setAllBatchNames(["Batch A", "Batch B", "Batch C", "Batch D"]);
      });
  }, []);

  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [scorecardData, setScorecardData] = useState<ScorecardResponse | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [scorecardError, setScorecardError] = useState<string | null>(null);

  const handleViewCertificate = async (studentId: string, assessmentId: string) => {
    try {
      const cert = await apiService.generateCertificate(studentId, assessmentId);
      router.push(`/certificates/${cert.id}`);
    } catch (err) {
      console.error("Error loading certificate:", err);
      alert("Failed to load certificate. Please try again.");
    }
  };

  const userRole = currentUser?.role || "learner";
  const userId = currentUser?.id || "";

  const handlePublish = async (assessment: Assessment) => {
    try {
      await publishAssessment(assessment.id);
    } catch (err: any) {
      console.error("Failed to publish assessment:", err);
      alert(err.message || "Failed to publish assessment.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this assessment?")) {
      await deleteAssessment(id);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadSubject || !uploadFile) {
      alert("Please fill in all fields and choose a file.");
      return;
    }

    if (uploadBatches.length === 0) {
      alert("Please select at least one batch.");
      return;
    }

    try {
      // 1. Upload the file to the backend
      const uploadedFile = await apiService.uploadFile(uploadFile);

      // 2. Create the assessment with the uploaded file metadata
      const newAssessment: Assessment = {
        id: "a-" + Date.now(),
        title: uploadTitle,
        subject: uploadSubject,
        batch: uploadBatches[0] || "Batch A",
        batches: uploadBatches,
        instructions: "Please download the attached file, complete the task, and upload your response.",
        questionType: "written",
        questions: [],
        totalMarks: 50,
        deadline: uploadDeadline || new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        status: "published",
        createdAt: new Date().toISOString(),
        fileName: uploadedFile.originalName,
        fileSize: (uploadedFile.size / (1024 * 1024)).toFixed(1) + " MB",
        fileUrl: uploadedFile.fileUrl,
        file: uploadedFile
      };

      await saveAssessment(newAssessment);
      
      // Reset state
      setShowUploadModal(false);
      setUploadTitle("");
      setUploadSubject("");
      setUploadBatches([]);
      setUploadFile(null);
    } catch (err) {
      console.error("Error uploading file / saving assessment:", err);
      alert("Failed to upload file or save assessment. Please try again.");
    }
  };

  // Filter logic
  const filteredAssessments = assessments.filter((a) => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.subject.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (userRole === "teacher" || userRole === "admin") {
      if (statusFilter === "draft" && a.status !== "draft") return false;
      if (statusFilter === "published" && a.status !== "published") return false;
    } else {
      // Learners should NOT see draft assessments
      if (a.status !== "published") return false;
    }

    if (userRole !== "teacher" && userRole !== "admin") {
      // If learner has no batch set, show all published assessments
      // If learner has a batch, only show assessments assigned to their batch
      const studentBatch = currentUser?.batch?.trim();
      if (studentBatch) {
        const batchLower = studentBatch.toLowerCase();
        const hasBatch = (a.batches && a.batches.some(b => b.trim().toLowerCase() === batchLower)) 
                      || (a.batch && a.batch.trim().toLowerCase() === batchLower);
        if (!hasBatch) return false;
      }
    } else {
      if (batchFilter !== "All Batches") {
        const selectedBatch = batchFilter.trim().toLowerCase();
        const hasBatch = (a.batches && a.batches.some(b => b.trim().toLowerCase() === selectedBatch)) 
                      || (a.batch && a.batch.trim().toLowerCase() === selectedBatch);
        if (!hasBatch) return false;
      }
    }
    return true;
  });

  const getLearnerStatus = (assessmentId: string) => {
    const sub = submissions.find((s) => s.assessmentId === assessmentId && s.learnerId === userId);
    if (!sub) return { label: "Not Started", color: "bg-zinc-50 text-zinc-500 border-zinc-200", code: "pending", data: null };
    if (sub.status === "marked") return { label: "Marked", color: "bg-emerald-50 text-emerald-700 border-emerald-100", code: "marked", data: sub };
    if (sub.status === "Auto Graded") return { label: "Auto Graded", color: "bg-purple-50 text-[#84117C] border-[#84117C]/20", code: "marked", data: sub };
    return { label: "Submitted", color: "bg-primary/5 text-primary border-primary/10", code: "submitted", data: sub };
  };

  return (
    <div className="space-y-6">
      
      {/* Header card details */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">
            {userRole === "teacher" || userRole === "admin" ? "Curriculum Assessments" : "My Assigned Assessments"}
          </h1>
          <p className="text-xs text-text-muted font-semibold mt-1">
            {userRole === "teacher" || userRole === "admin"
              ? "Create interactive MCQ tests or upload external files for review."
              : "Solve scheduled quizzes, upload materials, and review scores."}
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

      {(userRole === "teacher" || userRole === "admin") && (
        <div className="flex gap-2 border-b border-border/50 pb-2">
          {(["all", "draft", "published"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer capitalize ${
                statusFilter === tab
                  ? "bg-[#84117C]/10 text-[#84117C] border border-[#84117C]/20"
                  : "text-text-muted hover:text-foreground hover:bg-zinc-100"
              }`}
            >
              {tab === "all" ? "All Assessments" : tab === "draft" ? "Drafts Only" : "Published Only"}
            </button>
          ))}
        </div>
      )}

      {/* Action panel & search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="bg-white border border-border p-4 rounded-2xl shadow-xs flex-1 flex items-center gap-3 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assessments by topic, title, or subject..."
            className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-text-muted"
          />
        </div>

        {(userRole === "teacher" || userRole === "admin") && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => router.push("/assessments/create")}
              className="bg-primary hover:bg-primary-dark text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all w-full md:w-auto justify-center"
            >
              <FilePlus size={16} /> Create Custom Quiz
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-accent hover:bg-accent-dark text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all w-full md:w-auto justify-center"
            >
              <Upload size={16} /> Upload File Quiz
            </button>
          </div>
        )}
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
        {filteredAssessments.map((item) => {
          const statusDetails = getLearnerStatus(item.id);
          const isOverdue = new Date(item.deadline) < new Date() && statusDetails.code === "pending";

          return (
            <div
              key={item.id}
              className="bg-white border border-border p-6 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 mr-2">
                      {item.batch}
                    </span>
                    <span className="text-[10px] font-black uppercase text-accent bg-accent/5 px-2.5 py-1 rounded-full border border-accent/10">
                      {item.questionType === "mcq" ? "MCQ Quiz" : "Written Test"}
                    </span>
                    <h3 className="font-black text-lg text-foreground mt-3 leading-tight">{item.title}</h3>
                    <span className="text-xs text-text-muted font-semibold block mt-0.5">{item.subject}</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                    <FileText size={22} />
                  </div>
                </div>

                {/* Details layout */}
                <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4 text-xs font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-text-muted" />
                    <span>
                      {item.questions.length > 0 ? `${item.questions.length} Questions` : "File Attachment"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-text-muted" />
                    <span>Max Marks: {item.totalMarks}</span>
                  </div>
                </div>

                {/* Deadline Info */}
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                  <Calendar size={14} className="text-primary" />
                  <span>Deadline: {new Date(item.deadline).toLocaleString()}</span>
                  {isOverdue && (
                    <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 text-[10px] uppercase font-black">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Action bar */}
              <div className="border-t border-border/50 pt-4 mt-6 flex justify-between items-center">
                {userRole === "teacher" || userRole === "admin" ? (
                  <>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      item.status === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}>
                      {item.status}
                    </span>
                    <div className="flex gap-2 items-center">
                      {item.status === "draft" ? (
                        <>
                          <button
                            onClick={() => router.push(`/assessments/edit/${item.id}`)}
                            className="bg-zinc-800 hover:bg-zinc-950 text-white font-bold text-[10px] px-3 py-2 rounded-xl cursor-pointer transition-all uppercase"
                          >
                            Edit Draft
                          </button>
                          <button
                            onClick={() => handlePublish(item)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl cursor-pointer transition-all uppercase"
                          >
                            Publish
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setPreviewAssessment(item)}
                            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-[10px] px-3 py-2 rounded-xl cursor-pointer transition-all uppercase"
                          >
                            View
                          </button>
                          <button
                            onClick={() => router.push(`/submissions?assessmentId=${item.id}`)}
                            className="bg-[#84117C] hover:bg-[#6c0e66] text-white font-bold text-[10px] px-3 py-2 rounded-xl cursor-pointer transition-all uppercase"
                          >
                            Submissions
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 border border-border rounded-xl text-rose-600 hover:bg-rose-50 hover:border-rose-100 cursor-pointer transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${statusDetails.color}`}>
                      {statusDetails.label}
                    </span>
                    {statusDetails.code === "pending" ? (
                      <button
                        onClick={() => router.push(`/assessments/submit/${item.id}`)}
                        disabled={isOverdue}
                        className="bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Play size={12} /> Start Solve
                      </button>
                    ) : statusDetails.code === "marked" ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const sub = statusDetails.data;
                            if (sub) {
                              setSelectedSubmission(sub);
                              setShowScoreModal(true);
                              setScorecardLoading(true);
                              setScorecardError(null);
                              try {
                                const sc = await apiService.getScorecard(sub.id);
                                setScorecardData(sc);
                              } catch (err: any) {
                                console.error("Error loading scorecard:", err);
                                setScorecardError(err.message || "Failed to load detailed scorecard.");
                              } finally {
                                setScorecardLoading(false);
                              }
                            }
                          }}
                          className="bg-accent hover:bg-accent-dark text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Eye size={12} /> View Scorecard
                        </button>
                        {(() => {
                          const sub = statusDetails.data;
                          if (!sub) return null;
                          const pct = sub.percentage !== undefined ? sub.percentage : ((sub.marksObtained || 0) / sub.totalMarks) * 100;
                          if (pct >= 90) {
                            return (
                              <button
                                onClick={() => handleViewCertificate(userId, item.id)}
                                className="bg-[#84117C] hover:bg-[#6c0e66] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs animate-fadeIn"
                              >
                                <Award size={12} /> View Certificate
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <button
                        disabled
                        className="bg-zinc-100 text-zinc-400 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-not-allowed"
                      >
                        <Clock size={12} /> Review Pending
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload File Quiz Modal (Teacher only) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-lg animate-fadeIn">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-wider">Upload Assessment File</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFileUpload} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Assessment Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. SQL Queries and Normalization Quiz"
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Subject / Class Name</label>
                <input
                  type="text"
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  placeholder="e.g. Back-end Development"
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Batch Assign</label>
                  <div
                    onClick={() => setUploadBatchDropdownOpen(!uploadBatchDropdownOpen)}
                    className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer font-semibold min-h-[38px] flex flex-wrap gap-1 items-center justify-between"
                  >
                    <div className="flex flex-wrap gap-1 max-w-[90%]">
                      {uploadBatches.length === 0 ? (
                        <span className="text-text-muted">Select Batches</span>
                      ) : (
                        uploadBatches.map(b => (
                          <span
                            key={b}
                            className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadBatches(uploadBatches.filter(item => item !== b));
                            }}
                          >
                            {b}
                            <span className="hover:text-red-500 cursor-pointer">×</span>
                          </span>
                        ))
                      )}
                    </div>
                    <span className="text-text-muted text-[10px]">▼</span>
                  </div>

                  {uploadBatchDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg p-2.5 space-y-2 max-h-48 overflow-y-auto">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={uploadBatchSearch}
                        onChange={(e) => setUploadBatchSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[#F7F8FC] border border-border rounded-lg px-2 py-1 text-[11px] outline-none font-semibold"
                      />
                      <div className="flex items-center gap-2 pb-1.5 border-b border-border/45">
                        <input
                          type="checkbox"
                          id="select-all-modal-batches"
                          checked={allBatchNames.length > 0 && uploadBatches.length === allBatchNames.length}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUploadBatches([...allBatchNames]);
                            } else {
                              setUploadBatches([]);
                            }
                          }}
                          className="rounded text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                        />
                        <label htmlFor="select-all-modal-batches" className="text-[11px] font-bold text-foreground cursor-pointer select-none">
                          Select All
                        </label>
                      </div>
                      <div className="space-y-1 pt-1">
                        {allBatchNames.filter(b => b.toLowerCase().includes(uploadBatchSearch.toLowerCase())).map(b => (
                          <div key={b} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`modal-batch-${b}`}
                              checked={uploadBatches.includes(b)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUploadBatches([...uploadBatches, b]);
                                } else {
                                  setUploadBatches(uploadBatches.filter(item => item !== b));
                                }
                              }}
                              className="rounded text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                            />
                            <label htmlFor={`modal-batch-${b}`} className="text-[11px] font-semibold text-foreground cursor-pointer select-none flex-grow">
                              {b}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Deadline Date & Time</label>
                  <input
                    type="datetime-local"
                    value={uploadDeadline}
                    onChange={(e) => setUploadDeadline(e.target.value)}
                    className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider font-semibold">Select Assessment PDF / Document</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full border border-dashed border-border rounded-xl p-4 text-xs font-bold text-text-muted cursor-pointer"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-xs"
              >
                Upload & Publish to Batch
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scorecard Modal (Learner only) */}
      {showScoreModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-lg animate-fadeIn flex flex-col h-[90vh]">
            <div className="bg-[#84117C] p-6 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="font-black text-sm uppercase tracking-wider">Assessment Scorecard</h3>
              <button onClick={() => { setShowScoreModal(false); setScorecardData(null); }} className="text-white/80 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {scorecardLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                  <div className="w-10 h-10 border-4 border-[#84117C] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest animate-pulse">Loading detailed scorecard...</span>
                </div>
              ) : scorecardError ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-3">
                  <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl p-6 max-w-md mx-auto space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider block text-rose-800">Review Unavailable</span>
                    <span className="text-xs font-semibold block leading-relaxed">
                      {scorecardError.includes("400") || scorecardError.toLowerCase().includes("no answer data")
                        ? "Detailed answer review is unavailable for this older submission."
                        : scorecardError}
                    </span>
                  </div>
                  
                  {/* Default Scorecard Summary fallback even on error */}
                  <div className="border border-border rounded-2xl p-5 max-w-md mx-auto w-full text-left space-y-3 font-semibold text-xs mt-4">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Total Score:</span>
                      <span className="text-foreground font-black">{selectedSubmission.marksObtained} / {selectedSubmission.totalMarks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Percentage:</span>
                      <span className="text-foreground font-black">
                        {((selectedSubmission.marksObtained || 0) / selectedSubmission.totalMarks * 100).toFixed(1)}%
                      </span>
                    </div>
                    {selectedSubmission.feedback && (
                      <div className="pt-2 border-t border-border/40 mt-1">
                        <span className="text-[10px] font-bold text-[#84117C] uppercase tracking-wider block mb-1">Feedback</span>
                        <p className="p-2.5 bg-[#F7F8FC] rounded-xl border border-border/60 text-foreground font-medium leading-relaxed">
                          {selectedSubmission.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : scorecardData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#F7F8FC] border border-border/60 p-4 rounded-2xl text-center">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Score</span>
                      <span className="text-lg font-black text-foreground mt-1 block">
                        {scorecardData.marksObtained !== null ? scorecardData.marksObtained : 0} / {scorecardData.totalMarks}
                      </span>
                    </div>
                    <div className="bg-[#F7F8FC] border border-border/60 p-4 rounded-2xl text-center">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Percentage</span>
                      <span className="text-lg font-black text-foreground mt-1 block">
                        {scorecardData.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-[#F7F8FC] border border-border/60 p-4 rounded-2xl text-center">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Status</span>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mt-2 ${
                        scorecardData.status === "PASSED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}>
                        {scorecardData.status}
                      </span>
                    </div>
                    <div className="bg-[#F7F8FC] border border-border/60 p-4 rounded-2xl text-center">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Date Submitted</span>
                      <span className="text-xs font-bold text-foreground mt-2.5 block truncate">
                        {scorecardData.submittedAt ? scorecardData.submittedAt.split("T")[0] : "N/A"}
                      </span>
                    </div>
                  </div>

                  {scorecardData.answers && scorecardData.answers.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 bg-zinc-50 border border-border/40 p-4 rounded-2xl text-center">
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Correct</span>
                        <span className="text-sm font-black text-emerald-600 mt-1 block">{scorecardData.correctCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Wrong</span>
                        <span className="text-sm font-black text-rose-600 mt-1 block">{scorecardData.wrongCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Unanswered</span>
                        <span className="text-sm font-black text-zinc-500 mt-1 block">{scorecardData.unansweredCount}</span>
                      </div>
                    </div>
                  )}

                  {/* Submission General Metadata */}
                  <div className="bg-[#F7F8FC]/50 border border-border/50 p-4 rounded-2xl space-y-2 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Assessment Title:</span>
                      <span className="text-foreground font-bold">{scorecardData.assessmentTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Subject:</span>
                      <span className="text-foreground font-bold">{scorecardData.subject || "General Curriculum"}</span>
                    </div>
                    {scorecardData.submittedFileName && (
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-text-muted">Attachment File:</span>
                        <a
                          href={scorecardData.submittedFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#84117C] hover:underline font-bold flex items-center gap-1"
                        >
                          {scorecardData.submittedFileName}
                        </a>
                      </div>
                    )}
                    {scorecardData.feedback && (
                      <div className="pt-2 border-t border-border/45 mt-2">
                        <span className="text-[10px] font-bold text-[#84117C] uppercase tracking-wider block mb-1">Teacher Feedback</span>
                        <p className="p-3 bg-white rounded-xl border border-border/60 text-foreground text-xs leading-relaxed font-medium">
                          {scorecardData.feedback}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Detailed Question Review Section */}
                  {scorecardData.answers && scorecardData.answers.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-[#84117C] uppercase tracking-widest border-b border-border/40 pb-2">
                        Detailed Answer Review
                      </h4>
                      <div className="space-y-4">
                        {scorecardData.answers.map((ans, idx) => (
                          <div
                            key={ans.questionId}
                            className={`border rounded-2xl p-5 space-y-3 transition-all ${
                              ans.isCorrect
                                ? "border-emerald-200 bg-emerald-50/10"
                                : ans.studentAnswer === null || ans.studentAnswer === ""
                                ? "border-zinc-200 bg-zinc-50/10"
                                : "border-rose-200 bg-rose-50/10"
                            }`}
                          >
                            {/* Question Header */}
                            <div className="flex justify-between items-start gap-4">
                              <span className="text-xs font-black text-foreground">
                                Question {idx + 1}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                ans.isCorrect
                                  ? "bg-emerald-100 text-emerald-800"
                                  : ans.studentAnswer === null || ans.studentAnswer === ""
                                  ? "bg-zinc-100 text-zinc-600"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {ans.isCorrect
                                  ? `Correct (+${ans.marksAwarded}/${ans.questionMarks})`
                                  : ans.studentAnswer === null || ans.studentAnswer === ""
                                  ? `Unanswered (${ans.marksAwarded}/${ans.questionMarks})`
                                  : `Wrong (${ans.marksAwarded}/${ans.questionMarks})`}
                              </span>
                            </div>

                            {/* Question Text */}
                            <p className="text-xs font-bold text-foreground leading-relaxed">
                              {ans.questionText}
                            </p>

                            {/* MCQ Options Display */}
                            {ans.options && ans.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                {ans.options.map((opt, oIdx) => {
                                  const isSelected = ans.studentAnswer === opt;
                                  const isCorrectOpt = ans.correctAnswer === opt;
                                  
                                  let optClass = "border-border text-foreground";
                                  if (isSelected && isCorrectOpt) {
                                    optClass = "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold";
                                  } else if (isSelected && !isCorrectOpt) {
                                    optClass = "border-rose-500 bg-rose-50 text-rose-800 font-bold";
                                  } else if (!isSelected && isCorrectOpt) {
                                    optClass = "border-emerald-500 bg-emerald-50/60 text-emerald-800 font-bold";
                                  }
                                  
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`p-2.5 rounded-xl border text-xs leading-normal transition-all ${optClass}`}
                                    >
                                      <span className="font-bold mr-1.5">{String.fromCharCode(65 + oIdx)}.</span>
                                      {opt}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Explicit Answers Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                              <div>
                                <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Your Answer</span>
                                <span className={`font-bold mt-0.5 block ${
                                  ans.isCorrect ? "text-emerald-700" : "text-rose-700"
                                }`}>
                                  {ans.studentAnswer || "No Answer Submitted"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Correct Answer</span>
                                <span className="text-emerald-700 font-bold mt-0.5 block">{ans.correctAnswer}</span>
                              </div>
                            </div>

                            {/* Explanation */}
                            {ans.explanation && (
                              <div className="bg-white/80 p-3 rounded-xl border border-border/40 text-[11px] leading-relaxed text-zinc-600 mt-2 font-medium">
                                <strong className="text-[#84117C] font-extrabold uppercase tracking-wide mr-1 text-[9px] block mb-0.5">Explanation:</strong>
                                {ans.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#F7F8FC]/40 border border-border/40 p-6 rounded-2xl text-center space-y-1">
                      <span className="text-xs font-bold text-text-muted block">No structured questions review available.</span>
                      <span className="text-[10px] text-zinc-500 block">This assessment was completed via subjective response upload.</span>
                    </div>
                  )}
                </>
              ) : null}
            </div>
            
            <div className="p-6 border-t border-border bg-[#F7F8FC] flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => { setShowScoreModal(false); setScorecardData(null); }}
                className="px-5 py-2.5 border border-border rounded-xl text-xs font-bold text-text-muted hover:bg-white cursor-pointer"
              >
                Close Scorecard
              </button>
              {scorecardData && scorecardData.percentage >= 90 && (
                <button
                  onClick={() => handleViewCertificate(userId, scorecardData.assessmentId)}
                  className="px-6 py-2.5 bg-[#84117C] hover:bg-[#6c0e66] text-white font-bold rounded-xl text-xs uppercase cursor-pointer flex items-center gap-1.5 shadow-xs transition-all animate-fadeIn"
                >
                  <Award size={14} /> View Certificate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Assessment Preview Modal */}
      {previewAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-lg animate-fadeIn flex flex-col h-[80vh]">
            <div className="bg-[#84117C] p-6 text-white flex justify-between items-center flex-shrink-0">
              <div className="space-y-1">
                <h3 className="font-black text-sm uppercase tracking-wider">Assessment Preview</h3>
                <span className="text-xs text-white/70 block">{previewAssessment.title}</span>
              </div>
              <button onClick={() => setPreviewAssessment(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 bg-[#F7F8FC]">
              <div className="bg-white border border-border p-6 rounded-2xl">
                <h2 className="text-lg font-black text-foreground">{previewAssessment.title}</h2>
                <span className="text-xs text-text-muted block mt-1">
                  Subject: {previewAssessment.subject} | Status: {previewAssessment.status} | Total Marks: {previewAssessment.totalMarks}
                </span>
                {previewAssessment.instructions && (
                  <p className="text-xs text-foreground bg-[#F7F8FC] p-3 rounded-xl border mt-3 italic">
                    Instructions: {previewAssessment.instructions}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {previewAssessment.questions && previewAssessment.questions.length > 0 ? (
                  previewAssessment.questions.map((q, index) => (
                    <div key={q.id} className="bg-white border border-border p-6 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-primary uppercase">Question {index + 1}</span>
                        <span className="text-xs font-bold text-text-muted">{q.marks} Marks</span>
                      </div>
                      <p className="font-bold text-sm text-foreground">{q.text}</p>

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {q.options.map((opt, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                q.correctAnswer === opt
                                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 font-bold"
                                  : "border-border hover:border-primary"
                              }`}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : previewAssessment.fileName ? (
                  <div className="bg-white border border-border p-6 rounded-2xl text-center space-y-3">
                    <span className="text-xs font-bold text-text-muted uppercase block">Attached File</span>
                    <a
                      href={previewAssessment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-black text-primary bg-primary/5 border border-primary/20 px-4 py-2.5 rounded-xl hover:bg-primary/10 transition-all"
                    >
                      <Download size={14} /> Download {previewAssessment.fileName} ({previewAssessment.fileSize})
                    </a>
                  </div>
                ) : (
                  <div className="bg-white border border-border p-6 rounded-2xl text-center text-xs text-text-muted font-semibold">
                    No questions or file attachments found in this assessment.
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-border bg-white flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setPreviewAssessment(null)}
                className="bg-zinc-800 hover:bg-zinc-900 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
