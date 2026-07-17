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
            System.out.println("[DataSeeder] Clearing old collections to seed 50 datasets per API...");
            userRepository.deleteAll();
            batchRepository.deleteAll();
            classInfoRepository.deleteAll();
            assessmentRepository.deleteAll();
            submissionRepository.deleteAll();
            materialRepository.deleteAll();

            createUploadDirAndDummyFiles();
            seedUsers();
            seedBatches();
            seedClasses();
            seedAssessments();
            seedSubmissions();
            seedMaterials();
            System.out.println("[DataSeeder] Seeding 50 datasets completed successfully.");
        } catch (Exception e) {
            System.err.println("[DataSeeder] WARNING: MongoDB database seeding failed: " + e.getMessage());
        }
    }

    private void seedUsers() {
        // Core users
        userRepository.save(new User("t-1", "Shan Ali", "teacher@lms.com", "teacher",
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
                "teacher123", "", ""));
        userRepository.save(new User("l-1", "Flores Juanita", "learner@lms.com", "learner",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
                "learner123", "Batch A", "XEB001"));
        userRepository.save(new User("l-2", "John Doe", "john@lms.com", "learner",
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
                "learner123", "Batch C", "XEB002"));
        userRepository.save(new User("u-admin", "Enterprise Admin", "admin@xebia.com", "admin",
                "", "admin123", "", ""));
        userRepository.save(new User("u-learner", "Xebia Consultant", "learner@xebia.com", "learner",
                "", "learner123", "Batch B", "XEB003"));

        String[] firstNames = {"Sarah", "Alex", "Emily", "David", "Jessica", "Michael", "Emma", "Daniel", "Olivia", "James", "Sophia", "Matthew", "Isabella", "Andrew", "Charlotte", "Joshua", "Amelia", "Christopher", "Mia", "Joseph", "Harper", "William", "Evelyn", "Abigail", "Ryan", "Emily", "Nathan", "Elizabeth", "Christian", "Sofia", "Justin", "Avery", "Jonathan", "Ella", "Robert", "Madison", "Brian", "Scarlett", "Kevin", "Grace", "Thomas", "Chloe", "Charles"};
        String[] lastNames = {"Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee", "Gonzalez", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Perez", "Hall", "Young", "Allen", "Sanchez", "Wright", "King", "Scott", "Green", "Baker", "Adams", "Nelson", "Hill", "Ramirez"};

        for (int i = 6; i <= 50; i++) {
            String fName = firstNames[(i - 1) % firstNames.length];
            String lName = lastNames[(i - 1) % lastNames.length];
            String name = fName + " " + lName;
            String email = fName.toLowerCase() + "." + lName.toLowerCase() + i + "@xebia.com";
            String role = (i <= 8) ? "teacher" : "learner";
            String batch = role.equals("learner") ? "Batch " + (char) ('A' + (i % 4)) : "";
            String rollNumber = role.equals("learner") ? "XEB" + String.format("%03d", i) : "";
            userRepository.save(new User("u-" + i, name, email, role, "", "learner123", batch, rollNumber));
        }
    }

    private void seedBatches() {
        String now = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ISO_DATE_TIME);
        String[] courses = {"UI/UX Design", "Front-end Development", "Back-end Development", "Project Management", "Cloud DevOps Engineering", "Data Science & AI", "Cyber Security", "Mobile App Development"};
        String[] subjects = {"Design Principles", "React & Next.js", "Node.js & Express", "Agile & Scrum", "AWS & Docker", "Python & TensorFlow", "Security Auditing", "React Native"};

        for (int i = 1; i <= 50; i++) {
            String course = courses[i % courses.length];
            String subject = subjects[i % subjects.length];
            char batchChar = (char) ('A' + ((i - 1) % 26));
            int batchNum = ((i - 1) / 26) + 1;
            String batchName = "Batch " + batchChar + (batchNum > 1 ? " " + batchNum : "");

            Batch batch = new Batch();
            batch.setId("b-" + i);
            batch.setBatchName(batchName);
            batch.setCourse(course);
            batch.setSubject(subject);
            batch.setCreatedAt(now);
            batch.setUpdatedAt(now);
            batchRepository.save(batch);
        }
    }

    private void seedClasses() {
        String[] courses = {"UI/UX Design", "Front-end Development", "Back-end Development", "Project Management", "Cloud DevOps Engineering", "Data Science & AI", "Cyber Security", "Mobile App Development"};
        String[] subjects = {"Design Principles", "React & Next.js", "Node.js & Express", "Agile & Scrum", "AWS & Docker", "Python & TensorFlow", "Security Auditing", "React Native"};
        String[] times = {"09:30 AM - 11:00 AM", "10:15 AM - 11:45 AM", "11:00 AM - 12:30 PM", "12:00 PM - 01:30 PM", "02:00 PM - 03:30 PM", "03:30 PM - 05:00 PM"};
        String[] rooms = {"Room 101", "Room 102", "Room 203", "Room 204", "Virtual Hub A", "Virtual Hub B"};

        for (int i = 1; i <= 50; i++) {
            String course = courses[i % courses.length];
            String subject = subjects[i % subjects.length];
            char batchChar = (char) ('A' + ((i - 1) % 4));
            String batchName = "Batch " + batchChar;
            String time = times[i % times.length];
            String room = rooms[i % rooms.length];

            classInfoRepository.save(new ClassInfo("c-" + i, course, batchName, subject, time, "Shan Ali", room));
        }
    }

    private void seedAssessments() {
        Instant now = Instant.now();
        String[] courses = {"UI/UX Design", "Front-end Development", "Back-end Development", "Project Management", "Cloud DevOps Engineering", "Data Science & AI", "Cyber Security", "Mobile App Development"};
        String[] subjects = {"Design Principles", "React & Next.js", "Node.js & Express", "Agile & Scrum", "AWS & Docker", "Python & TensorFlow", "Security Auditing", "React Native"};
        String[] quizTitles = {"Core Principles Quiz", "Advanced Components Assessment", "Database Architecture Exam", "Agile Practices Review", "Infrastructure Deployment Test", "Statistical Models Evaluation", "Threat Vector Identification", "State Management Deep Dive"};

        for (int i = 1; i <= 50; i++) {
            String title = subjects[i % subjects.length] + " - " + quizTitles[i % quizTitles.length];
            String subject = courses[i % courses.length];
            char batchChar = (char) ('A' + ((i - 1) % 4));
            String batchName = "Batch " + batchChar;
            String questionType = (i % 2 == 0) ? "mcq" : "written";
            int totalMarks = questionType.equals("mcq") ? 30 : 50;
            String status = (i <= 40) ? "published" : "draft";
            String deadline = now.plus((i % 7) - 3, ChronoUnit.DAYS).toString().substring(0, 16);

            Assessment a = new Assessment();
            a.setId("a-" + i);
            a.setTitle(title);
            a.setSubject(subject);
            a.setBatch(batchName);
            a.setBatches(Arrays.asList(batchName));
            a.setInstructions("Please complete all parts carefully. Late submissions will face penalties.");
            a.setQuestionType(questionType);
            a.setTotalMarks(totalMarks);
            a.setDeadline(deadline);
            a.setStatus(status);
            a.setCreatedAt(now.minus(10, ChronoUnit.DAYS).toString());

            List<Question> qList = new ArrayList<>();
            if (questionType.equals("mcq")) {
                Question q1 = new Question();
                q1.setId("q-" + i + "-1");
                q1.setText("Identify the main advantage of using " + subjects[i % subjects.length] + " patterns.");
                q1.setType("mcq");
                q1.setOptions(Arrays.asList("Improved Performance", "Reduced Maintenance", "Enhanced Security", "All of the above"));
                q1.setCorrectAnswer("All of the above");
                q1.setMarks(10);
                q1.setAssessment(a);
                qList.add(q1);

                Question q2 = new Question();
                q2.setId("q-" + i + "-2");
                q2.setText("Which standard describes the baseline specification for this module?");
                q2.setType("mcq");
                q2.setOptions(Arrays.asList("RFC-2119", "ISO-27001", "IEEE-829", "W3C Recommendation"));
                q2.setCorrectAnswer("RFC-2119");
                q2.setMarks(10);
                q2.setAssessment(a);
                qList.add(q2);

                Question q3 = new Question();
                q3.setId("q-" + i + "-3");
                q3.setText("What is the default configuration parameter for initialization?");
                q3.setType("mcq");
                q3.setOptions(Arrays.asList("production=true", "mode=debug", "env=development", "autoConfigure=false"));
                q3.setCorrectAnswer("mode=debug");
                q3.setMarks(10);
                q3.setAssessment(a);
                qList.add(q3);
            } else {
                Question q1 = new Question();
                q1.setId("q-" + i + "-1");
                q1.setText("Provide a detailed critique on the scalability of " + subjects[i % subjects.length] + ".");
                q1.setType("written");
                q1.setOptions(new ArrayList<>());
                q1.setMarks(25);
                q1.setAssessment(a);
                qList.add(q1);

                Question q2 = new Question();
                q2.setId("q-" + i + "-2");
                q2.setText("Explain a real-world scenario where the default configurations fail.");
                q2.setType("written");
                q2.setOptions(new ArrayList<>());
                q2.setMarks(25);
                q2.setAssessment(a);
                qList.add(q2);
            }
            a.setQuestions(qList);

            if (i % 5 == 0) {
                a.setFileName("document_guide_" + i + ".pdf");
                a.setFileSize("1.5 MB");
                a.setFileUrl("/api/files/preview/document_guide_" + i + ".pdf");
                a.setFile(new AssessmentFile(
                        "document_guide_" + i + ".pdf",
                        "document_guide_" + i + ".pdf",
                        "/api/files/preview/document_guide_" + i + ".pdf",
                        "application/pdf",
                        1572864L,
                        now.minus(10, ChronoUnit.DAYS).toString()
                ));
            }
            assessmentRepository.save(a);
        }
    }

    private void seedSubmissions() {
        Instant now = Instant.now();
        String[] statuses = {"marked", "submitted", "Auto Graded"};
        String[] firstNames = {"Sarah", "Alex", "Emily", "David", "Jessica", "Michael", "Emma", "Daniel", "Olivia", "James", "Sophia", "Matthew", "Isabella", "Andrew", "Charlotte", "Joshua", "Amelia", "Christopher", "Mia", "Joseph", "Harper", "William", "Evelyn", "Abigail", "Ryan", "Emily", "Nathan", "Elizabeth", "Christian", "Sofia", "Justin", "Avery", "Jonathan", "Ella", "Robert", "Madison", "Brian", "Scarlett", "Kevin", "Grace", "Thomas", "Chloe", "Charles"};
        String[] lastNames = {"Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee", "Gonzalez", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Perez", "Hall", "Young", "Allen", "Sanchez", "Wright", "King", "Scott", "Green", "Baker", "Adams", "Nelson", "Hill", "Ramirez"};

        for (int i = 1; i <= 50; i++) {
            Optional<Assessment> aOpt = assessmentRepository.findById("a-" + i);
            if (!aOpt.isPresent()) continue;
            Assessment a = aOpt.get();

            int userIndex = 6 + (i % 44);
            String fName = firstNames[(userIndex - 1) % firstNames.length];
            String lName = lastNames[(userIndex - 1) % lastNames.length];
            String learnerName = fName + " " + lName;
            String learnerId = "u-" + userIndex;
            String rollNumber = "XEB" + String.format("%03d", userIndex);
            String learnerBatch = "Batch " + (char) ('A' + (userIndex % 4));

            String status = statuses[i % statuses.length];
            int totalMarks = a.getTotalMarks();
            Integer marksObtained = status.equals("submitted") ? null : (int) (totalMarks * (0.7 + (i % 4) * 0.1));

            Submission s = new Submission();
            s.setId("s-" + i);
            s.setAssessmentId(a.getId());
            s.setAssessmentTitle(a.getTitle());
            s.setSubject(a.getSubject());
            s.setBatch(learnerBatch);
            s.setLearnerId(learnerId);
            s.setLearnerName(learnerName);
            s.setRollNumber(rollNumber);
            s.setDeadline(a.getDeadline());

            Map<String, String> answers = new HashMap<>();
            for (Question q : a.getQuestions()) {
                if (q.getType().equals("mcq")) {
                    answers.put(q.getId(), q.getCorrectAnswer());
                } else {
                    answers.put(q.getId(), "This is a detailed and well-thought-out written response answering the query comprehensively.");
                }
            }
            s.setAnswers(answers);
            s.setStatus(status);
            s.setTotalMarks(totalMarks);
            s.setSubmittedAt(now.minus(i * 3L, ChronoUnit.HOURS).toString());

            if (marksObtained != null) {
                s.setMarksObtained(marksObtained);
                s.setPercentage((double) marksObtained / totalMarks * 100.0);
                s.setFeedback("Good submission, well answered and clearly explained.");
            }

            if (i % 4 == 0) {
                s.setSubmittedFileName("student_answer_sheet_" + i + ".pdf");
                s.setSubmittedFileUrl("/api/files/preview/student_answer_sheet_" + i + ".pdf");
            }

            submissionRepository.save(s);
        }
    }

    private void seedMaterials() {
        Instant now = Instant.now();
        String[] courses = {"UI/UX Design", "Front-end Development", "Back-end Development", "Project Management", "Cloud DevOps Engineering", "Data Science & AI", "Cyber Security", "Mobile App Development"};
        String[] subjects = {"Design Principles", "React & Next.js", "Node.js & Express", "Agile & Scrum", "AWS & Docker", "Python & TensorFlow", "Security Auditing", "React Native"};
        String[] suffixes = {"Guide Booklet", "Cheat Sheet Deck", "Syllabus Handout", "Reference Material Documentation"};
        String[] files = {"slide_deck_v1.pdf", "practical_cheatsheet.pdf", "syllabus_latest.pdf", "module_workbook.pdf"};

        for (int i = 1; i <= 50; i++) {
            String course = courses[i % courses.length];
            String subject = subjects[i % subjects.length];
            String title = subject + " " + suffixes[i % suffixes.length];
            char batchChar = (char) ('A' + ((i - 1) % 4));
            String batchName = "Batch " + batchChar;
            String fileName = subject.toLowerCase().replace(" ", "_") + "_" + files[i % files.length];

            materialRepository.save(new Material(
                    "m-" + i,
                    title,
                    course,
                    batchName,
                    fileName,
                    (1 + (i % 8)) + "." + (i % 9) + " MB",
                    "/api/files/preview/" + fileName,
                    "Shan Ali",
                    now.minus(i * 18L, ChronoUnit.HOURS).toString()
            ));
        }
    }
}
