"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../../../lib/context";
import { Assessment, Question, QuestionType, Batch } from "../../../types";
import { apiService } from "../../../lib/apiService";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Check,
  Edit2,
  X,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Upload,
  AlertCircle
} from "lucide-react";

export default function CreateAssessmentPage() {
  const router = useRouter();
  const { currentUser, classes, saveAssessment } = useApp();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedBatches, setSelectedBatches] = useState<string[]>(["Batch A"]);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [deadline, setDeadline] = useState("");

  // Custom Batches states
  const [customBatches, setCustomBatches] = useState<Batch[]>([]);
  
  // Batch modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchCourse, setNewBatchCourse] = useState("");
  const [newBatchSubject, setNewBatchSubject] = useState("");
  const [newBatchDesc, setNewBatchDesc] = useState("");
  const [newBatchStart, setNewBatchStart] = useState("");
  const [newBatchEnd, setNewBatchEnd] = useState("");
  const [newBatchStudentCount, setNewBatchStudentCount] = useState<number | "">("");
  const [batchModalError, setBatchModalError] = useState("");

  useEffect(() => {
    apiService.getBatches().then(setCustomBatches).catch(console.error);
  }, []);

  const allBatches = React.useMemo(() => {
    const classBatches = classes.map(c => c.batch);
    const customBatchesList = customBatches.map(b => b.batchName);
    return Array.from(new Set([...classBatches, ...customBatchesList])).filter(Boolean);
  }, [classes, customBatches]);

  // Creator Mode State
  const [creationMode, setCreationMode] = useState<"manual" | "excel">("manual");
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Questions builder state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [currentQuestionMarks, setCurrentQuestionMarks] = useState<number>(10);
  const [currentQuestionDifficulty, setCurrentQuestionDifficulty] = useState<string>("Medium");
  const [currentQuestionExplanation, setCurrentQuestionExplanation] = useState<string>("");
  
  // MCQ options state
  const [mcqOptions, setMcqOptions] = useState<string[]>(["", ""]);
  const [correctMcqAnswer, setCorrectMcqAnswer] = useState("");
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const userRole = currentUser?.role || "learner";

  if (userRole !== "teacher" && userRole !== "admin") {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs font-bold text-rose-600">
        Access Denied. Only instructors and administrators can build assessments.
      </div>
    );
  }

  // Options helpers
  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...mcqOptions];
    updated[idx] = val;
    setMcqOptions(updated);
  };

  const addOptionField = () => {
    setMcqOptions([...mcqOptions, ""]);
  };

  const removeOptionField = (idx: number) => {
    if (mcqOptions.length <= 2) return;
    const updated = mcqOptions.filter((_, i) => i !== idx);
    setMcqOptions(updated);
    if (correctMcqAnswer === mcqOptions[idx]) {
      setCorrectMcqAnswer("");
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestionText) return;

    if (questionType === "mcq") {
      const cleanOptions = mcqOptions.filter(opt => opt.trim() !== "");
      if (cleanOptions.length < 2) {
        alert("Please add at least 2 non-empty MCQ options.");
        return;
      }
      if (!correctMcqAnswer) {
        alert("Please select a correct answer option.");
        return;
      }
    }

    if (editingId) {
      // Edit existing
      setQuestions(prev => prev.map(q => {
        if (q.id === editingId) {
          return {
            ...q,
            text: currentQuestionText,
            marks: currentQuestionMarks,
            options: questionType === "mcq" ? mcqOptions.filter(o => o.trim() !== "") : undefined,
            correctAnswer: questionType === "mcq" ? correctMcqAnswer : undefined,
            difficulty: currentQuestionDifficulty || undefined,
            explanation: currentQuestionExplanation || undefined
          };
        }
        return q;
      }));
      setEditingId(null);
    } else {
      // Create new
      const newQ: Question = {
        id: "q-" + Date.now(),
        text: currentQuestionText,
        type: questionType,
        marks: currentQuestionMarks,
        options: questionType === "mcq" ? mcqOptions.filter(o => o.trim() !== "") : undefined,
        correctAnswer: questionType === "mcq" ? correctMcqAnswer : undefined,
        difficulty: currentQuestionDifficulty || undefined,
        explanation: currentQuestionExplanation || undefined
      };
      setQuestions([...questions, newQ]);
    }

    // Reset question form
    setCurrentQuestionText("");
    setCurrentQuestionMarks(10);
    setMcqOptions(["", ""]);
    setCorrectMcqAnswer("");
    setCurrentQuestionDifficulty("Medium");
    setCurrentQuestionExplanation("");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        const parsedQuestions: Question[] = [];
        const errors: string[] = [];

        rows.forEach((row, index) => {
          const rowNum = index + 2; // Row number in Excel sheet (excluding header)
          
          const qText = row["Question"] || row["question"] || row["QUESTION"];
          const optA = row["Option A"] || row["option a"] || row["OptionA"] || row["optionA"];
          const optB = row["Option B"] || row["option b"] || row["OptionB"] || row["optionB"];
          const optC = row["Option C"] || row["option c"] || row["OptionC"] || row["optionC"];
          const optD = row["Option D"] || row["option d"] || row["OptionD"] || row["optionD"];
          const correctAnswer = row["Correct Answer"] || row["correct answer"] || row["CorrectAnswer"] || row["correctAnswer"];
          const marksRaw = row["Marks"] || row["marks"] || row["MARKS"];
          const qTypeRaw = row["Question Type"] || row["question type"] || row["QuestionType"] || row["questionType"] || "mcq";
          const difficultyRaw = row["Difficulty"] || row["difficulty"] || row["DIFFICULTY"] || "Medium";
          const explanationRaw = row["Explanation"] || row["explanation"] || row["EXPLANATION"] || "";

          if (!qText || String(qText).trim() === "") {
            errors.push(`Row ${rowNum}: Question statement is required.`);
            return;
          }

          const marks = Number(marksRaw);
          if (isNaN(marks) || marks <= 0) {
            errors.push(`Row ${rowNum}: Marks weight must be a positive number.`);
            return;
          }

          const qType: QuestionType = String(qTypeRaw).trim().toLowerCase() === "written" ? "written" : "mcq";

          if (qType === "mcq") {
            const options: string[] = [];
            if (optA !== undefined && String(optA).trim() !== "") options.push(String(optA).trim());
            if (optB !== undefined && String(optB).trim() !== "") options.push(String(optB).trim());
            if (optC !== undefined && String(optC).trim() !== "") options.push(String(optC).trim());
            if (optD !== undefined && String(optD).trim() !== "") options.push(String(optD).trim());

            if (options.length < 2) {
              errors.push(`Row ${rowNum}: MCQ question must have at least 2 non-empty options.`);
              return;
            }

            if (correctAnswer === undefined || String(correctAnswer).trim() === "") {
              errors.push(`Row ${rowNum}: Correct Answer is required for MCQ question.`);
              return;
            }

            const cleanCorrectAnswer = String(correctAnswer).trim();
            let matchedCorrectAnswer = "";
            const lowerClean = cleanCorrectAnswer.toLowerCase();
            
            if (lowerClean === "option a" || lowerClean === "a") {
              matchedCorrectAnswer = options[0] || "";
            } else if (lowerClean === "option b" || lowerClean === "b") {
              matchedCorrectAnswer = options[1] || "";
            } else if (lowerClean === "option c" || lowerClean === "c") {
              matchedCorrectAnswer = options[2] || "";
            } else if (lowerClean === "option d" || lowerClean === "d") {
              matchedCorrectAnswer = options[3] || "";
            } else {
              const foundOpt = options.find(opt => opt.toLowerCase() === lowerClean);
              if (foundOpt) {
                matchedCorrectAnswer = foundOpt;
              } else {
                errors.push(`Row ${rowNum}: Correct Answer ("${cleanCorrectAnswer}") does not match any of the option values or option letters (A, B, C, D).`);
                return;
              }
            }

            parsedQuestions.push({
              id: "q-excel-" + Date.now() + "-" + index,
              text: String(qText).trim(),
              type: "mcq",
              options,
              correctAnswer: matchedCorrectAnswer,
              marks,
              difficulty: String(difficultyRaw).trim(),
              explanation: String(explanationRaw).trim() || undefined
            });
          } else {
            parsedQuestions.push({
              id: "q-excel-" + Date.now() + "-" + index,
              text: String(qText).trim(),
              type: "written",
              marks,
              difficulty: String(difficultyRaw).trim(),
              explanation: String(explanationRaw).trim() || undefined
            });
          }
        });

        if (errors.length > 0) {
          setImportErrors(errors);
          if (parsedQuestions.length > 0) {
            setQuestions(prev => [...prev, ...parsedQuestions]);
          }
        } else {
          setQuestions(prev => [...prev, ...parsedQuestions]);
          setImportErrors([]);
          alert(`Successfully imported all ${parsedQuestions.length} questions!`);
        }
      } catch (err) {
        console.error("Error reading Excel:", err);
        alert("Invalid Excel file format or corrupted file.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleEditQuestion = (q: Question) => {
    setEditingId(q.id);
    setCurrentQuestionText(q.text);
    setCurrentQuestionMarks(q.marks);
    setCurrentQuestionDifficulty(q.difficulty || "Medium");
    setCurrentQuestionExplanation(q.explanation || "");
    if (q.options) {
      setMcqOptions(q.options);
      setCorrectMcqAnswer(q.correctAnswer || "");
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      setBatchModalError("Batch name is required");
      return;
    }

    try {
      const batchData = {
        batchName: newBatchName.trim(),
        course: newBatchCourse.trim() || subject || "General Curriculum",
        subject: newBatchSubject.trim() || subject || "General Curriculum",
        description: newBatchDesc.trim(),
        startDate: newBatchStart,
        endDate: newBatchEnd,
        createdBy: currentUser?.name || "Instructor"
      };

      const created = await apiService.createBatch(batchData);
      setCustomBatches(prev => [...prev, created]);
      setSelectedBatches(prev => [...prev, created.batchName]);
      
      // Reset state
      setNewBatchName("");
      setNewBatchCourse("");
      setNewBatchSubject("");
      setNewBatchDesc("");
      setNewBatchStart("");
      setNewBatchEnd("");
      setNewBatchStudentCount("");
      setBatchModalError("");
      setShowBatchModal(false);
    } catch (err: any) {
      console.error("Batch creation failure:", err);
      setBatchModalError(err.message || "Failed to create batch. Please try again.");
    }
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!title || !subject) {
      alert("Please fill in assessment title and subject.");
      return;
    }

    if (status === "published") {
      if (selectedBatches.length === 0) {
        alert("Publishing requires selecting at least one batch.");
        return;
      }
      if (!deadline) {
        alert("Publishing requires setting a deadline.");
        return;
      }
      if (questions.length === 0) {
        alert("Publishing requires adding at least one question.");
        return;
      }
      if (totalMarks <= 0) {
        alert("Publishing requires an assessment with total marks > 0.");
        return;
      }
    }

    if (importErrors.length > 0) {
      alert("Please resolve all validation errors before saving or publishing.");
      return;
    }

    const newAssessment: Assessment = {
      id: "a-" + Date.now(),
      title,
      subject,
      batch: selectedBatches[0] || "",
      batches: selectedBatches,
      instructions,
      questionType,
      questions,
      totalMarks,
      deadline: deadline || new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      status,
      createdAt: new Date().toISOString()
    };

    await saveAssessment(newAssessment);
    router.push("/assessments");
  };

  return (
    <div className="space-y-6">
      {/* Back navigation header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/assessments")}
            className="p-2 border border-border rounded-xl text-text-muted hover:text-primary hover:bg-white transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground">Interactive Assessment Creator</h1>
            <span className="text-xs text-text-muted font-bold tracking-wide">Design custom MCQ or written quizzes</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleSave("draft")}
            disabled={importErrors.length > 0}
            className={`bg-white border border-border text-foreground hover:bg-[#F7F8FC] font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all ${
              importErrors.length > 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={importErrors.length > 0}
            className={`bg-primary hover:bg-primary-dark text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all ${
              importErrors.length > 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Publish Assessment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quiz General Parameters */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">
              Parameters
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Assessment Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. React hooks and state"
                className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Subject / Class Name</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Front-end Development"
                className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Answer all questions..."
                className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary h-24 font-semibold resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Assign Batches</label>
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(true)}
                    className="text-[10px] text-primary hover:text-primary-dark font-black uppercase cursor-pointer"
                  >
                    + New Batch
                  </button>
                </div>
                <div
                  onClick={() => setBatchDropdownOpen(!batchDropdownOpen)}
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none cursor-pointer font-semibold min-h-[38px] flex flex-wrap gap-1 items-center justify-between"
                >
                  <div className="flex flex-wrap gap-1 max-w-[90%]">
                    {selectedBatches.length === 0 ? (
                      <span className="text-text-muted">Select Batches</span>
                    ) : (
                      selectedBatches.map(b => (
                        <span
                          key={b}
                          className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBatches(selectedBatches.filter(item => item !== b));
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

                {batchDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg p-2.5 space-y-2 max-h-48 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-[#F7F8FC] border border-border rounded-lg px-2 py-1 text-[11px] outline-none font-semibold"
                    />
                    <div className="flex items-center gap-2 pb-1.5 border-b border-border/45">
                      <input
                        type="checkbox"
                        id="select-all-creator-batches"
                        checked={selectedBatches.length === allBatches.length}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBatches(allBatches);
                          } else {
                            setSelectedBatches([]);
                          }
                        }}
                        className="rounded text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor="select-all-creator-batches" className="text-[11px] font-bold text-foreground cursor-pointer select-none">
                        Select All
                      </label>
                    </div>
                    <div className="space-y-1 pt-1">
                      {allBatches.filter(b => b.toLowerCase().includes(batchSearch.toLowerCase())).map(b => (
                        <div key={b} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`creator-batch-${b}`}
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
                          <label htmlFor={`creator-batch-${b}`} className="text-[11px] font-semibold text-foreground cursor-pointer select-none flex-grow">
                            {b}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Quiz Type</label>
                <select
                  value={questionType}
                  onChange={(e) => {
                    setQuestionType(e.target.value as QuestionType);
                    setQuestions([]);
                  }}
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary font-semibold cursor-pointer"
                >
                  <option value="mcq">MCQ Quiz</option>
                  <option value="written">Written Test</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Deadline Time</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                required
              />
            </div>

            <div className="border-t border-border/50 pt-4 flex justify-between items-center text-xs font-bold">
              <span className="text-text-muted">Total Marks:</span>
              <span className="text-primary font-black text-sm">{totalMarks} Marks</span>
            </div>
          </div>
        </div>

        {/* Dynamic Question Creator Block */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Creator Mode Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreationMode("manual")}
              className={`flex-1 text-center py-2.5 rounded-xl font-bold text-xs uppercase cursor-pointer border transition-all ${
                creationMode === "manual"
                  ? "bg-primary border-primary text-white shadow-xs"
                  : "bg-white border-border text-text-muted hover:bg-[#F7F8FC]"
              }`}
            >
              Create Manually
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("excel")}
              className={`flex-1 text-center py-2.5 rounded-xl font-bold text-xs uppercase cursor-pointer border transition-all ${
                creationMode === "excel"
                  ? "bg-primary border-primary text-white shadow-xs"
                  : "bg-white border-border text-text-muted hover:bg-[#F7F8FC]"
              }`}
            >
              Import from Excel
            </button>
          </div>

          {/* Validation Errors Box */}
          {importErrors.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle size={18} />
                <span className="text-xs font-black uppercase tracking-wider">Excel Import Validation Errors ({importErrors.length})</span>
              </div>
              <p className="text-[11px] text-rose-600 font-semibold">
                The file was parsed but contains invalid rows. Publishing is blocked until all issues are resolved.
              </p>
              <div className="bg-white border border-rose-100 rounded-xl p-3 max-h-32 overflow-y-auto text-[11px] text-rose-700 font-bold space-y-1 custom-scrollbar">
                {importErrors.map((err, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span>•</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setImportErrors([])}
                className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-all"
              >
                Dismiss Validation log
              </button>
            </div>
          )}

          {/* Excel Import Mode Form */}
          {creationMode === "excel" ? (
            <div className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-5">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">
                Import Spreadsheet
              </h3>
              
              <div className="border-2 border-dashed border-border/80 rounded-2xl p-8 text-center bg-[#F7F8FC]/50 hover:bg-[#F7F8FC] hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-4 relative">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Upload size={20} />
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">Select your spreadsheet file</span>
                  <span className="text-[10px] text-text-muted block mt-1 leading-relaxed">
                    Supports Excel (.xlsx, .xls) and CSV (.csv) formats up to 5MB.<br/>
                    Expected Columns: <code className="bg-white px-1.5 py-0.5 rounded border text-[9px] font-mono text-primary font-black">Question</code>, <code className="bg-white px-1.5 py-0.5 rounded border text-[9px] font-mono text-primary font-black">Option A</code>, <code className="bg-white px-1.5 py-0.5 rounded border text-[9px] font-mono text-primary font-black">Option B</code>, <code className="bg-white px-1.5 py-0.5 rounded border text-[9px] font-mono text-primary font-black">Correct Answer</code>, <code className="bg-white px-1.5 py-0.5 rounded border text-[9px] font-mono text-primary font-black">Marks</code>, <code className="bg-white px-1.5 py-0.5 rounded border text-[9px] font-mono text-primary font-black">Question Type</code>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportExcel}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <button type="button" className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-4.5 py-2.5 rounded-xl transition-all shadow-xs pointer-events-none">
                    Choose File
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Question Builder Form */
            <div className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-4">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-wider border-b border-border/50 pb-2">
                {editingId ? "Edit Question Definition" : "Add New Question"}
              </h3>

              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Question Statement</label>
                  <textarea
                    value={currentQuestionText}
                    onChange={(e) => setCurrentQuestionText(e.target.value)}
                    placeholder="e.g. What is the complexity of binary search?"
                    className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary h-20 font-semibold resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Marks Weight</label>
                    <input
                      type="number"
                      value={currentQuestionMarks}
                      onChange={(e) => setCurrentQuestionMarks(Number(e.target.value))}
                      min={1}
                      className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Difficulty Level</label>
                    <select
                      value={currentQuestionDifficulty}
                      onChange={(e) => setCurrentQuestionDifficulty(e.target.value)}
                      className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Explanation (Optional)</label>
                  <input
                    type="text"
                    value={currentQuestionExplanation}
                    onChange={(e) => setCurrentQuestionExplanation(e.target.value)}
                    placeholder="e.g. Correct because binary search splits array into halves O(log n)."
                    className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                  />
                </div>

                {/* Dynamic Option Fields for MCQ */}
                {questionType === "mcq" && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Multiple Choice Options</label>
                      <button
                        type="button"
                        onClick={addOptionField}
                        className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                      >
                        <Plus size={14} /> Add Option
                      </button>
                    </div>

                    <div className="space-y-2">
                      {mcqOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCorrectMcqAnswer(opt)}
                            className={`w-6 h-6 border rounded-lg flex items-center justify-center transition-all ${
                              correctMcqAnswer === opt && opt !== ""
                                ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                                : "border-border text-transparent hover:border-emerald-500"
                            }`}
                          >
                            <Check size={14} />
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 bg-[#F7F8FC] border border-border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => removeOptionField(idx)}
                            disabled={mcqOptions.length <= 2}
                            className="p-2 border border-border rounded-xl text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#84117C] hover:bg-[#6c0e66] text-white font-bold py-3 rounded-xl text-xs uppercase cursor-pointer"
                >
                  {editingId ? "Save Question Changes" : "Save Question and Add to List"}
                </button>
              </form>
            </div>
          )}

          {/* List of Added Questions */}
          <div className="bg-white border border-border p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-border/50 pb-2">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-wider">
                Question Outline ({questions.length})
              </h3>
              {questions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Eye size={14} /> Preview Quiz
                </button>
              )}
            </div>

            {questions.length > 0 ? (
              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="p-4 border border-border/60 rounded-xl bg-[#F7F8FC]/40 hover:bg-[#F7F8FC] transition-all flex justify-between items-start gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wide">
                          {q.marks} Marks
                        </span>
                        <span className="text-[10px] font-black uppercase bg-[#84117C]/10 text-[#84117C] border border-[#84117C]/20 px-2 py-0.5 rounded-full">
                          {q.type}
                        </span>
                      </div>
                      <span className="font-semibold text-sm text-foreground block">{q.text}</span>
                      
                      {q.options && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {q.options.map((opt, i) => (
                            <span
                              key={i}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border text-left flex items-center gap-1.5 ${
                                q.correctAnswer === opt
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                                  : "bg-white text-foreground border-border"
                              }`}
                            >
                              {opt}
                              {q.correctAnswer === opt && <Check size={12} className="text-emerald-600" />}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditQuestion(q)}
                        className="p-2 border border-border rounded-xl text-primary hover:bg-white cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-2 border border-border rounded-xl text-rose-500 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 border border-dashed border-border rounded-xl text-center text-xs font-bold text-text-muted uppercase tracking-widest bg-[#F7F8FC]/50">
                No questions defined. Use the form above to add questions.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Simulated Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-lg animate-fadeIn flex flex-col h-[85vh]">
            <div className="bg-primary p-6 text-white flex justify-between items-center flex-shrink-0">
              <div className="space-y-1">
                <h3 className="font-black text-sm uppercase tracking-wider">Quiz Preview Simulator</h3>
                <span className="text-xs text-white/70 block">Review layout as seen by student candidates</span>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 bg-[#F7F8FC]">
              <div className="bg-white border border-border p-6 rounded-2xl">
                <h2 className="text-lg font-black text-foreground">{title || "Untitled Quiz"}</h2>
                <span className="text-xs text-text-muted block mt-1">Class: {subject || "Subject"} | Total: {totalMarks} Marks</span>
                <p className="text-xs text-foreground bg-[#F7F8FC] p-3 rounded-xl border mt-3 italic">
                  Instructions: {instructions || "Answer all questions inside the player."}
                </p>
              </div>

              <div className="space-y-4">
                {questions.map((q, index) => (
                  <div key={q.id} className="bg-white border border-border p-6 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-primary uppercase">Question {index + 1}</span>
                      <span className="text-xs font-bold text-text-muted">{q.marks} Marks</span>
                    </div>
                    <p className="font-bold text-sm text-foreground">{q.text}</p>

                    {q.options && (
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

                    {!q.options && (
                      <textarea
                        disabled
                        placeholder="Learner will type answer text here..."
                        className="w-full bg-[#F7F8FC] border border-border rounded-xl p-3 text-xs outline-none h-24 font-semibold resize-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-border bg-white flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="bg-zinc-800 hover:bg-zinc-900 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase cursor-pointer"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-lg animate-fadeIn flex flex-col">
            <div className="bg-[#84117C] p-5 text-white flex justify-between items-center flex-shrink-0">
              <div className="space-y-0.5">
                <h3 className="font-black text-sm uppercase tracking-wider">Create New Training Batch</h3>
                <span className="text-[10px] text-white/70 block">Register new candidate group</span>
              </div>
              <button onClick={() => { setShowBatchModal(false); setBatchModalError(""); }} className="text-white/80 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              {batchModalError && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600 flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{batchModalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Batch E"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Course Name</label>
                  <input
                    type="text"
                    placeholder="e.g. React Fundamentals"
                    value={newBatchCourse}
                    onChange={(e) => setNewBatchCourse(e.target.value)}
                    className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Front-end Dev"
                    value={newBatchSubject}
                    onChange={(e) => setNewBatchSubject(e.target.value)}
                    className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Description</label>
                <textarea
                  placeholder="Batch description and notes..."
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                  className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary h-20 font-semibold resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Start Date</label>
                  <input
                    type="date"
                    value={newBatchStart}
                    onChange={(e) => setNewBatchStart(e.target.value)}
                    className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">End Date</label>
                  <input
                    type="date"
                    value={newBatchEnd}
                    onChange={(e) => setNewBatchEnd(e.target.value)}
                    className="w-full bg-[#F7F8FC] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setShowBatchModal(false); setBatchModalError(""); }}
                  className="bg-white border border-border text-foreground hover:bg-[#F7F8FC] font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#84117C] hover:bg-[#6c0e66] text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-xs transition-all"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
