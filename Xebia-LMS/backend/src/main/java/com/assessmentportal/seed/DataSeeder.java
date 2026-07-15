package com.assessmentportal.seed;

import com.assessmentportal.model.*;
import com.assessmentportal.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Seeds the H2 database with initial demo data on first run.
 * Skips seeding if data already exists (file-based H2 persists across restarts).
 */
@Component("mongoDataSeeder")
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ClassInfoRepository classInfoRepository;
    private final AssessmentRepository assessmentRepository;
    private final SubmissionRepository submissionRepository;
    private final MaterialRepository materialRepository;
    private final BatchRepository batchRepository;

    public DataSeeder(
            UserRepository userRepository,
            ClassInfoRepository classInfoRepository,
            AssessmentRepository assessmentRepository,
            SubmissionRepository submissionRepository,
            MaterialRepository materialRepository,
            BatchRepository batchRepository) {
        this.userRepository = userRepository;
        this.classInfoRepository = classInfoRepository;
        this.assessmentRepository = assessmentRepository;
        this.submissionRepository = submissionRepository;
        this.materialRepository = materialRepository;
        this.batchRepository = batchRepository;
    }

    private void createUploadDirAndDummyFiles() {
        try {
            java.nio.file.Path uploadPath = java.nio.file.Paths.get("./uploads");
            java.nio.file.Files.createDirectories(uploadPath);

            String[] dummyFiles = {
                "sql_queries_assignment_v2.pdf",
                "john_doe_sql_submission.pdf",
                "typography_and_color_theory_v1.pdf",
                "nextjs15_cheatsheet.pdf"
            };

            String minimalPdf = "%PDF-1.4\n" +
                    "1 0 obj\n" +
                    "<< /Type /Catalog /Pages 2 0 R >>\n" +
                    "endobj\n" +
                    "2 0 obj\n" +
                    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n" +
                    "endobj\n" +
                    "3 0 obj\n" +
                    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 595 842] /Contents 4 0 R >>\n" +
                    "endobj\n" +
                    "4 0 obj\n" +
                    "<< /Length 65 >>\n" +
                    "stream\n" +
                    "BT\n" +
                    "/F1 12 Tf\n" +
                    "72 712 Td\n" +
                    "(Xebia LMS Assessment Portal Reference Material) Tj\n" +
                    "ET\n" +
                    "endstream\n" +
                    "endobj\n" +
                    "xref\n" +
                    "0 5\n" +
                    "0000000000 65535 f \n" +
                    "0000000009 00000 n \n" +
                    "0000000058 00000 n \n" +
                    "0000000115 00000 n \n" +
                    "0000000251 00000 n \n" +
                    "trailer\n" +
                    "<< /Size 5 /Root 1 0 R >>\n" +
                    "startxref\n" +
                    "365\n" +
                    "%%EOF\n";

            for (String file : dummyFiles) {
                java.nio.file.Path filePath = uploadPath.resolve(file);
                java.nio.file.Files.write(filePath, minimalPdf.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
        } catch (java.io.IOException e) {
            System.err.println("Failed to create dummy seeded files: " + e.getMessage());
        }
    }

    @Override
    public void run(String... args) {
        try {
            if (userRepository.count() == 0) {
                System.out.println("[DataSeeder] MongoDB database is empty. Seeding database with initial data...");
                createUploadDirAndDummyFiles();
                seedUsers();
                seedClasses();
                seedBatches();
                seedAssessments();
                seedSubmissions();
                seedMaterials();
                System.out.println("[DataSeeder] Seeding complete.");
            } else {
                System.out.println("[DataSeeder] MongoDB already contains user data. Skipping re-seeding to prevent data loss.");
                // Always ensure default batches exist even if DB was already seeded
                ensureDefaultBatchesExist();
            }
        } catch (Exception e) {
            System.err.println("[DataSeeder] WARNING: MongoDB is offline or connection timed out. MongoDB features will be unavailable: " + e.getMessage());
        }
    }

    private void seedUsers() {
        userRepository.save(new User(
                "t-1", "Shan Ali", "teacher@lms.com", "teacher",
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
                "teacher123", "", ""));
        userRepository.save(new User(
                "l-1", "Flores Juanita", "learner@lms.com", "learner",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
                "learner123", "Batch A", "XEB001"));
        userRepository.save(new User(
                "l-2", "John Doe", "john@lms.com", "learner",
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
                "learner123", "Batch C", "XEB002"));
        // Seeding additional unified users
        userRepository.save(new User(
                "u-admin", "Enterprise Admin", "admin@xebia.com", "admin",
                "", "admin123", "", ""));
        userRepository.save(new User(
                "u-learner", "Xebia Consultant", "learner@xebia.com", "learner",
                "", "learner123", "Batch B", "XEB003"));
    }

    private void seedBatches() {
        String now = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ISO_DATE_TIME);
        String[][] batches = {
            {"b-1", "Batch A", "UI/UX Design", "Design Principles"},
            {"b-2", "Batch B", "Front-end Development", "React & Next.js"},
            {"b-3", "Batch C", "Back-end Development", "Node.js & Express"},
            {"b-4", "Batch D", "Project Management", "Agile & Scrum"}
        };
        for (String[] b : batches) {
            if (!batchRepository.findById(b[0]).isPresent()) {
                Batch batch = new Batch();
                batch.setId(b[0]);
                batch.setBatchName(b[1]);
                batch.setCourse(b[2]);
                batch.setSubject(b[3]);
                batch.setCreatedAt(now);
                batch.setUpdatedAt(now);
                batchRepository.save(batch);
            }
        }
    }

    private void ensureDefaultBatchesExist() {
        // If the batches collection is empty, seed default batches
        // This handles cases where existing DBs were seeded before batch support was added
        try {
            if (batchRepository.count() == 0) {
                System.out.println("[DataSeeder] Batches collection is empty. Seeding default batches...");
                seedBatches();
            }
        } catch (Exception e) {
            System.err.println("[DataSeeder] Could not check/seed batches: " + e.getMessage());
        }
    }

    private void seedClasses() {
        classInfoRepository.save(new ClassInfo("c-1", "UI/UX Design", "Batch A", "Design Principles",
                "09:30 AM - 11:00 AM", "Shan Ali", null));
        classInfoRepository.save(new ClassInfo("c-2", "Front-end Development", "Batch B", "React & Next.js",
                "10:15 AM - 11:45 AM", "Shan Ali", null));
        classInfoRepository.save(new ClassInfo("c-3", "Back-end Development", "Batch C", "Node.js & Express",
                "11:00 AM - 12:30 PM", "Shan Ali", null));
        classInfoRepository.save(new ClassInfo("c-4", "Project Management", "Batch D", "Agile & Scrum",
                "12:00 PM - 01:30 PM", "Shan Ali", null));
    }

    private void seedAssessments() {
        Instant now = Instant.now();

        // Assessment 1: MCQ quiz (published)
        Assessment a1 = new Assessment();
        a1.setId("a-1");
        a1.setTitle("UI/UX Design Principles Quiz");
        a1.setSubject("UI/UX Design");
        a1.setBatch("Batch A");
        a1.setBatches(Arrays.asList("Batch A", "Batch B"));
        a1.setInstructions("Answer all questions. You have 30 minutes. Once submitted, answers cannot be edited.");
        a1.setQuestionType("mcq");
        a1.setTotalMarks(30);
        a1.setDeadline(now.plus(2, ChronoUnit.DAYS).toString().substring(0, 16));
        a1.setStatus("published");
        a1.setCreatedAt(now.minus(5, ChronoUnit.DAYS).toString());

        List<Question> q1List = new ArrayList<>();

        Question q11 = new Question();
        q11.setId("q-1-1");
        q11.setText("What does UX stand for?");
        q11.setType("mcq");
        q11.setOptions(Arrays.asList("User Experience", "User eXchange", "Unique eXperience", "Universal eXperience"));
        q11.setCorrectAnswer("User Experience");
        q11.setMarks(10);
        q11.setAssessment(a1);
        q1List.add(q11);

        Question q12 = new Question();
        q12.setId("q-1-2");
        q12.setText("Which of the following is NOT a principle of design?");
        q12.setType("mcq");
        q12.setOptions(Arrays.asList("Contrast", "Balance", "Haphazard", "Alignment"));
        q12.setCorrectAnswer("Haphazard");
        q12.setMarks(10);
        q12.setAssessment(a1);
        q1List.add(q12);

        Question q13 = new Question();
        q13.setId("q-1-3");
        q13.setText("What is the primary focus of wireframing?");
        q13.setType("mcq");
        q13.setOptions(Arrays.asList("Color and typography", "Layout and structure", "Final animations", "Database connections"));
        q13.setCorrectAnswer("Layout and structure");
        q13.setMarks(10);
        q13.setAssessment(a1);
        q1List.add(q13);

        a1.setQuestions(q1List);
        assessmentRepository.save(a1);

        // Assessment 2: Written (published)
        Assessment a2 = new Assessment();
        a2.setId("a-2");
        a2.setTitle("React Components & State Written Assessment");
        a2.setSubject("Front-end Development");
        a2.setBatch("Batch B");
        a2.setBatches(Arrays.asList("Batch B", "Batch C"));
        a2.setInstructions("Write descriptive answers. Max 250 words per question. Marks depend on clarity and correctness.");
        a2.setQuestionType("written");
        a2.setTotalMarks(20);
        a2.setDeadline(now.plus(5, ChronoUnit.DAYS).toString().substring(0, 16));
        a2.setStatus("published");
        a2.setCreatedAt(now.minus(3, ChronoUnit.DAYS).toString());

        List<Question> q2List = new ArrayList<>();

        Question q21 = new Question();
        q21.setId("q-2-1");
        q21.setText("Explain the difference between Props and State in React.");
        q21.setType("written");
        q21.setOptions(new ArrayList<String>());
        q21.setMarks(10);
        q21.setAssessment(a2);
        q2List.add(q21);

        Question q22 = new Question();
        q22.setId("q-2-2");
        q22.setText("Describe the lifecycle of a React functional component using the useEffect hook.");
        q22.setType("written");
        q22.setOptions(new ArrayList<String>());
        q22.setMarks(10);
        q22.setAssessment(a2);
        q2List.add(q22);

        a2.setQuestions(q2List);
        assessmentRepository.save(a2);

        // Assessment 3: File-based (published, past deadline)
        Assessment a3 = new Assessment();
        a3.setId("a-3");
        a3.setTitle("SQL Queries and Normalization Quiz (Uploaded File)");
        a3.setSubject("Back-end Development");
        a3.setBatch("Batch C");
        a3.setBatches(Arrays.asList("Batch C"));
        a3.setInstructions("Please download the attached PDF, solve the questions on paper, scan, and upload your answers.");
        a3.setQuestionType("written");
        a3.setTotalMarks(50);
        a3.setDeadline(now.minus(1, ChronoUnit.DAYS).toString().substring(0, 16));
        a3.setStatus("published");
        a3.setCreatedAt(now.minus(10, ChronoUnit.DAYS).toString());
        a3.setFileName("sql_queries_assignment_v2.pdf");
        a3.setFileSize("1.2 MB");
        a3.setFileUrl("/api/files/preview/sql_queries_assignment_v2.pdf");
        a3.setFile(new AssessmentFile(
                "sql_queries_assignment_v2.pdf",
                "sql_queries_assignment_v2.pdf",
                "/api/files/preview/sql_queries_assignment_v2.pdf",
                "application/pdf",
                1258291L,
                now.minus(10, ChronoUnit.DAYS).toString()
        ));
        a3.setQuestions(new ArrayList<Question>());
        assessmentRepository.save(a3);

        // Assessment 4: Draft
        Assessment a4 = new Assessment();
        a4.setId("a-4");
        a4.setTitle("Scrum & Sprint Planning Framework Draft");
        a4.setSubject("Project Management");
        a4.setBatch("Batch D");
        a4.setBatches(Arrays.asList("Batch D"));
        a4.setInstructions("Draft assessment on Agile frameworks.");
        a4.setQuestionType("mcq");
        a4.setTotalMarks(10);
        a4.setDeadline(now.plus(10, ChronoUnit.DAYS).toString().substring(0, 16));
        a4.setStatus("draft");
        a4.setCreatedAt(now.toString());

        List<Question> q4List = new ArrayList<>();

        Question q41 = new Question();
        q41.setId("q-4-1");
        q41.setText("How long is a typical Sprint?");
        q41.setType("mcq");
        q41.setOptions(Arrays.asList("1-4 weeks", "6 months", "1 day", "1 year"));
        q41.setCorrectAnswer("1-4 weeks");
        q41.setMarks(10);
        q41.setAssessment(a4);
        q4List.add(q41);

        a4.setQuestions(q4List);
        assessmentRepository.save(a4);
    }

    private void seedSubmissions() {
        Instant now = Instant.now();

        // Submission 1: Marked
        Submission s1 = new Submission();
        s1.setId("s-1");
        s1.setAssessmentId("a-1");
        s1.setAssessmentTitle("UI/UX Design Principles Quiz");
        s1.setSubject("UI/UX Design");
        s1.setBatch("Batch A");
        s1.setLearnerId("l-1");
        s1.setLearnerName("Flores Juanita");
        s1.setRollNumber("XEB001");
        s1.setDeadline(now.plus(2, ChronoUnit.DAYS).toString().substring(0, 16));
        Map<String, String> answers1 = new HashMap<>();
        answers1.put("q-1-1", "User Experience");
        answers1.put("q-1-2", "Haphazard");
        answers1.put("q-1-3", "Layout and structure");
        s1.setAnswers(answers1);
        s1.setStatus("marked");
        s1.setMarksObtained(30);
        s1.setTotalMarks(30);
        s1.setFeedback("Excellent work! Perfect answers for all questions.");
        s1.setSubmittedAt(now.minus(4, ChronoUnit.DAYS).toString());
        submissionRepository.save(s1);

        // Submission 2: Submitted (pending grading)
        Submission s2 = new Submission();
        s2.setId("s-2");
        s2.setAssessmentId("a-2");
        s2.setAssessmentTitle("React Components & State Written Assessment");
        s2.setSubject("Front-end Development");
        s2.setBatch("Batch B");
        s2.setLearnerId("l-1");
        s2.setLearnerName("Flores Juanita");
        s2.setRollNumber("XEB001");
        s2.setDeadline(now.plus(5, ChronoUnit.DAYS).toString().substring(0, 16));
        Map<String, String> answers2 = new HashMap<>();
        answers2.put("q-2-1", "Props are inputs passed into a component from its parent, making them immutable from within the component. State represents local mutable data that is managed within the component itself, which triggers re-renders when updated.");
        answers2.put("q-2-2", "Functional components use the useEffect hook to perform side effects. If no dependency array is provided, it runs on every render. If an empty array [] is passed, it runs once on mount. Cleanups can be returned to execute on unmount.");
        s2.setAnswers(answers2);
        s2.setStatus("submitted");
        s2.setTotalMarks(20);
        s2.setSubmittedAt(now.minus(2, ChronoUnit.DAYS).toString());
        submissionRepository.save(s2);

        // Submission 3: File submission
        Submission s3 = new Submission();
        s3.setId("s-3");
        s3.setAssessmentId("a-3");
        s3.setAssessmentTitle("SQL Queries and Normalization Quiz (Uploaded File)");
        s3.setSubject("Back-end Development");
        s3.setBatch("Batch C");
        s3.setLearnerId("l-2");
        s3.setLearnerName("John Doe");
        s3.setRollNumber("XEB002");
        s3.setDeadline(now.minus(1, ChronoUnit.DAYS).toString().substring(0, 16));
        s3.setAnswers(new HashMap<String, String>());
        s3.setStatus("submitted");
        s3.setTotalMarks(50);
        s3.setSubmittedAt(now.minus(36, ChronoUnit.HOURS).toString());
        s3.setSubmittedFileUrl("/api/files/preview/john_doe_sql_submission.pdf");
        s3.setSubmittedFileName("john_doe_sql_submission.pdf");
        submissionRepository.save(s3);
    }

    private void seedMaterials() {
        Instant now = Instant.now();

        materialRepository.save(new Material("m-1", "Typography and Color Theory Guide", "UI/UX Design", "Batch A",
                "typography_and_color_theory_v1.pdf", "4.5 MB",
                "/api/files/preview/typography_and_color_theory_v1.pdf", "Shan Ali",
                now.minus(12, ChronoUnit.DAYS).toString()));
        materialRepository.save(new Material("m-2", "Next.js 15 App Router Reference Cheatsheet", "Front-end Development", "Batch B",
                "nextjs15_cheatsheet.pdf", "850 KB",
                "/api/files/preview/nextjs15_cheatsheet.pdf", "Shan Ali",
                now.minus(8, ChronoUnit.DAYS).toString()));
    }
}
