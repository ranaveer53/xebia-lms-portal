import {
  seedCategories,
  seedCourses,
  seedModules,
  seedSubmodules,
  seedContents,
  seedLearnerCredentials,
} from "./mockData";
import {
  fetchDbData,
  saveDbData
} from "./dbClient";

let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
if (!API_BASE_URL.endsWith("/api") && !API_BASE_URL.endsWith("/api/")) {
  API_BASE_URL = `${API_BASE_URL.replace(/\/$/, "")}/api`;
}
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

let isBackendOffline = USE_MOCK_API;
let loggedFailure = false;
const statusListeners = new Set();

export const apiStatus = {
  isOffline: () => isBackendOffline,
  subscribe: (listener) => {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  },
  notify: () => {
    statusListeners.forEach((listener) => listener(isBackendOffline));
  },
};

// Centralized reset function on login
public_api_reset_offline();
function public_api_reset_offline() {
  isBackendOffline = USE_MOCK_API;
  loggedFailure = false;
}

export function resetOfflineStatus() {
  public_api_reset_offline();
  apiStatus.notify();
}

// React hook to get centralized data mode and fallbacks
import { useState, useEffect } from "react";
export function useApiStatus() {
  const [offline, setOffline] = useState(isBackendOffline);

  useEffect(() => {
    setOffline(isBackendOffline);
    return apiStatus.subscribe((status) => {
      setOffline(status);
    });
  }, []);

  return offline;
}

export function useDataMode() {
  const [mode, setMode] = useState("REAL_MODE");
  const [offline, setOffline] = useState(isBackendOffline);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMode(localStorage.getItem("LMS_DATA_MODE") || "REAL_MODE");
    }
    setOffline(isBackendOffline);

    return apiStatus.subscribe((status) => {
      setOffline(status);
      if (typeof window !== "undefined") {
        setMode(localStorage.getItem("LMS_DATA_MODE") || "REAL_MODE");
      }
    });
  }, []);

  const isDemoMode = mode === "DEMO_MODE" || offline;
  const isFallback = mode === "REAL_MODE" && offline;

  return { isDemoMode, isFallback, mode };
}

// Helper to check network connectivity or resolve local storage fallback
async function request(url, options = {}) {
  if (typeof window !== "undefined" && localStorage.getItem("LMS_DATA_MODE") === "DEMO_MODE") {
    return null;
  }

  if (isBackendOffline || USE_MOCK_API) {
    return null;
  }

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      if (response.status === 401) throw new Error("Unauthorized");
      if (response.status === 403) throw new Error("Forbidden");
      const errText = await response.text();
      throw new Error(errText || "API error occurred");
    }
    
    if (isBackendOffline) {
      isBackendOffline = false;
      apiStatus.notify();
    }
    
    if (response.status === 204) return true;

    const responseText = await response.text();
    if (!responseText) return true;

    return JSON.parse(responseText);
  } catch (error) {
    console.error(`Spring Boot API failure at URL ${url}:`, error);
    if (!isBackendOffline) {
      isBackendOffline = true;
      if (!loggedFailure) {
        console.warn(`Spring Boot backend connection failed. Falling back to local database. Error: ${error.message}`);
        loggedFailure = true;
      }
      apiStatus.notify();
    }
    return null;
  }
}

// -------------------------------------------------------------
// Category Service
// -------------------------------------------------------------
export const categoryService = {
  getCategories: async () => {
    const remote = await request("/categories");
    if (remote) return remote;

    return await fetchDbData("lms_categories", seedCategories);
  },

  getCategoryBySlug: async (slug) => {
    const remote = await request(`/categories/slug/${slug}`);
    if (remote) return remote;

    const list = await fetchDbData("lms_categories", seedCategories);
    return list.find(c => c.slug === slug) || null;
  },

  createCategory: async (data) => {
    const remote = await request("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_categories", seedCategories);
    const newCategory = {
      ...data,
      id: `cat-${Date.now()}`,
      slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      coursesCount: 0,
    };
    list.push(newCategory);
    await saveDbData("lms_categories", list);
    return newCategory;
  },

  updateCategory: async (id, data) => {
    const remote = await request(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_categories", seedCategories);
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Category not found");
    
    const updated = { ...list[index], ...data };
    list[index] = updated;
    await saveDbData("lms_categories", list);
    return updated;
  },

  deleteCategory: async (id) => {
    const remote = await request(`/categories/${id}`, { method: "DELETE" });
    if (remote) return true;

    const list = await fetchDbData("lms_categories", seedCategories);
    const updated = list.filter(c => c.id !== id);
    await saveDbData("lms_categories", updated);
    return true;
  },
};

// -------------------------------------------------------------
// Course Service
// -------------------------------------------------------------
export const courseService = {
  getCourses: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    const remote = await request(`/courses?${query}`);
    if (remote) return remote;

    let courses = await fetchDbData("lms_courses", seedCourses);

    // Apply Client filters
    if (filters.search) {
      const q = filters.search.toLowerCase();
      courses = courses.filter(
        c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }
    if (filters.categoryId) {
      courses = courses.filter(c => c.categoryId === filters.categoryId);
    }
    if (filters.level && filters.level !== "All") {
      courses = courses.filter(c => c.level === filters.level);
    }
    return courses;
  },

  getCourseBySlug: async (slug) => {
    const remote = await request(`/courses/slug/${slug}`);
    if (remote) return remote;

    const list = await fetchDbData("lms_courses", seedCourses);
    return list.find(c => c.slug === slug) || null;
  },

  createCourse: async (data) => {
    const remote = await request("/courses", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_courses", seedCourses);
    const newCourse = {
      ...data,
      id: `course-${Date.now()}`,
      slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    };
    list.push(newCourse);
    await saveDbData("lms_courses", list);
    
    // Increment category courses count
    const cats = await fetchDbData("lms_categories", seedCategories);
    const cIndex = cats.findIndex(c => c.id === data.categoryId);
    if (cIndex !== -1) {
      cats[cIndex].coursesCount = (cats[cIndex].coursesCount || 0) + 1;
      await saveDbData("lms_categories", cats);
    }
    
    return newCourse;
  },

  updateCourse: async (id, data) => {
    const remote = await request(`/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_courses", seedCourses);
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Course not found");
    
    const updated = { ...list[index], ...data };
    list[index] = updated;
    await saveDbData("lms_courses", list);
    return updated;
  },

  deleteCourse: async (id) => {
    const remote = await request(`/courses/${id}`, { method: "DELETE" });
    if (remote) return true;

    const list = await fetchDbData("lms_courses", seedCourses);
    const course = list.find(c => c.id === id);
    const updated = list.filter(c => c.id !== id);
    await saveDbData("lms_courses", updated);

    // Decrement category courses count
    if (course) {
      const cats = await fetchDbData("lms_categories", seedCategories);
      const cIndex = cats.findIndex(c => c.id === course.categoryId);
      if (cIndex !== -1) {
        cats[cIndex].coursesCount = Math.max(0, (cats[cIndex].coursesCount || 1) - 1);
        await saveDbData("lms_categories", cats);
      }
    }
    return true;
  },
};

// -------------------------------------------------------------
// Module Service
// -------------------------------------------------------------
export const moduleService = {
  getModules: async (courseId) => {
    const remote = await request(`/courses/${courseId}/modules`);
    if (remote) return remote;

    const list = await fetchDbData("lms_modules", seedModules);
    return list
      .filter(m => m.courseId === courseId)
      .sort((a, b) => a.order - b.order);
  },

  createModule: async (data) => {
    const remote = await request("/modules", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_modules", seedModules);
    const newModule = {
      ...data,
      id: `mod-${Date.now()}`,
      order: Number(data.order) || list.filter(m => m.courseId === data.courseId).length + 1,
    };
    list.push(newModule);
    await saveDbData("lms_modules", list);
    return newModule;
  },

  updateModule: async (id, data) => {
    const remote = await request(`/modules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_modules", seedModules);
    const index = list.findIndex(m => m.id === id);
    if (index === -1) throw new Error("Module not found");

    const updated = { ...list[index], ...data };
    list[index] = updated;
    await saveDbData("lms_modules", list);
    return updated;
  },

  deleteModule: async (id) => {
    const remote = await request(`/modules/${id}`, { method: "DELETE" });
    if (remote) return true;

    const list = await fetchDbData("lms_modules", seedModules);
    const updated = list.filter(m => m.id !== id);
    await saveDbData("lms_modules", updated);
    return true;
  },

  reorderModules: async (courseId, orderedIds) => {
    const remote = await request(`/courses/${courseId}/modules/reorder`, {
      method: "POST",
      body: JSON.stringify({ orderedIds }),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_modules", seedModules);
    const updated = list.map(m => {
      if (m.courseId === courseId) {
        const newIndex = orderedIds.indexOf(m.id);
        if (newIndex !== -1) {
          return { ...m, order: newIndex + 1 };
        }
      }
      return m;
    });
    await saveDbData("lms_modules", updated);
    return updated.filter(m => m.courseId === courseId).sort((a, b) => a.order - b.order);
  },
};

// -------------------------------------------------------------
// Submodule Service
// -------------------------------------------------------------
export const submoduleService = {
  getSubmodules: async (moduleId) => {
    const remote = await request(`/modules/${moduleId}/submodules`);
    if (remote) return remote;

    const list = await fetchDbData("lms_submodules", seedSubmodules);
    return list
      .filter(s => s.moduleId === moduleId)
      .sort((a, b) => a.order - b.order);
  },

  getSubmoduleBySlug: async (courseSlug, submoduleSlug) => {
    const remote = await request(`/courses/${courseSlug}/learn/${submoduleSlug}`);
    if (remote) return remote;

    // Search manually in localStorage fallback
    const courses = await fetchDbData("lms_courses", seedCourses);
    const course = courses.find(c => c.slug === courseSlug);
    if (!course) return null;

    const modules = (await fetchDbData("lms_modules", seedModules)).filter(m => m.courseId === course.id);
    const modIds = modules.map(m => m.id);

    const submodules = await fetchDbData("lms_submodules", seedSubmodules);
    return submodules.find(s => modIds.includes(s.moduleId) && s.slug === submoduleSlug) || null;
  },

  createSubmodule: async (data) => {
    const remote = await request("/submodules", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_submodules", seedSubmodules);
    const newSubmodule = {
      ...data,
      id: `submod-${Date.now()}`,
      slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      order: Number(data.order) || list.filter(s => s.moduleId === data.moduleId).length + 1,
      duration: data.duration || "15 min",
    };
    list.push(newSubmodule);
    await saveDbData("lms_submodules", list);
    return newSubmodule;
  },

  updateSubmodule: async (id, data) => {
    const remote = await request(`/submodules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_submodules", seedSubmodules);
    const index = list.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Submodule not found");

    const updated = { ...list[index], ...data };
    list[index] = updated;
    await saveDbData("lms_submodules", list);
    return updated;
  },

  deleteSubmodule: async (id) => {
    const remote = await request(`/submodules/${id}`, { method: "DELETE" });
    if (remote) return true;

    const list = await fetchDbData("lms_submodules", seedSubmodules);
    const updated = list.filter(s => s.id !== id);
    await saveDbData("lms_submodules", updated);
    return true;
  },

  reorderSubmodules: async (moduleId, orderedIds) => {
    const remote = await request(`/modules/${moduleId}/submodules/reorder`, {
      method: "POST",
      body: JSON.stringify({ orderedIds }),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_submodules", seedSubmodules);
    const updated = list.map(s => {
      if (s.moduleId === moduleId) {
        const newIndex = orderedIds.indexOf(s.id);
        if (newIndex !== -1) {
          return { ...s, order: newIndex + 1 };
        }
      }
      return s;
    });
    await saveDbData("lms_submodules", updated);
    return updated.filter(s => s.moduleId === moduleId).sort((a, b) => a.order - b.order);
  },
};

// -------------------------------------------------------------
// Content Service
// -------------------------------------------------------------
export const contentService = {
  getContents: async (submoduleId) => {
    const remote = await request(`/submodules/${submoduleId}/contents`);
    if (remote) return remote;

    const list = await fetchDbData("lms_contents", seedContents);
    return list
      .filter(c => c.submoduleId === submoduleId)
      .sort((a, b) => a.order - b.order);
  },

  createContent: async (data) => {
    const remote = await request("/contents", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_contents", seedContents);
    const newContent = {
      ...data,
      id: `cont-${Date.now()}`,
      order: Number(data.order) || list.filter(c => c.submoduleId === data.submoduleId).length + 1,
    };
    list.push(newContent);
    await saveDbData("lms_contents", list);
    return newContent;
  },

  updateContent: async (id, data) => {
    const remote = await request(`/contents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_contents", seedContents);
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Content block not found");

    const updated = { ...list[index], ...data };
    list[index] = updated;
    await saveDbData("lms_contents", list);
    return updated;
  },

  deleteContent: async (id) => {
    const remote = await request(`/contents/${id}`, { method: "DELETE" });
    if (remote) return true;

    const list = await fetchDbData("lms_contents", seedContents);
    const updated = list.filter(c => c.id !== id);
    await saveDbData("lms_contents", updated);
    return true;
  },

  reorderContents: async (submoduleId, orderedIds) => {
    const remote = await request(`/submodules/${submoduleId}/contents/reorder`, {
      method: "POST",
      body: JSON.stringify({ orderedIds }),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_contents", seedContents);
    const updated = list.map(c => {
      if (c.submoduleId === submoduleId) {
        const newIndex = orderedIds.indexOf(c.id);
        if (newIndex !== -1) {
          return { ...c, order: newIndex + 1 };
        }
      }
      return c;
    });
    await saveDbData("lms_contents", updated);
    return updated.filter(c => c.submoduleId === submoduleId).sort((a, b) => a.order - b.order);
  },
};

// -------------------------------------------------------------
// IAM / Learner Credential Service
// -------------------------------------------------------------
const generateTemporaryPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export const learnerCredentialService = {
  getLearnerCredentials: async () => {
    const remote = await request("/iam/learner-credentials");
    if (remote) return remote;

    return await fetchDbData("lms_learner_credentials", seedLearnerCredentials);
  },

  createLearnerCredential: async (data) => {
    const remote = await request("/iam/learner-credentials", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (remote) return remote;

    const list = await fetchDbData("lms_learner_credentials", seedLearnerCredentials);
    const normalizedEmail = data.email.trim().toLowerCase();
    const username = (data.username || normalizedEmail.split("@")[0]).trim().toLowerCase();

    if (list.some((credential) => credential.email === normalizedEmail || credential.username === username)) {
      throw new Error("A learner credential already exists for this email or username.");
    }

    const newCredential = {
      id: `learner-${Date.now()}`,
      learnerName: data.learnerName.trim(),
      email: normalizedEmail,
      username,
      temporaryPassword: data.password?.trim() || generateTemporaryPassword(),
      role: "LEARNER",
      status: "ACTIVE",
      tenantId: data.tenantId?.trim() || "xebia-enterprise",
      batchId: data.batchId?.trim() || "default-batch",
      forcePasswordReset: data.forcePasswordReset ?? true,
      createdAt: new Date().toISOString(),
    };

    list.push({ ...newCredential, temporaryPassword: undefined });
    await saveDbData("lms_learner_credentials", list);
    return newCredential;
  },

  deleteLearnerCredential: async (id) => {
    const remote = await request(`/iam/learner-credentials/${id}`, { method: "DELETE" });
    if (remote) return true;

    const list = await fetchDbData("lms_learner_credentials", seedLearnerCredentials);
    await saveDbData("lms_learner_credentials", list.filter((credential) => credential.id !== id));
    return true;
  },
};

// Seed assessments
export const seedAssessments = [
  {
    id: "assess-1",
    title: "Next.js Fundamentals Quiz",
    description: "Test your knowledge of Next.js App Router, SSR, and Client Components.",
    courseId: "course-nextjs",
    durationMinutes: 20,
    passingScore: 70,
    questions: [
      { id: "q1", prompt: "What hook is used to access URL params in Next.js App Router?", options: ["useParams", "useRouter", "useQuery", "useSearchParams"], answer: "useParams" },
      { id: "q2", prompt: "Which directive marks a component as a Client Component?", options: ['"use client"', '"use server"', '"use browser"', '"client only"'], answer: '"use client"' },
      { id: "q3", prompt: "What folder holds the root layout in Next.js App Router?", options: ["pages/", "app/", "src/", "layouts/"], answer: "app/" }
    ],
    assignedTo: ["learner@xebia.com"],
    createdAt: new Date().toISOString()
  },
  {
    id: "assess-2",
    title: "Spring Boot Basics Assessment",
    description: "Core Spring Boot concepts including dependency injection and JPA.",
    courseId: "course-springboot",
    durationMinutes: 30,
    passingScore: 65,
    questions: [
      { id: "q1", prompt: "Which annotation marks a class as a Spring REST controller?", options: ["@Controller", "@RestController", "@Service", "@Component"], answer: "@RestController" },
      { id: "q2", prompt: "What annotation enables auto-configuration in Spring Boot?", options: ["@SpringBootApplication", "@EnableAutoConfig", "@SpringApp", "@AutoConfigure"], answer: "@SpringBootApplication" }
    ],
    assignedTo: ["learner@xebia.com"],
    createdAt: new Date().toISOString()
  }
];

export const assessmentService = {
  getAssessments: async () => {
    const remote = await request(`/assessments`);
    if (remote) return remote;
    return await fetchDbData("lms_assessments", seedAssessments);
  },

  getAssessmentById: async (id) => {
    const remote = await request(`/assessments/${id}`);
    if (remote) return remote;
    const list = await fetchDbData("lms_assessments", seedAssessments);
    return list.find(a => a.id === id) || null;
  },

  getAssessmentsForLearner: async (learnerEmail) => {
    const remote = await request(`/assessments/assigned?email=${encodeURIComponent(learnerEmail)}`);
    if (remote) return remote;
    const list = await fetchDbData("lms_assessments", seedAssessments);
    return list.filter(a => a.assignedTo && a.assignedTo.includes(learnerEmail));
  },

  createAssessment: async (data) => {
    const remote = await request("/assessments", { method: "POST", body: JSON.stringify(data) });
    if (remote) return remote;
    const list = await fetchDbData("lms_assessments", seedAssessments);
    const newAssessment = {
      ...data,
      id: `assess-${Date.now()}`,
      assignedTo: data.assignedTo || [],
      createdAt: new Date().toISOString()
    };
    list.push(newAssessment);
    await saveDbData("lms_assessments", list);
    return newAssessment;
  },

  updateAssessment: async (id, data) => {
    const remote = await request(`/assessments/${id}`, { method: "PUT", body: JSON.stringify(data) });
    if (remote) return remote;
    const list = await fetchDbData("lms_assessments", seedAssessments);
    const index = list.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Assessment not found");
    list[index] = { ...list[index], ...data };
    await saveDbData("lms_assessments", list);
    return list[index];
  },

  assignToLearners: async (assessmentId, learnerEmails) => {
    const remote = await request(`/assessments/${assessmentId}/assign`, {
      method: "POST",
      body: JSON.stringify({ learnerEmails })
    });
    if (remote) return remote;
    const list = await fetchDbData("lms_assessments", seedAssessments);
    const index = list.findIndex(a => a.id === assessmentId);
    if (index === -1) throw new Error("Assessment not found");
    const existing = list[index].assignedTo || [];
    const merged = [...new Set([...existing, ...learnerEmails])];
    list[index] = { ...list[index], assignedTo: merged };
    await saveDbData("lms_assessments", list);
    return list[index];
  },

  unassignFromLearner: async (assessmentId, learnerEmail) => {
    const remote = await request(`/assessments/${assessmentId}/unassign`, {
      method: "POST",
      body: JSON.stringify({ learnerEmail })
    });
    if (remote) return remote;
    const list = await fetchDbData("lms_assessments", seedAssessments);
    const index = list.findIndex(a => a.id === assessmentId);
    if (index === -1) throw new Error("Assessment not found");
    list[index] = { ...list[index], assignedTo: (list[index].assignedTo || []).filter(e => e !== learnerEmail) };
    await saveDbData("lms_assessments", list);
    return list[index];
  },

  deleteAssessment: async (id) => {
    const remote = await request(`/assessments/${id}`, { method: "DELETE" });
    if (remote) return true;
    const list = await fetchDbData("lms_assessments", seedAssessments);
    await saveDbData("lms_assessments", list.filter(a => a.id !== id));
    return true;
  },

  submitAssessment: async (id, payload) => {
    const remote = await request(`/assessments/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (remote) return remote;
    
    // Score locally
    const assessments = await fetchDbData("lms_assessments", seedAssessments);
    const assessment = assessments.find(a => a.id === id);
    let score = 0;
    const total = assessment?.questions?.length || 0;
    if (assessment?.questions) {
      assessment.questions.forEach(q => {
        if (payload.answers?.[q.id] === q.answer) score++;
      });
    }
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percentage >= (assessment?.passingScore || 70);
    const submission = {
      id: `sub-${Date.now()}`,
      assessmentId: id,
      assessmentTitle: assessment?.title || "",
      learnerId: payload.learnerId,
      learnerEmail: payload.learnerEmail,
      answers: payload.answers,
      score,
      total,
      percentage,
      passed,
      submittedAt: new Date().toISOString()
    };
    const submissions = await fetchDbData("lms_assessment_submissions", []);
    submissions.push(submission);
    await saveDbData("lms_assessment_submissions", submissions);
    return submission;
  },

  getResults: async (learnerEmail) => {
    const remote = await request(`/assessments/results${learnerEmail ? `?email=${encodeURIComponent(learnerEmail)}` : ""}`);
    if (remote) return remote;
    const submissions = await fetchDbData("lms_assessment_submissions", []);
    if (learnerEmail) return submissions.filter(s => s.learnerEmail === learnerEmail);
    return submissions;
  },

  getAllResults: async () => {
    const remote = await request("/assessments/results/all");
    if (remote) return remote;
    return await fetchDbData("lms_assessment_submissions", []);
  }
};


export const analyticsService = {
  getExecutiveSummary: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/executive-summary?${query}`);
  },
  getLearningCoverage: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/learning-coverage?${query}`);
  },
  getLearningHours: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/learning-hours?${query}`);
  },
  getLearningPillars: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/learning-pillars?${query}`);
  },
  getAITransformation: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/ai-transformation?${query}`);
  },
  getCertifications: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/certifications?${query}`);
  },
  getFlagshipPrograms: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/flagship-programs?${query}`);
  },
  getLearningTrends: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/learning-trends?${query}`);
  },
  getTrainingEffectiveness: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/training-effectiveness?${query}`);
  },
  getLearningChampions: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/learning-champions?${query}`);
  },
  getProjectInvestment: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/project-investment?${query}`);
  },
  getFresherJourney: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/fresher-journey?${query}`);
  },
  getSkillGap: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/skill-gap?${query}`);
  },
  getRecommendations: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/recommendations?${query}`);
  },
  getPredictiveInsights: async (params) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/analytics/predictive-insights?${query}`);
  },
};

