"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../../lib/context";
import { Material } from "../../types";
import Filters from "../../components/filters/Filters";
import { FileText, Download, UploadCloud, Trash2, Eye, X, Plus, Search, Loader2 } from "lucide-react";
import { apiService } from "../../lib/apiService";
import FilePreviewModal from "../../components/files/FilePreviewModal";

export default function MaterialsPage() {
  const { currentUser, materials, uploadMaterial, deleteMaterial } = useApp();
  const [timeFilter, setTimeFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All Batches");
  const [search, setSearch] = useState("");

  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialSubject, setMaterialSubject] = useState("");
  const [materialBatch, setMaterialBatch] = useState("Batch A");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [batches, setBatches] = useState<string[]>(["Batch A", "Batch B", "Batch C", "Batch D"]);

  // Load batches from backend
  useEffect(() => {
    apiService.getBatches().then((data) => {
      if (data && data.length > 0) {
        const names: string[] = data.map((b: { batchName: string }) => b.batchName).filter(Boolean);
        if (names.length > 0) {
          setBatches(names);
          setMaterialBatch(names[0]);
        }
      }
    }).catch(() => {});
  }, []);

  // File Preview States
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [previewMimeType, setPreviewMimeType] = useState<string | undefined>(undefined);
  const [previewSize, setPreviewSize] = useState<string | number>("");

  const handlePreview = (item: Material) => {
    setPreviewUrl(item.fileUrl);
    setPreviewName(item.fileName);
    setPreviewSize(item.fileSize);
    
    const ext = item.fileName.split('.').pop()?.toLowerCase();
    let guessedMime = undefined;
    if (ext === 'pdf') guessedMime = 'application/pdf';
    else if (ext === 'docx') guessedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === 'xlsx') guessedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === 'csv') guessedMime = 'text/csv';
    else if (ext === 'txt') guessedMime = 'text/plain';
    else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) guessedMime = `image/${ext}`;
    
    setPreviewMimeType(guessedMime);
    setPreviewOpen(true);
  };

  const handleDownloadFile = async (e: React.MouseEvent, fileUrl: string, originalName: string) => {
    e.preventDefault();
    try {
      const downloadUrl = fileUrl.includes("/files/preview/") 
        ? fileUrl.replace("/files/preview/", "/files/download/") 
        : fileUrl;
      const res = await fetch(downloadUrl);
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

  const userRole = currentUser?.role || "learner";

  // Filter materials
  const filteredMaterials = materials.filter((item) => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.fileName.toLowerCase().includes(search.toLowerCase())) return false;
    if (userRole === "learner") {
      const studentBatch = currentUser?.batch || "Batch A";
      return item.batch === studentBatch;
    }
    if (batchFilter !== "All Batches" && item.batch !== batchFilter) return false;
    return true;
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialTitle || !materialSubject || !materialFile) {
      setUploadError("Please fill in all fields and select a file.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      // 1. Upload file to backend
      const uploadedFile = await apiService.uploadFile(materialFile);

      // 2. Create the material object with backend paths
      const newMaterial: Material = {
        id: "m-" + Date.now(),
        title: materialTitle,
        subject: materialSubject,
        batch: materialBatch,
        fileName: uploadedFile.originalName,
        fileSize: (uploadedFile.size / (1024 * 1024)).toFixed(1) + " MB",
        fileUrl: uploadedFile.fileUrl,
        uploadedBy: currentUser?.name || "Admin",
        uploadedAt: new Date().toISOString()
      };

      await uploadMaterial(newMaterial);
      
      // Reset state on success
      setShowUploadModal(false);
      setMaterialTitle("");
      setMaterialSubject("");
      setMaterialFile(null);
      setUploadError("");
    } catch (err: any) {
      console.error("Error uploading material:", err);
      setUploadError(err?.message || "Failed to upload material. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this study material?")) {
      await deleteMaterial(id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header card details */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Course Reference Materials</h1>
          <p className="text-xs text-text-muted font-semibold mt-1">
            {userRole === "teacher" || userRole === "admin"
              ? "Share PDF slide decks, cheat sheets, or exercise guides with enrolled batches."
              : "Access textbooks, cheat sheets, slide decks, and reference files uploaded by the instructor."}
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

      {/* Action panel & search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="bg-white border border-border p-4 rounded-2xl shadow-xs flex-1 flex items-center gap-3 w-full">
          <Search size={18} className="text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by topic, title, or filename..."
            className="bg-transparent border-none outline-none text-xs w-full text-foreground placeholder:text-text-muted"
          />
        </div>

        {(userRole === "teacher" || userRole === "admin") && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary hover:bg-primary-dark text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all w-full md:w-auto justify-center"
          >
            <Plus size={16} /> Upload Study Material
          </button>
        )}
      </div>

      {/* Materials grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-border p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  {(userRole === "teacher" || userRole === "admin") && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 border border-border rounded-lg text-rose-500 hover:bg-rose-50 hover:border-rose-100 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/10 mr-2">
                    {item.batch}
                  </span>
                  <span className="text-[10px] font-black uppercase text-text-muted bg-[#F7F8FC] px-2.5 py-0.5 rounded-full border border-border">
                    {item.subject}
                  </span>
                  <h3 className="font-black text-sm text-foreground pt-2 leading-snug">{item.title}</h3>
                  <span className="text-[11px] text-text-muted font-bold block truncate mt-1">File: {item.fileName}</span>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 mt-6 flex justify-between items-center text-xs font-bold">
                <span className="text-text-muted">{item.fileSize}</span>
                <div className="flex gap-2">
                  <a
                    href={item.fileUrl}
                    download
                    onClick={(e) => handleDownloadFile(e, item.fileUrl, item.fileName)}
                    className="border border-border text-foreground hover:bg-[#F7F8FC] hover:text-primary p-2 rounded-xl flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    onClick={() => handlePreview(item)}
                    className="bg-primary hover:bg-primary-dark text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-border p-12 text-center rounded-2xl col-span-3">
            <span className="text-sm font-bold text-text-muted uppercase tracking-wider">
              No course reference materials found
            </span>
          </div>
        )}
      </div>

      {/* Upload Material Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-lg animate-fadeIn">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-wider">Upload Reference Material</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-700">
                  ⚠ {uploadError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Document Title</label>
                <input
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="e.g. Next.js 15 App Router Reference Cheatsheet"
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  disabled={uploading}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Subject / Class Name</label>
                <input
                  type="text"
                  value={materialSubject}
                  onChange={(e) => setMaterialSubject(e.target.value)}
                  placeholder="e.g. Front-end Development"
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  disabled={uploading}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Assign Batch Access</label>
                <select
                  value={materialBatch}
                  onChange={(e) => setMaterialBatch(e.target.value)}
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold cursor-pointer"
                  disabled={uploading}
                >
                  {batches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Select File</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setMaterialFile(e.target.files[0]);
                      setUploadError("");
                    }
                  }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg"
                  className="w-full border border-dashed border-border rounded-xl p-4 text-xs font-bold text-text-muted cursor-pointer disabled:opacity-50"
                  disabled={uploading}
                  required
                />
                {materialFile && (
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ {materialFile.name} ({(materialFile.size / (1024*1024)).toFixed(2)} MB)</p>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-xs flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                ) : (
                  <><UploadCloud size={14} /> Upload File</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileUrl={previewUrl}
        originalName={previewName}
        mimeType={previewMimeType}
        fileSize={previewSize}
      />
    </div>
  );
}
