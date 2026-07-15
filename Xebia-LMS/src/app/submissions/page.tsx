"use client";

import { useSearchParams } from "next/navigation";

import React, { useState, useEffect } from "react";
import { useApp } from "../../lib/context";
import { Submission } from "../../types";
import { 
  FileText, 
  Download, 
  Award, 
  FileSpreadsheet, 
  Search, 
  X, 
  CheckSquare, 
  SlidersHorizontal,
  ChevronDown,
  RefreshCw
} from "lucide-react";

function SubmissionsPageContent() {
  const { 
    currentUser, 
    submissions, 
    assessments, 
    gradeSubmission, 
    bulkGradeSubmissions, 
    bulkReviewedSubmissions, 
    refreshSubmissions 
  } = useApp();

  const userRole = currentUser?.role || "learner";

  // Filter States
  const searchParams = useSearchParams();
  const queryAssessmentId = searchParams ? searchParams.get("assessmentId") || "" : "";

  const [selectedBatches, setSelectedBatches] = useState<string[]>(["Batch A", "Batch B", "Batch C", "Batch D"]);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(queryAssessmentId);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("Newest First");

  // Selection state for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Review modal state
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [marksInput, setMarksInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [gradingError, setGradingError] = useState("");
  const [gradingLoading, setGradingLoading] = useState(false);

  // Bulk Grade modal state
  const [bulkGradeOpen, setBulkGradeOpen] = useState(false);
  const [bulkGradeMarks, setBulkGradeMarks] = useState<number>(0);
  const [bulkGradeFeedback, setBulkGradeFeedback] = useState("");

  // Refresh submission list on filter changes
  useEffect(() => {
    refreshSubmissions({
      assessmentId: selectedAssessmentId,
      batches: selectedBatches,
      status: selectedStatus === "All" ? "" : selectedStatus,
      search: searchQuery,
      timeFilter: selectedTimeFilter,
      sortBy: sortBy,
      page: 0,
      size: 100
    });
  }, [selectedAssessmentId, selectedBatches, selectedStatus, searchQuery, selectedTimeFilter, sortBy]);

  if (userRole !== "teacher" && userRole !== "admin") {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs font-bold text-rose-600">
        Access Denied. Only instructors and administrators can review student submissions.
      </div>
    );
  }

  // Calculate dynamic dashboard counters based on active filters
  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const submittedCount = submissions.filter(s => s.status === "submitted").length;
  const gradedCount = submissions.filter(s => s.status === "marked").length;
  const lateCount = submissions.filter(s => s.status === "late").length;
  const missingCount = submissions.filter(s => s.status === "missing").length;

  const handleOpenReview = (sub: Submission) => {
    setSelectedSub(sub);
    setMarksInput(sub.marksObtained || 0);
    setFeedbackInput(sub.feedback || "");
    setGradingError("");
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    if (marksInput < 0 || marksInput > selectedSub.totalMarks) {
      setGradingError(`Marks must be between 0 and ${selectedSub.totalMarks}.`);
      return;
    }

    setGradingLoading(true);
    setGradingError("");
    try {
      await gradeSubmission(selectedSub.id, marksInput, feedbackInput);
      setSelectedSub(null);
    } catch (err: any) {
      setGradingError(err.message || "Failed to publish score. Please check your connection and try again.");
    } finally {
      setGradingLoading(false);
    }
  };

  // Bulk Operations Handlers
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleToggleSelectAllOnPage = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map(s => s.id)));
    }
  };

  const handleBulkReviewed = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to mark ${selectedIds.size} submission(s) as Reviewed/Graded?`)) {
      await bulkReviewedSubmissions(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;

    const items = Array.from(selectedIds).map(id => ({
      id,
      marks: bulkGradeMarks,
      feedback: bulkGradeFeedback
    }));

    await bulkGradeSubmissions(items);
    setBulkGradeOpen(false);
    setSelectedIds(new Set());
    setBulkGradeFeedback("");
    setBulkGradeMarks(0);
  };

  const handleBulkDownloadFiles = () => {
    const targets = submissions.filter(s => selectedIds.has(s.id) && s.submittedFileUrl);
    if (targets.length === 0) {
      alert("No uploaded file submissions found among selected rows.");
      return;
    }
    targets.forEach(s => {
      const a = document.createElement("a");
      a.href = s.submittedFileUrl || "";
      a.download = s.submittedFileName || "submission";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  const triggerExport = (list: Submission[], format: "csv" | "excel") => {
    const headers = "Student Name,Roll Number,Assessment,Batch,Subject,Submitted Date,Status,Marks Obtained,Total Marks,Feedback\n";
    const rows = list.map(s => {
      const dateStr = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : "N/A";
      const statusLabel = s.status === "marked" ? "Graded" : s.status === "submitted" ? "Submitted" : s.status === "late" ? "Late" : s.status === "missing" ? "Missing" : "Pending";
      return `"${s.learnerName}","${s.rollNumber || "N/A"}","${s.assessmentTitle}","${s.batch}","${s.subject}","${dateStr}","${statusLabel}",${s.marksObtained !== undefined ? s.marksObtained : "N/A"},${s.totalMarks},"${s.feedback || ""}"`;
    }).join("\n");

    const mimeType = format === "csv" ? "text/csv;charset=utf-8;" : "application/vnd.ms-excel;charset=utf-8;";
    const filename = `submissions_export_${Date.now()}.${format === "csv" ? "csv" : "xls"}`;

    const blob = new Blob([headers + rows], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFile = async (e: React.MouseEvent, fileUrl: string, originalName: string) => {
    e.preventDefault();
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error("Failed to fetch file");
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

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Submissions Hub</h1>
          <p className="text-xs text-text-muted font-semibold mt-1">Grade response sets, view virtual submissions, and track batch timelines.</p>
        </div>
      </div>

      {/* Dynamic Counters Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-border/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Pending</span>
          <span className="text-2xl font-black text-zinc-600 mt-2 block">{pendingCount}</span>
        </div>
        <div className="bg-white border border-border/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-[#6C1D5F] uppercase tracking-wider block">Submitted</span>
          <span className="text-2xl font-black text-[#6C1D5F] mt-2 block">{submittedCount}</span>
        </div>
        <div className="bg-white border border-border/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Graded</span>
          <span className="text-2xl font-black text-emerald-600 mt-2 block">{gradedCount}</span>
        </div>
        <div className="bg-white border border-border/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block">Late</span>
          <span className="text-2xl font-black text-amber-600 mt-2 block">{lateCount}</span>
        </div>
        <div className="bg-white border border-border/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">Missing</span>
          <span className="text-2xl font-black text-rose-600 mt-2 block">{missingCount}</span>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <SlidersHorizontal size={14} className="text-[#6C1D5F]" />
          <span className="text-xs font-black text-foreground uppercase tracking-wider">Submissions Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          
          {/* Multi-Select Batches Dropdown */}
          <div className="space-y-1 relative">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Batches</label>
            <div 
              onClick={() => setBatchDropdownOpen(!batchDropdownOpen)}
              className="bg-[#F7F8FC] border border-border rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer flex items-center justify-between min-h-[38px]"
            >
              <div className="flex flex-wrap gap-0.5 max-w-[85%]">
                {selectedBatches.length === 0 ? (
                  <span className="text-text-muted">Select Batches</span>
                ) : selectedBatches.length === 4 ? (
                  <span>All Batches</span>
                ) : (
                  selectedBatches.map(b => (
                    <span 
                      key={b} 
                      className="bg-primary/10 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBatches(selectedBatches.filter(item => item !== b));
                      }}
                    >
                      {b.split(" ")[1]}
                      <span className="hover:text-red-500 font-bold">×</span>
                    </span>
                  ))
                )}
              </div>
              <ChevronDown size={14} className="text-text-muted" />
            </div>

            {batchDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg p-3 space-y-2 max-h-52 overflow-y-auto">
                <input
                  type="text"
                  placeholder="Search..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-[#F7F8FC] border border-border rounded-lg px-2 py-1 text-xs outline-none font-semibold"
                />
                <div className="flex items-center gap-2 pb-1.5 border-b border-border/45">
                  <input
                    type="checkbox"
                    id="select-all-submissions-batches"
                    checked={selectedBatches.length === 4}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBatches(["Batch A", "Batch B", "Batch C", "Batch D"]);
                      } else {
                        setSelectedBatches([]);
                      }
                    }}
                    className="rounded text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                  />
                  <label htmlFor="select-all-submissions-batches" className="text-[11px] font-bold text-foreground cursor-pointer select-none">
                    Select All
                  </label>
                </div>
                <div className="space-y-1.5 pt-1">
                  {["Batch A", "Batch B", "Batch C", "Batch D"].filter(b => b.toLowerCase().includes(batchSearch.toLowerCase())).map(b => (
                    <div key={b} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`filter-batch-${b}`}
                        checked={selectedBatches.includes(b)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBatches([...selectedBatches, b]);
                          } else {
                            setSelectedBatches(selectedBatches.filter(item => item !== b));
                          }
                        }}
                        className="rounded text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor={`filter-batch-${b}`} className="text-[11px] font-semibold text-foreground cursor-pointer select-none flex-grow">
                        {b}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Submission Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary font-semibold cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="marked">Marked / Graded</option>
              <option value="Auto Graded">Auto Graded</option>
              <option value="late">Late Submission</option>
              <option value="missing">Missing Submission</option>
            </select>
          </div>

          {/* Assessment Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Assessment</label>
            <select
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary font-semibold cursor-pointer"
            >
              <option value="">Select Assessment (All)</option>
              {assessments.filter(a => a.status === "published").map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Date Range</label>
            <select
              value={selectedTimeFilter}
              onChange={(e) => setSelectedTimeFilter(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary font-semibold cursor-pointer"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Search</label>
            <div className="flex items-center gap-2 bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 w-full">
              <Search size={14} className="text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, roll, title..."
                className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-text-muted font-semibold"
              />
            </div>
          </div>

        </div>

        {/* Sorting & Export controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-border/50 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-border text-xs font-semibold text-foreground px-3 py-2 rounded-xl outline-none cursor-pointer"
            >
              <option value="Newest First">Newest First</option>
              <option value="Oldest First">Oldest First</option>
              <option value="Highest Marks">Highest Marks</option>
              <option value="Lowest Marks">Lowest Marks</option>
              <option value="Submission Time">Submission Time</option>
              <option value="Alphabetical">Alphabetical</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => triggerExport(submissions, "csv")}
              className="bg-accent hover:bg-accent-dark text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <FileSpreadsheet size={14} /> Export to CSV
            </button>
            <button
              onClick={() => triggerExport(submissions, "excel")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <FileSpreadsheet size={14} /> Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-[#6C1D5F]/5 border border-[#6C1D5F]/20 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slideDown">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-[#6C1D5F]" />
            <span className="text-xs font-bold text-[#6C1D5F]">{selectedIds.size} row(s) selected for bulk operations</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={() => setBulkGradeOpen(true)}
              className="bg-primary hover:bg-primary-dark text-white font-bold text-[11px] px-3.5 py-2 rounded-xl cursor-pointer"
            >
              Bulk Grade
            </button>
            <button 
              onClick={handleBulkReviewed}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl cursor-pointer"
            >
              Mark Reviewed
            </button>
            <button 
              onClick={handleBulkDownloadFiles}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl cursor-pointer"
            >
              Download files
            </button>
            <button 
              onClick={() => triggerExport(submissions.filter(s => selectedIds.has(s.id)), "csv")}
              className="bg-accent hover:bg-accent-dark text-white font-bold text-[11px] px-3.5 py-2 rounded-xl cursor-pointer"
            >
              Export Selected
            </button>
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="text-text-muted hover:text-foreground text-[11px] font-bold px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Submission Table List */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-xs animate-fadeIn">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr className="bg-[#F7F8FC] border-b border-border text-[10px] font-black uppercase text-text-muted">
                <th className="p-4 sm:p-5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={submissions.length > 0 && selectedIds.size === submissions.length}
                    onChange={handleToggleSelectAllOnPage}
                    className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="p-4 sm:p-5">Student Name</th>
                <th className="p-4 sm:p-5">Roll Number</th>
                <th className="p-4 sm:p-5">Batch</th>
                <th className="p-4 sm:p-5">Assessment</th>
                <th className="p-4 sm:p-5">Submission Status</th>
                <th className="p-4 sm:p-5">Submission Time</th>
                <th className="p-4 sm:p-5">Deadline</th>
                <th className="p-4 sm:p-5">Marks</th>
                <th className="p-4 sm:p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-foreground">
              {submissions.length > 0 ? (
                submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#F7F8FC]/50 transition-all">
                    <td className="p-4 sm:p-5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(sub.id)}
                        onChange={() => handleToggleSelect(sub.id)}
                        className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 sm:p-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-[10px]">
                          {sub.learnerName.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span>{sub.learnerName}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-text-muted">{sub.rollNumber || "N/A"}</td>
                    <td className="p-4 sm:p-5">
                      <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/10">
                        {sub.batch}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5">
                      <div>
                        <span className="font-bold block truncate max-w-[200px]">{sub.assessmentTitle}</span>
                        <span className="text-[10px] text-text-muted block mt-0.5">{sub.subject}</span>
                      </div>                     </td>
                    <td className="p-4 sm:p-5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        sub.status === "marked" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        sub.status === "Auto Graded" ? "bg-purple-50 text-[#84117C] border-[#84117C]/20" :
                        sub.status === "submitted" ? "bg-primary/5 text-primary border-primary/10" :
                        sub.status === "late" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        sub.status === "missing" ? "bg-rose-50 text-rose-700 border-rose-100" :
                        "bg-zinc-50 text-zinc-500 border-zinc-200"
                      }`}>
                        {sub.status === "marked" ? "Graded" : 
                         sub.status === "Auto Graded" ? "Auto Graded" :
                         sub.status === "submitted" ? "Submitted" : 
                         sub.status === "late" ? "Late Submission" : 
                         sub.status === "missing" ? "Missing" : 
                         "Pending"}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-text-muted">
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "--"}
                    </td>
                    <td className="p-4 sm:p-5 text-text-muted">
                      {sub.deadline ? new Date(sub.deadline).toLocaleString() : "--"}
                    </td>
                    <td className="p-4 sm:p-5">
                      <div className="flex items-center gap-1.5">
                        {sub.status === "marked" || sub.status === "Auto Graded" ? (
                          <>
                            <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-lg">
                              {sub.marksObtained} / {sub.totalMarks}
                            </span>
                            {((sub.percentage !== undefined ? sub.percentage : ((sub.marksObtained || 0) / sub.totalMarks) * 100) >= 90) && (
                              <span 
                                title="Certificate Earned" 
                                className="w-5 h-5 rounded-full bg-purple-50 border border-[#84117C]/20 text-[#84117C] flex items-center justify-center cursor-help"
                              >
                                <Award size={11} />
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-text-muted font-bold">-- / {sub.totalMarks}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-right">
                      {sub.status !== "pending" && sub.status !== "missing" ? (
                        <button
                          onClick={() => handleOpenReview(sub)}
                          className="bg-primary hover:bg-primary-dark text-white font-bold text-[11px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
                        >
                          <Award size={12} /> Review
                        </button>
                      ) : (
                        <span className="text-text-muted italic text-[11px]">No attempt</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-xs font-bold text-text-muted uppercase tracking-wider">
                    No student submissions found matching filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Submission Grading Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-lg animate-fadeIn flex flex-col h-[85vh]">
            <div className="bg-primary p-6 text-white flex justify-between items-center flex-shrink-0">
              <div className="space-y-1">
                <h3 className="font-black text-sm uppercase tracking-wider">Review Answer Sheet</h3>
                <span className="text-xs text-white/70 block">
                  Student: {selectedSub.learnerName} | Batch: {selectedSub.batch}
                </span>
              </div>
              <button onClick={() => setSelectedSub(null)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 bg-[#F7F8FC]">
              
              {/* Submission Information */}
              <div className="bg-white border border-border p-6 rounded-2xl space-y-3">
                <h4 className="font-black text-xs text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">
                  Assessment Details
                </h4>
                <div>
                  <span className="font-black text-base text-foreground block">{selectedSub.assessmentTitle}</span>
                  <span className="text-xs text-text-muted font-semibold block mt-0.5">{selectedSub.subject}</span>
                </div>
              </div>

              {/* Student Answers */}
              <div className="space-y-4">
                <h4 className="font-black text-xs text-text-muted uppercase tracking-wider">Student Responses</h4>
                
                {selectedSub.submittedFileName ? (
                  <div className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText size={24} className="text-primary" />
                      <div>
                        <span className="font-bold text-xs text-foreground block">{selectedSub.submittedFileName}</span>
                        <span className="text-[10px] text-text-muted block mt-0.5">Attached Answer Sheet</span>
                      </div>
                    </div>
                    <a
                      href={selectedSub.submittedFileUrl}
                      download
                      onClick={(e) => handleDownloadFile(e, selectedSub.submittedFileUrl || "", selectedSub.submittedFileName || "submission")}
                      className="bg-primary hover:bg-primary-dark text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Download size={14} /> Download File
                    </a>
                  </div>
                ) : (
                  Object.keys(selectedSub.answers).map((qId, idx) => {
                    const originalAssessment = assessments.find(a => a.id === selectedSub.assessmentId);
                    const qObj = originalAssessment?.questions.find(q => q.id === qId);

                    return (
                      <div key={qId} className="bg-white border border-border p-6 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-primary uppercase">Question {idx + 1}</span>
                          <span className="text-xs font-semibold text-text-muted">{qObj?.marks} Marks</span>
                        </div>
                        <p className="font-bold text-sm text-foreground">{qObj?.text}</p>
                        
                        <div className="border-t border-border/50 pt-3">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Student Answer:</span>
                          <p className="text-xs text-foreground font-semibold bg-[#F7F8FC] p-3 rounded-xl border border-border/50 mt-1 leading-relaxed">
                            {selectedSub.answers[qId]}
                          </p>
                        </div>

                        {qObj?.correctAnswer && (
                          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
                            <span>Reference Key:</span>
                            <span className="font-black underline">{qObj.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Grading Form footer */}
            <form onSubmit={handleSubmitGrade} className="p-6 border-t border-border bg-white space-y-4 flex-shrink-0">
              {gradingError && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">
                  {gradingError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Score Awarded</label>
                  <div className="flex items-center gap-2 bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 transition-all focus-within:border-primary">
                    <input
                      type="number"
                      value={marksInput}
                      onChange={(e) => setMarksInput(Number(e.target.value))}
                      min={0}
                      max={selectedSub.totalMarks}
                      className="bg-transparent border-none outline-none text-sm w-full font-black text-primary text-center"
                      required
                    />
                    <span className="text-xs text-text-muted font-bold">/ {selectedSub.totalMarks}</span>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Feedback / Comments</label>
                  <input
                    type="text"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Provide constructive feedback..."
                    className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-3 text-xs outline-none focus:border-primary font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={gradingLoading}
                  className="bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-xs uppercase cursor-pointer shadow-xs text-center w-full transition-all flex items-center justify-center gap-2"
                >
                  {gradingLoading ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Publishing...</>
                  ) : (
                    "Publish Score"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Grade Modal */}
      {bulkGradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-lg animate-fadeIn">
            <div className="bg-primary p-5 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-wider">Bulk Grade {selectedIds.size} Submissions</h3>
              <button onClick={() => setBulkGradeOpen(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleBulkGradeSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Score Awarded (Marks)</label>
                <input
                  type="number"
                  value={bulkGradeMarks}
                  onChange={(e) => setBulkGradeMarks(Number(e.target.value))}
                  min={0}
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-sm font-black text-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Constructive Feedback</label>
                <textarea
                  value={bulkGradeFeedback}
                  onChange={(e) => setBulkGradeFeedback(e.target.value)}
                  placeholder="Feedback applied to all selected candidates..."
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl p-3 text-xs outline-none focus:border-primary font-semibold resize-none h-24"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setBulkGradeOpen(false)}
                  className="border border-border hover:bg-[#F7F8FC] font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer text-text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl text-xs uppercase cursor-pointer shadow-xs"
                >
                  Apply Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SubmissionsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-text-muted">Loading submissions...</div>}>
      <SubmissionsPageContent />
    </React.Suspense>
  );
}
