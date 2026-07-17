"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession, signOut, signIn } from "next-auth/react";
import { User, Assessment, Submission, Material, ClassInfo } from "../types";
import { apiService } from "./apiService";

interface AppContextType {
  currentUser: User | null;
  classes: ClassInfo[];
  assessments: Assessment[];
  submissions: Submission[];
  materials: Material[];
  login: (email: string, password: string, role: "teacher" | "learner" | "admin") => Promise<boolean>;
  logout: () => void;
  saveAssessment: (assessment: Assessment) => Promise<void>;
  publishAssessment: (id: string) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  submitAssessment: (submission: Submission) => Promise<void>;
  gradeSubmission: (submissionId: string, marks: number, feedback?: string) => Promise<void>;
  uploadMaterial: (material: Material) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  bulkGradeSubmissions: (items: { id: string; marks: number; feedback: string }[]) => Promise<void>;
  bulkReviewedSubmissions: (ids: string[]) => Promise<void>;
  refreshSubmissions: (filters?: any) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  // Keep currentUser synchronized with the NextAuth session
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const sUser = session.user as any;
      const mappedUser: User = {
        id: sUser.id || "",
        name: sUser.name || "",
        email: sUser.email || "",
        role: sUser.role || "learner",
        avatar: sUser.avatar || "",
        batch: sUser.batch || "",
        rollNumber: sUser.rollNumber || "",
      };
      setCurrentUser(mappedUser);
      apiService.setCurrentUser(mappedUser);
    } else if (status === "unauthenticated") {
      setCurrentUser(null);
      apiService.setCurrentUser(null);
    }
  }, [session, status]);

  // Load initial data on mount/user change
  // NOTE: We always fetch ALL assessments without role/batch filter from the backend.
  // All role-based and batch-based filtering is done client-side in assessments/page.tsx.
  // This ensures admin-created assessments are always visible to learners regardless
  // of how the learner's batch field is stored in the database.
  useEffect(() => {
    async function loadData() {
      if (!currentUser) {
        setClasses([]);
        setAssessments([]);
        setSubmissions([]);
        setMaterials([]);
        return;
      }
      try {
        const userBatch = currentUser.role === "learner" && currentUser.batch?.trim()
          ? currentUser.batch.trim()
          : undefined;

        // For learners: fetch only THEIR OWN submissions by learnerId to avoid seeing
        // other learners' virtual "pending" entries that would falsely show as submitted.
        // For admin/teacher: fetch all submissions without learner filter.
        const submissionFilter = currentUser.role === "learner" && currentUser.id
          ? { learnerId: currentUser.id }
          : undefined;

        const results = await Promise.allSettled([
          apiService.getClasses(),
          // Always fetch all assessments - no role/batch filter sent to backend.
          // Client-side filter in assessments/page.tsx handles visibility per role.
          apiService.getAssessments(),
          apiService.getSubmissions(submissionFilter),
          apiService.getMaterials(userBatch),
        ]);

        if (results[0].status === "fulfilled") setClasses(results[0].value);
        else { console.error("Classes failed:", results[0].reason); setClasses([]); }

        if (results[1].status === "fulfilled") setAssessments(results[1].value);
        else { console.error("Assessments failed:", results[1].reason); setAssessments([]); }

        if (results[2].status === "fulfilled") setSubmissions(results[2].value);
        else { console.error("Submissions failed:", results[2].reason); setSubmissions([]); }

        if (results[3].status === "fulfilled") setMaterials(results[3].value);
        else { console.error("Materials failed:", results[3].reason); setMaterials([]); }
      } catch (error) {
        console.error("Critical error in data loading:", error);
      }
    }
    if (status !== "loading") {
      loadData();
    }
  }, [currentUser, status]);

  const login = async (email: string, password: string, role: "teacher" | "learner" | "admin"): Promise<boolean> => {
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (result && !result.error) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    signOut({ callbackUrl: "/signin" });
  };

  const handleSaveAssessment = async (assessment: Assessment) => {
    if (assessment.status === "draft") {
      await apiService.saveDraftAssessment(assessment);
    } else {
      await apiService.savePublishAssessment(assessment);
    }
    // Always fetch all assessments after save - client-side filter handles visibility
    const updated = await apiService.getAssessments();
    setAssessments(updated);
  };

  const handlePublishAssessment = async (id: string) => {
    await apiService.publishAssessmentById(id);
    const updated = await apiService.getAssessments();
    setAssessments(updated);
  };

  const handleDeleteAssessment = async (id: string) => {
    await apiService.deleteAssessment(id);
    const updated = await apiService.getAssessments();
    setAssessments(updated);
  };

  const handleSubmitAssessment = async (submission: Submission) => {
    await apiService.submitAssessment(submission);
    // After learner submits, refresh only their own submissions
    const filter = submission.learnerId ? { learnerId: submission.learnerId } : undefined;
    const updated = await apiService.getSubmissions(filter);
    setSubmissions(updated);
  };

  const handleGradeSubmission = async (submissionId: string, marks: number, feedback?: string) => {
    await apiService.gradeSubmission(submissionId, marks, feedback);
    const updated = await apiService.getSubmissions();
    setSubmissions(updated);
  };

  const handleBulkGradeSubmissions = async (items: { id: string; marks: number; feedback: string }[]) => {
    await apiService.bulkGradeSubmissions(items);
    const updated = await apiService.getSubmissions();
    setSubmissions(updated);
  };

  const handleBulkReviewedSubmissions = async (ids: string[]) => {
    await apiService.bulkReviewedSubmissions(ids);
    const updated = await apiService.getSubmissions();
    setSubmissions(updated);
  };

  const handleRefreshSubmissions = async (filters?: any) => {
    const updated = await apiService.getSubmissions(filters);
    setSubmissions(updated);
  };

  const handleUploadMaterial = async (material: Material) => {
    await apiService.uploadMaterial(material);
    const updated = await apiService.getMaterials();
    setMaterials(updated);
  };

  const handleDeleteMaterial = async (id: string) => {
    await apiService.deleteMaterial(id);
    const updated = await apiService.getMaterials();
    setMaterials(updated);
  };

  const loading = status === "loading";

  return (
    <AppContext.Provider
      value={{
        currentUser,
        classes,
        assessments,
        submissions,
        materials,
        login,
        logout,
        saveAssessment: handleSaveAssessment,
        publishAssessment: handlePublishAssessment,
        deleteAssessment: handleDeleteAssessment,
        submitAssessment: handleSubmitAssessment,
        gradeSubmission: handleGradeSubmission,
        bulkGradeSubmissions: handleBulkGradeSubmissions,
        bulkReviewedSubmissions: handleBulkReviewedSubmissions,
        refreshSubmissions: handleRefreshSubmissions,
        uploadMaterial: handleUploadMaterial,
        deleteMaterial: handleDeleteMaterial,
        loading
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
