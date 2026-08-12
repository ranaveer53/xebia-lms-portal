"use client";

import React, { useState } from "react";
import Card, { CardBody } from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal, { ConfirmModal } from "../../../components/common/Modal";
import { TableSkeleton } from "../../../components/common/Skeleton";
import ErrorState from "../../../components/common/ErrorState";
import useToast from "../../../hooks/useToast";
import PageHeader from "../../../components/common/PageHeader";
import DataTable from "../../../components/common/DataTable";
import MetricCard from "../../../components/common/MetricCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assessmentService, courseService } from "../../../services/api";
import { useGetLearnerCredentials } from "../../../hooks/useLearnerCredentials";
import { ClipboardList, Plus, Users, Trash2, UserCheck, CheckCircle, PlusCircle, MinusCircle, FileText, ToggleLeft, ToggleRight } from "lucide-react";

export default function AdminAssessmentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: assessments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => assessmentService.getAssessments(),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => courseService.getCourses(),
  });

  const { data: learners = [] } = useGetLearnerCredentials();

  const createMutation = useMutation({
    mutationFn: (data) => assessmentService.createAssessment(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["assessments"]);
      toast.addToast("Assessment created successfully.", "success");
      setCreateOpen(false);
      resetForm();
    },
    onError: (e) => toast.addToast(`Failed: ${e.message}`, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => assessmentService.deleteAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["assessments"]);
      toast.addToast("Assessment deleted.", "success");
      setDeleteOpen(false);
    },
    onError: (e) => toast.addToast(`Failed: ${e.message}`, "error"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ assessmentId, learnerEmails }) =>
      assessmentService.assignToLearners(assessmentId, learnerEmails),
    onSuccess: () => {
      queryClient.invalidateQueries(["assessments"]);
      toast.addToast("Assessment assigned to learners.", "success");
      setAssignOpen(false);
    },
    onError: (e) => toast.addToast(`Failed: ${e.message}`, "error"),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigningAssessment, setAssigningAssessment] = useState(null);
  const [selectedLearners, setSelectedLearners] = useState([]);

  // Each question: { id, type: 'mcq'|'written', prompt, options, answer }
  const makeQuestion = (type = "mcq") => ({
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    prompt: "",
    options: type === "mcq" ? ["", "", "", ""] : [],
    answer: "",
  });

  const emptyForm = {
    title: "",
    description: "",
    courseId: "",
    durationMinutes: 20,
    passingScore: 70,
    questions: [makeQuestion("mcq")],
  };

  const [form, setForm] = useState(emptyForm);

  const resetForm = () => setForm({
    ...emptyForm,
    questions: [makeQuestion("mcq")],
  });

  const updateQuestion = (index, field, value) => {
    setForm(f => {
      const qs = [...f.questions];
      qs[index] = { ...qs[index], [field]: value };
      return { ...f, questions: qs };
    });
  };

  const toggleQuestionType = (index) => {
    setForm(f => {
      const qs = [...f.questions];
      const current = qs[index];
      const newType = current.type === "mcq" ? "written" : "mcq";
      qs[index] = {
        ...current,
        type: newType,
        options: newType === "mcq" ? ["", "", "", ""] : [],
        answer: "",
      };
      return { ...f, questions: qs };
    });
  };

  const updateOption = (qIndex, oIndex, value) => {
    setForm(f => {
      const qs = [...f.questions];
      const opts = [...qs[qIndex].options];
      opts[oIndex] = value;
      qs[qIndex] = { ...qs[qIndex], options: opts };
      return { ...f, questions: qs };
    });
  };

  const addOption = (qIndex) => {
    setForm(f => {
      const qs = [...f.questions];
      qs[qIndex] = { ...qs[qIndex], options: [...qs[qIndex].options, ""] };
      return { ...f, questions: qs };
    });
  };

  const removeOption = (qIndex, oIndex) => {
    setForm(f => {
      const qs = [...f.questions];
      const opts = qs[qIndex].options.filter((_, i) => i !== oIndex);
      const newAnswer = qs[qIndex].answer === qs[qIndex].options[oIndex] ? "" : qs[qIndex].answer;
      qs[qIndex] = { ...qs[qIndex], options: opts, answer: newAnswer };
      return { ...f, questions: qs };
    });
  };

  const addQuestion = (type = "mcq") => {
    setForm(f => ({
      ...f,
      questions: [...f.questions, makeQuestion(type)],
    }));
  };

  const removeQuestion = (index) => {
    setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== index) }));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.addToast("Title is required.", "error");
    if (form.questions.length === 0) return toast.addToast("Add at least one question.", "error");

    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.prompt.trim()) return toast.addToast(`Question ${i + 1}: prompt is required.`, "error");
      if (q.type === "mcq") {
        const validOpts = q.options.filter(o => o.trim() !== "");
        if (validOpts.length < 2) return toast.addToast(`Question ${i + 1}: At least 2 options required for MCQ.`, "error");
        if (!q.answer.trim()) return toast.addToast(`Question ${i + 1}: Select the correct answer.`, "error");
      }
    }

    createMutation.mutate(form);
  };

  const openDelete = (id) => { setDeletingId(id); setDeleteOpen(true); };

  const openAssign = (assessment) => {
    setAssigningAssessment(assessment);
    setSelectedLearners(assessment.assignedTo || []);
    setAssignOpen(true);
  };

  const toggleLearner = (email) => {
    setSelectedLearners(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleAssign = () => {
    if (!assigningAssessment) return;
    assignMutation.mutate({ assessmentId: assigningAssessment.id, learnerEmails: selectedLearners });
  };

  // Determine overall assessment type from first question type
  const getAssessmentType = (row) => {
    if (!row.questions || row.questions.length === 0) return "mixed";
    const types = [...new Set(row.questions.map(q => q.type || (q.options?.length ? "mcq" : "written")))];
    if (types.length === 1) return types[0];
    return "mixed";
  };

  const columns = [
    {
      header: "Assessment",
      key: "title",
      render: (row) => (
        <div>
          <span className="font-bold text-foreground block">{row.title}</span>
          <span className="text-[10px] text-text-muted block">{row.description}</span>
        </div>
      ),
    },
    {
      header: "Type",
      key: "type",
      render: (row) => {
        const t = getAssessmentType(row);
        const colors = {
          mcq: "bg-blue-50 text-blue-700 border-blue-100",
          written: "bg-violet-50 text-violet-700 border-violet-100",
          mixed: "bg-amber-50 text-amber-700 border-amber-100",
        };
        return (
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${colors[t] || colors.mixed}`}>
            {t === "mcq" ? "MCQ" : t === "written" ? "Written" : "Mixed"}
          </span>
        );
      },
    },
    {
      header: "Questions",
      key: "questions",
      render: (row) => <span className="font-bold text-primary">{row.questions?.length || 0} Qs</span>,
    },
    {
      header: "Duration",
      key: "durationMinutes",
      render: (row) => <span className="text-xs font-semibold text-text-muted">{row.durationMinutes} min</span>,
    },
    {
      header: "Pass Score",
      key: "passingScore",
      render: (row) => <span className="text-xs font-bold text-accent">{row.passingScore}%</span>,
    },
    {
      header: "Assigned Learners",
      key: "assignedTo",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          <UserCheck className="w-3 h-3" />
          {(row.assignedTo || []).length} learners
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => openAssign(row)} className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs">Assign</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => openDelete(row.id)}>
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Create MCQ or Written assessments and assign them to learners."
        breadcrumbs={[
          { label: "Admin Console", href: "/admin" },
          { label: "Assessments", href: "/admin/assessments" },
        ]}
        actions={
          <Button variant="primary" size="md" className="flex items-center gap-1.5" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="w-4 h-4" />
            <span>Create Assessment</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Assessments" value={assessments.length} icon={ClipboardList} description="Active assessments in system" />
        <MetricCard title="Total Assignments" value={assessments.reduce((acc, a) => acc + (a.assignedTo?.length || 0), 0)} icon={UserCheck} description="Learner-assessment links" />
        <MetricCard title="Avg Questions" value={assessments.length ? Math.round(assessments.reduce((acc, a) => acc + (a.questions?.length || 0), 0) / assessments.length) : 0} icon={CheckCircle} description="Questions per assessment" />
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} cols={6} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={assessments}
          emptyTitle="No assessments yet"
          emptyDescription="Create the first assessment and assign it to learners."
        />
      )}

      {/* Create Assessment Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Assessment" size="xl">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Assessment Title" placeholder="e.g. Spring Boot Basics Quiz" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Linked Course</label>
              <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} className="w-full px-3 py-2 border border-border bg-white rounded-xl text-sm focus:outline-none focus:border-primary/50">
                <option value="">-- Select a course (optional) --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>
          <Input label="Description" placeholder="Brief overview of what this assessment tests" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (minutes)" type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            <Input label="Passing Score (%)" type="number" value={form.passingScore} onChange={e => setForm(f => ({ ...f, passingScore: Number(e.target.value) }))} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground">Questions ({form.questions.length})</h3>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addQuestion("mcq")} className="flex items-center gap-1 text-blue-700 border-blue-200 hover:bg-blue-50">
                  <PlusCircle className="w-3.5 h-3.5" /> + MCQ
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addQuestion("written")} className="flex items-center gap-1 text-violet-700 border-violet-200 hover:bg-violet-50">
                  <FileText className="w-3.5 h-3.5" /> + Written
                </Button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto space-y-4 pr-1">
              {form.questions.map((q, qi) => (
                <Card key={q.id} className={`border ${q.type === "written" ? "border-violet-200" : "border-blue-200"}`}>
                  <CardBody className="p-4 space-y-3">
                    {/* Question header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-primary uppercase">Q{qi + 1}</span>
                        {/* Type badge + toggle */}
                        <button
                          type="button"
                          onClick={() => toggleQuestionType(qi)}
                          className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                            q.type === "written"
                              ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                              : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                          }`}
                          title="Click to toggle between MCQ and Written"
                        >
                          {q.type === "written" ? <FileText className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {q.type === "written" ? "Written" : "MCQ"}
                          <span className="opacity-60">(toggle)</span>
                        </button>
                      </div>
                      {form.questions.length > 1 && (
                        <button type="button" onClick={() => removeQuestion(qi)} className="text-rose-500 hover:text-rose-700">
                          <MinusCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Prompt */}
                    <Input placeholder={q.type === "written" ? "Written question prompt (e.g. Explain REST principles)" : "MCQ question prompt (e.g. What is dependency injection?)"} value={q.prompt} onChange={e => updateQuestion(qi, "prompt", e.target.value)} />

                    {/* MCQ Options */}
                    {q.type === "mcq" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Options</label>
                          {q.options.length < 6 && (
                            <button type="button" onClick={() => addOption(qi)} className="text-[10px] text-blue-600 font-bold hover:underline">+ Add Option</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-text-muted w-4">{String.fromCharCode(65 + oi)}.</span>
                              <input
                                type="text"
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                value={opt}
                                onChange={e => updateOption(qi, oi, e.target.value)}
                                className="flex-1 px-2.5 py-1.5 border border-border bg-[#F7F8FC] rounded-lg text-xs focus:outline-none focus:border-primary font-semibold"
                              />
                              {q.options.length > 2 && (
                                <button type="button" onClick={() => removeOption(qi, oi)} className="text-rose-400 hover:text-rose-600">
                                  <MinusCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-foreground uppercase tracking-wider">Correct Answer</label>
                          <select
                            value={q.answer}
                            onChange={e => updateQuestion(qi, "answer", e.target.value)}
                            className="w-full px-3 py-2 border border-border bg-white rounded-xl text-sm focus:outline-none focus:border-primary/50"
                          >
                            <option value="">-- Select correct option --</option>
                            {q.options.filter(Boolean).map((opt, i) => (
                              <option key={i} value={opt}>{String.fromCharCode(65 + i)}. {opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Written Info */}
                    {q.type === "written" && (
                      <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-3">
                        <p className="text-[11px] text-violet-700 font-semibold leading-relaxed">
                          📝 <strong>Written question</strong> — Learners will see a text box to type their essay/descriptive answer. Grading must be done manually by the teacher.
                        </p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={createMutation.isPending}>Create Assessment</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title={`Assign: ${assigningAssessment?.title}`} size="lg">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Select learners to assign this assessment. They will see it on their dashboard.</p>
          <div className="max-h-72 overflow-y-auto space-y-2 border border-border rounded-xl p-3">
            {learners.length === 0 && <p className="text-sm text-text-muted text-center py-4">No learners found. Create learner credentials first.</p>}
            {learners.map(learner => (
              <label key={learner.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-border transition-all">
                <input
                  type="checkbox"
                  checked={selectedLearners.includes(learner.email)}
                  onChange={() => toggleLearner(learner.email)}
                  className="w-4 h-4 text-primary rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{learner.learnerName}</p>
                  <p className="text-xs text-text-muted truncate">{learner.email}</p>
                </div>
                {selectedLearners.includes(learner.email) && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Assigned</span>
                )}
              </label>
            ))}
          </div>
          <p className="text-xs text-text-muted">{selectedLearners.length} learner(s) selected</p>
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAssign} loading={assignMutation.isPending}>Save Assignments</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        loading={deleteMutation.isPending}
        title="Delete Assessment?"
        message="This will permanently remove the assessment and all assignments. Learners will no longer see it."
      />
    </div>
  );
}


export default function AdminAssessmentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch assessments
  const { data: assessments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => assessmentService.getAssessments(),
  });

  // Fetch courses for dropdown
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => courseService.getCourses(),
  });

  // Fetch learners for assignment
  const { data: learners = [] } = useGetLearnerCredentials();

  // Create assessment mutation
  const createMutation = useMutation({
    mutationFn: (data) => assessmentService.createAssessment(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["assessments"]);
      toast.addToast("Assessment created successfully.", "success");
      setCreateOpen(false);
      resetForm();
    },
    onError: (e) => toast.addToast(`Failed: ${e.message}`, "error"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => assessmentService.deleteAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["assessments"]);
      toast.addToast("Assessment deleted.", "success");
      setDeleteOpen(false);
    },
    onError: (e) => toast.addToast(`Failed: ${e.message}`, "error"),
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: ({ assessmentId, learnerEmails }) =>
      assessmentService.assignToLearners(assessmentId, learnerEmails),
    onSuccess: () => {
      queryClient.invalidateQueries(["assessments"]);
      toast.addToast("Assessment assigned to learners.", "success");
      setAssignOpen(false);
    },
    onError: (e) => toast.addToast(`Failed: ${e.message}`, "error"),
  });

  // State
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigningAssessment, setAssigningAssessment] = useState(null);
  const [selectedLearners, setSelectedLearners] = useState([]);

  // Form state for creating assessment
  const emptyForm = {
    title: "",
    description: "",
    courseId: "",
    durationMinutes: 20,
    passingScore: 70,
    questions: [
      { id: "q-1", prompt: "", options: ["", "", "", ""], answer: "" },
    ],
  };
  const [form, setForm] = useState(emptyForm);

  const resetForm = () => setForm({
    title: "",
    description: "",
    courseId: "",
    durationMinutes: 20,
    passingScore: 70,
    questions: [{ id: `q-${Date.now()}`, prompt: "", options: ["", "", "", ""], answer: "" }],
  });

  const updateQuestion = (index, field, value) => {
    setForm(f => {
      const qs = [...f.questions];
      qs[index] = { ...qs[index], [field]: value };
      return { ...f, questions: qs };
    });
  };

  const updateOption = (qIndex, oIndex, value) => {
    setForm(f => {
      const qs = [...f.questions];
      const opts = [...qs[qIndex].options];
      opts[oIndex] = value;
      qs[qIndex] = { ...qs[qIndex], options: opts };
      return { ...f, questions: qs };
    });
  };

  const addQuestion = () => {
    setForm(f => ({
      ...f,
      questions: [...f.questions, { id: `q-${Date.now()}`, prompt: "", options: ["", "", "", ""], answer: "" }],
    }));
  };

  const removeQuestion = (index) => {
    setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== index) }));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.addToast("Title is required.", "error");
    if (form.questions.length === 0) return toast.addToast("Add at least one question.", "error");
    
    // Validate each question
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.prompt.trim()) return toast.addToast(`Question ${i + 1} prompt is required.`, "error");
      if (!q.answer.trim()) return toast.addToast(`Select a correct answer for question ${i + 1}.`, "error");
    }

    createMutation.mutate(form);
  };

  const openDelete = (id) => { setDeletingId(id); setDeleteOpen(true); };

  const openAssign = (assessment) => {
    setAssigningAssessment(assessment);
    setSelectedLearners(assessment.assignedTo || []);
    setAssignOpen(true);
  };

  const toggleLearner = (email) => {
    setSelectedLearners(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleAssign = () => {
    if (!assigningAssessment) return;
    assignMutation.mutate({ assessmentId: assigningAssessment.id, learnerEmails: selectedLearners });
  };

  const columns = [
    {
      header: "Assessment",
      key: "title",
      render: (row) => (
        <div>
          <span className="font-bold text-foreground block">{row.title}</span>
          <span className="text-[10px] text-text-muted block">{row.description}</span>
        </div>
      ),
    },
    {
      header: "Questions",
      key: "questions",
      render: (row) => <span className="font-bold text-primary">{row.questions?.length || 0} Qs</span>,
    },
    {
      header: "Duration",
      key: "durationMinutes",
      render: (row) => <span className="text-xs font-semibold text-text-muted">{row.durationMinutes} min</span>,
    },
    {
      header: "Pass Score",
      key: "passingScore",
      render: (row) => <span className="text-xs font-bold text-accent">{row.passingScore}%</span>,
    },
    {
      header: "Assigned Learners",
      key: "assignedTo",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          <UserCheck className="w-3 h-3" />
          {(row.assignedTo || []).length} learners
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => openAssign(row)} className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs">Assign</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => openDelete(row.id)}>
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Create assessments and assign them to learners. Learners will see their assigned assessments on their dashboard."
        breadcrumbs={[
          { label: "Admin Console", href: "/admin" },
          { label: "Assessments", href: "/admin/assessments" },
        ]}
        actions={
          <Button variant="primary" size="md" className="flex items-center gap-1.5" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="w-4 h-4" />
            <span>Create Assessment</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Assessments" value={assessments.length} icon={ClipboardList} description="Active assessments in system" />
        <MetricCard title="Total Assignments" value={assessments.reduce((acc, a) => acc + (a.assignedTo?.length || 0), 0)} icon={UserCheck} description="Learner-assessment links" />
        <MetricCard title="Avg Questions" value={assessments.length ? Math.round(assessments.reduce((acc, a) => acc + (a.questions?.length || 0), 0) / assessments.length) : 0} icon={CheckCircle} description="Questions per assessment" />
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} cols={6} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={assessments}
          emptyTitle="No assessments yet"
          emptyDescription="Create the first assessment and assign it to learners."
        />
      )}

      {/* Create Assessment Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Assessment" size="xl">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Assessment Title" placeholder="e.g. Spring Boot Basics Quiz" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Linked Course</label>
              <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} className="w-full px-3 py-2 border border-border bg-white rounded-xl text-sm focus:outline-none focus:border-primary/50">
                <option value="">-- Select a course (optional) --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>
          <Input label="Description" placeholder="Brief overview of what this assessment tests" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (minutes)" type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            <Input label="Passing Score (%)" type="number" value={form.passingScore} onChange={e => setForm(f => ({ ...f, passingScore: Number(e.target.value) }))} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground">Questions ({form.questions.length})</h3>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" /> Add Question
              </Button>
            </div>

            {form.questions.map((q, qi) => (
              <Card key={q.id} className="border border-border">
                <CardBody className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-black text-primary uppercase">Q{qi + 1}</span>
                    {form.questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(qi)} className="text-rose-500 hover:text-rose-700">
                        <MinusCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Input placeholder="Question prompt" value={q.prompt} onChange={e => updateQuestion(qi, "prompt", e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <Input key={oi} placeholder={`Option ${oi + 1}`} value={opt} onChange={e => updateOption(qi, oi, e.target.value)} />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Correct Answer</label>
                    <select value={q.answer} onChange={e => updateQuestion(qi, "answer", e.target.value)} className="w-full px-3 py-2 border border-border bg-white rounded-xl text-sm focus:outline-none focus:border-primary/50">
                      <option value="">-- Select correct answer --</option>
                      {q.options.filter(Boolean).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={createMutation.isPending}>Create Assessment</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title={`Assign: ${assigningAssessment?.title}`} size="lg">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Select learners to assign this assessment. They will see it on their dashboard.</p>
          <div className="max-h-72 overflow-y-auto space-y-2 border border-border rounded-xl p-3">
            {learners.length === 0 && <p className="text-sm text-text-muted text-center py-4">No learners found. Create learner credentials first.</p>}
            {learners.map(learner => (
              <label key={learner.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-border transition-all">
                <input
                  type="checkbox"
                  checked={selectedLearners.includes(learner.email)}
                  onChange={() => toggleLearner(learner.email)}
                  className="w-4 h-4 text-primary rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{learner.learnerName}</p>
                  <p className="text-xs text-text-muted truncate">{learner.email}</p>
                </div>
                {selectedLearners.includes(learner.email) && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Assigned</span>
                )}
              </label>
            ))}
          </div>
          <p className="text-xs text-text-muted">{selectedLearners.length} learner(s) selected</p>
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAssign} loading={assignMutation.isPending}>Save Assignments</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        loading={deleteMutation.isPending}
        title="Delete Assessment?"
        message="This will permanently remove the assessment and all assignments. Learners will no longer see it."
      />
    </div>
  );
}
