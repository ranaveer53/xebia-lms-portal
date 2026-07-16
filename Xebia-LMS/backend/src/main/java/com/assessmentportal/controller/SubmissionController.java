package com.assessmentportal.controller;

import com.assessmentportal.dto.GradeRequest;
import com.assessmentportal.model.Assessment;
import com.assessmentportal.model.Submission;
import com.assessmentportal.model.User;
import com.assessmentportal.repository.AssessmentRepository;
import com.assessmentportal.repository.SubmissionRepository;
import com.assessmentportal.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import com.assessmentportal.model.Question;
import com.assessmentportal.service.CertificateService;

@RestController
@RequestMapping("/submissions")
public class SubmissionController {

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final AssessmentRepository assessmentRepository;
    private final CertificateService certificateService;

    public SubmissionController(
            SubmissionRepository submissionRepository,
            UserRepository userRepository,
            AssessmentRepository assessmentRepository,
            CertificateService certificateService) {
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.assessmentRepository = assessmentRepository;
        this.certificateService = certificateService;
    }

    @GetMapping
    public List<Submission> getAll(
            @RequestParam(required = false) String assessmentId,
            @RequestParam(required = false) List<String> batches,
            @RequestParam(required = false) String learnerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String timeFilter,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {

        List<User> learners = userRepository.findAll();
        List<Assessment> assessments = assessmentRepository.findAll();
        List<Submission> dbSubmissions = submissionRepository.findAll();

        List<Submission> allSubmissions = new ArrayList<>();
        Map<String, Submission> subMap = new HashMap<>();

        for (Submission s : dbSubmissions) {
            subMap.put(s.getAssessmentId() + "-" + s.getLearnerId(), s);
            allSubmissions.add(s);
        }

        Instant now = Instant.now();

        for (Assessment a : assessments) {
            if (a.getStatus() == null || !a.getStatus().equalsIgnoreCase("published")) {
                continue;
            }
            List<String> aBatches = a.getBatches();
            for (User u : learners) {
                if (!u.getRole().equalsIgnoreCase("learner")) {
                    continue;
                }
                String userBatch = u.getBatch();
                if (userBatch != null && (aBatches.contains(userBatch) || userBatch.equalsIgnoreCase(a.getBatch()))) {
                    String key = a.getId() + "-" + u.getId();
                    if (!subMap.containsKey(key)) {
                        Submission vs = new Submission();
                        vs.setId("v-" + key);
                        vs.setAssessmentId(a.getId());
                        vs.setAssessmentTitle(a.getTitle());
                        vs.setSubject(a.getSubject());
                        vs.setBatch(u.getBatch());
                        vs.setLearnerId(u.getId());
                        vs.setLearnerName(u.getName());
                        vs.setRollNumber(u.getRollNumber());
                        vs.setDeadline(a.getDeadline());
                        vs.setAnswers(new HashMap<>());
                        vs.setTotalMarks(a.getTotalMarks());
                        
                        try {
                            Instant deadlineInstant;
                            if (a.getDeadline().contains("T")) {
                                if (a.getDeadline().length() == 16) {
                                    deadlineInstant = Instant.parse(a.getDeadline() + ":00Z");
                                } else {
                                    deadlineInstant = Instant.parse(a.getDeadline());
                                }
                            } else {
                                deadlineInstant = Instant.parse(a.getDeadline() + "T23:59:59Z");
                            }
                            
                            if (now.isAfter(deadlineInstant)) {
                                vs.setStatus("missing");
                            } else {
                                vs.setStatus("pending");
                            }
                        } catch (Exception e) {
                            vs.setStatus("pending");
                        }
                        
                        allSubmissions.add(vs);
                    } else {
                        Submission s = subMap.get(key);
                        if (s.getRollNumber() == null || s.getRollNumber().isEmpty()) {
                            s.setRollNumber(u.getRollNumber());
                        }
                        if (s.getDeadline() == null || s.getDeadline().isEmpty()) {
                            s.setDeadline(a.getDeadline());
                        }
                        
                        if (s.getStatus().equalsIgnoreCase("submitted") && s.getSubmittedAt() != null) {
                            try {
                                Instant subInstant = Instant.parse(s.getSubmittedAt());
                                Instant deadlineInstant = Instant.parse(a.getDeadline().contains("T") ? (a.getDeadline().length() == 16 ? a.getDeadline() + ":00Z" : a.getDeadline()) : a.getDeadline() + "T23:59:59Z");
                                if (subInstant.isAfter(deadlineInstant)) {
                                    s.setStatus("late");
                                }
                            } catch (Exception e) {
                                // ignore
                            }
                        }
                    }
                }
            }
        }

        List<Submission> filtered = new ArrayList<>();
        for (Submission s : allSubmissions) {
            if (assessmentId != null && !assessmentId.isEmpty() && !s.getAssessmentId().equals(assessmentId)) {
                continue;
            }
            if (batches != null && !batches.isEmpty() && !batches.contains(s.getBatch())) {
                continue;
            }
            // Filter by specific learnerId (used when learner fetches only their own submissions)
            if (learnerId != null && !learnerId.isEmpty() && !learnerId.equals(s.getLearnerId())) {
                continue;
            }
            if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("All")) {
                String sStatus = s.getStatus();
                if (status.equalsIgnoreCase("Pending Submission") && !sStatus.equalsIgnoreCase("pending")) {
                    continue;
                } else if (status.equalsIgnoreCase("Submitted") && !sStatus.equalsIgnoreCase("submitted")) {
                    continue;
                } else if (status.equalsIgnoreCase("Reviewed") && !sStatus.equalsIgnoreCase("marked")) {
                    continue;
                } else if (status.equalsIgnoreCase("Graded") && !sStatus.equalsIgnoreCase("marked")) {
                    continue;
                } else if (status.equalsIgnoreCase("Late Submission") && !sStatus.equalsIgnoreCase("late")) {
                    continue;
                } else if (status.equalsIgnoreCase("Missing Submission") && !sStatus.equalsIgnoreCase("missing")) {
                    continue;
                }
            }
            if (search != null && !search.isEmpty()) {
                String sc = search.toLowerCase();
                boolean matches = (s.getLearnerName() != null && s.getLearnerName().toLowerCase().contains(sc)) ||
                                  (s.getRollNumber() != null && s.getRollNumber().toLowerCase().contains(sc)) ||
                                  (s.getAssessmentTitle() != null && s.getAssessmentTitle().toLowerCase().contains(sc));
                if (!matches) {
                    continue;
                }
            }
            if (timeFilter != null && !timeFilter.isEmpty() && !timeFilter.equalsIgnoreCase("All")) {
                String refTime = s.getSubmittedAt() != null ? s.getSubmittedAt() : s.getDeadline();
                if (refTime != null) {
                    try {
                        Instant refInstant = Instant.parse(refTime.contains("T") ? (refTime.length() == 16 ? refTime + ":00Z" : refTime) : refTime + "T00:00:00Z");
                        Instant start = null;
                        if (timeFilter.equalsIgnoreCase("Today")) {
                            start = now.truncatedTo(ChronoUnit.DAYS);
                        } else if (timeFilter.equalsIgnoreCase("This Week")) {
                            start = now.minus(7, ChronoUnit.DAYS);
                        } else if (timeFilter.equalsIgnoreCase("This Month")) {
                            start = now.minus(30, ChronoUnit.DAYS);
                        }
                        if (start != null && refInstant.isBefore(start)) {
                            continue;
                        }
                    } catch (Exception e) {
                        // ignore
                    }
                }
            }
            filtered.add(s);
        }

        if (sortBy != null && !sortBy.isEmpty()) {
            if (sortBy.equalsIgnoreCase("Newest First") || sortBy.equalsIgnoreCase("Submission Time")) {
                filtered.sort((a, b) -> {
                    String ta = a.getSubmittedAt() != null ? a.getSubmittedAt() : "";
                    String tb = b.getSubmittedAt() != null ? b.getSubmittedAt() : "";
                    return tb.compareTo(ta);
                });
            } else if (sortBy.equalsIgnoreCase("Oldest First")) {
                filtered.sort((a, b) -> {
                    String ta = a.getSubmittedAt() != null ? a.getSubmittedAt() : "";
                    String tb = b.getSubmittedAt() != null ? b.getSubmittedAt() : "";
                    return ta.compareTo(tb);
                });
            } else if (sortBy.equalsIgnoreCase("Highest Marks")) {
                filtered.sort((a, b) -> {
                    Integer ma = a.getMarksObtained() != null ? a.getMarksObtained() : -1;
                    Integer mb = b.getMarksObtained() != null ? b.getMarksObtained() : -1;
                    return mb.compareTo(ma);
                });
            } else if (sortBy.equalsIgnoreCase("Lowest Marks")) {
                filtered.sort((a, b) -> {
                    Integer ma = a.getMarksObtained() != null ? a.getMarksObtained() : Integer.MAX_VALUE;
                    Integer mb = b.getMarksObtained() != null ? b.getMarksObtained() : Integer.MAX_VALUE;
                    return ma.compareTo(mb);
                });
            } else if (sortBy.equalsIgnoreCase("Alphabetical")) {
                filtered.sort((a, b) -> {
                    String na = a.getLearnerName() != null ? a.getLearnerName() : "";
                    String nb = b.getLearnerName() != null ? b.getLearnerName() : "";
                    return na.compareToIgnoreCase(nb);
                });
            }
        } else {
            filtered.sort((a, b) -> {
                String ta = a.getSubmittedAt() != null ? a.getSubmittedAt() : "";
                String tb = b.getSubmittedAt() != null ? b.getSubmittedAt() : "";
                return tb.compareTo(ta);
            });
        }

        int startIdx = page * size;
        if (startIdx >= filtered.size()) {
            return new ArrayList<>();
        }
        int endIdx = Math.min(startIdx + size, filtered.size());
        return filtered.subList(startIdx, endIdx);
    }

    @PostMapping
    public Submission submit(@RequestBody Submission submission) {
        Optional<Assessment> optAssessment = assessmentRepository.findById(submission.getAssessmentId());
        if (optAssessment.isPresent()) {
            Assessment assessment = optAssessment.get();
            List<Question> questions = assessment.getQuestions();
            
            if (questions != null && !questions.isEmpty()) {
                boolean hasWritten = false;
                int mcqMarksObtained = 0;
                int totalMcqQuestions = 0;
                
                for (Question q : questions) {
                    if ("written".equalsIgnoreCase(q.getType())) {
                        hasWritten = true;
                    } else if ("mcq".equalsIgnoreCase(q.getType())) {
                        totalMcqQuestions++;
                        String studentAns = submission.getAnswers() != null ? submission.getAnswers().get(q.getId()) : null;
                        if (studentAns != null && q.getCorrectAnswer() != null) {
                            if (studentAns.trim().equalsIgnoreCase(q.getCorrectAnswer().trim())) {
                                mcqMarksObtained += q.getMarks();
                            }
                        }
                    }
                }
                
                if (totalMcqQuestions > 0 && !hasWritten) {
                    submission.setMarksObtained(mcqMarksObtained);
                    double pct = ((double) mcqMarksObtained / assessment.getTotalMarks()) * 100.0;
                    submission.setPercentage(pct);
                    submission.setStatus("Auto Graded");
                } else if (totalMcqQuestions > 0 && hasWritten) {
                    submission.setMarksObtained(mcqMarksObtained);
                    double pct = ((double) mcqMarksObtained / assessment.getTotalMarks()) * 100.0;
                    submission.setPercentage(pct);
                    submission.setStatus("submitted");
                } else {
                    submission.setPercentage(0.0);
                }
            } else {
                submission.setPercentage(0.0);
            }
        }

        Submission saved = submissionRepository.save(submission);
        
        if ("Auto Graded".equals(saved.getStatus())) {
            certificateService.checkAndGenerate(saved.getLearnerId(), saved.getAssessmentId());
        }
        
        return saved;
    }

    private Submission resolveSubmission(String id) {
        if (id != null && id.startsWith("v-")) {
            String remaining = id.substring(2);
            
            List<User> learners = userRepository.findAll();
            User matchedUser = null;
            String assessmentId = null;
            
            for (User u : learners) {
                if (remaining.endsWith("-" + u.getId())) {
                    matchedUser = u;
                    assessmentId = remaining.substring(0, remaining.length() - u.getId().length() - 1);
                    break;
                }
            }
            
            if (matchedUser == null || assessmentId == null) return null;
            
            Optional<Assessment> aOpt = assessmentRepository.findById(assessmentId);
            if (!aOpt.isPresent()) return null;
            
            Assessment a = aOpt.get();
            User u = matchedUser;
            
            Submission vs = new Submission();
            vs.setAssessmentId(a.getId());
            vs.setAssessmentTitle(a.getTitle());
            vs.setSubject(a.getSubject());
            vs.setBatch(u.getBatch());
            vs.setLearnerId(u.getId());
            vs.setLearnerName(u.getName());
            vs.setRollNumber(u.getRollNumber());
            vs.setDeadline(a.getDeadline());
            vs.setAnswers(new HashMap<>());
            vs.setTotalMarks(a.getTotalMarks());
            vs.setSubmittedAt(Instant.now().toString());
            return vs;
        } else {
            Optional<Submission> opt = submissionRepository.findById(id);
            return opt.orElse(null);
        }
    }

    @PatchMapping("/{id}/grade")
    public ResponseEntity<?> grade(@PathVariable String id, @RequestBody GradeRequest request) {
        Submission submission = resolveSubmission(id);
        if (submission == null) {
            return ResponseEntity.notFound().build();
        }

        submission.setMarksObtained(request.getMarks());
        submission.setFeedback(request.getFeedback());
        submission.setStatus("marked");
        
        double pct = 0;
        if (submission.getTotalMarks() > 0) {
            pct = ((double) request.getMarks() / submission.getTotalMarks()) * 100.0;
        }
        submission.setPercentage(pct);

        Submission saved = submissionRepository.save(submission);
        certificateService.checkAndGenerate(saved.getLearnerId(), saved.getAssessmentId());
        
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/bulk-grade")
    public ResponseEntity<?> bulkGrade(@RequestBody List<BulkGradeItem> items) {
        List<Submission> updated = new ArrayList<>();
        for (BulkGradeItem item : items) {
            Submission s = resolveSubmission(item.getId());
            if (s != null) {
                s.setMarksObtained(item.getMarks());
                s.setFeedback(item.getFeedback());
                s.setStatus("marked");
                
                double pct = 0;
                if (s.getTotalMarks() > 0) {
                    pct = ((double) item.getMarks() / s.getTotalMarks()) * 100.0;
                }
                s.setPercentage(pct);
                
                Submission saved = submissionRepository.save(s);
                certificateService.checkAndGenerate(saved.getLearnerId(), saved.getAssessmentId());
                updated.add(saved);
            }
        }
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/bulk-reviewed")
    public ResponseEntity<?> bulkReviewed(@RequestBody List<String> ids) {
        List<Submission> updated = new ArrayList<>();
        for (String id : ids) {
            Submission s = resolveSubmission(id);
            if (s != null) {
                s.setStatus("marked");
                if (s.getMarksObtained() == null) {
                    s.setMarksObtained(s.getTotalMarks());
                }
                
                double pct = 0;
                if (s.getTotalMarks() > 0) {
                    pct = ((double) s.getMarksObtained() / s.getTotalMarks()) * 100.0;
                }
                s.setPercentage(pct);
                
                Submission saved = submissionRepository.save(s);
                certificateService.checkAndGenerate(saved.getLearnerId(), saved.getAssessmentId());
                updated.add(saved);
            }
        }
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/scorecard")
    public ResponseEntity<?> getScorecard(@PathVariable String id) {
        Optional<Submission> optSubmission = submissionRepository.findById(id);
        if (!optSubmission.isPresent()) {
            return ResponseEntity.status(404).body("Submission not found");
        }
        Submission submission = optSubmission.get();
        Optional<Assessment> optAssessment = assessmentRepository.findById(submission.getAssessmentId());
        if (!optAssessment.isPresent()) {
            return ResponseEntity.status(404).body("Assessment not found");
        }
        Assessment assessment = optAssessment.get();
        
        // If assessment has MCQ/structured questions but submission answers map is empty, return 400
        List<Question> questions = assessment.getQuestions();
        boolean hasQuestions = questions != null && !questions.isEmpty();
        boolean hasAnswers = submission.getAnswers() != null && !submission.getAnswers().isEmpty();
        if (hasQuestions && !hasAnswers) {
            return ResponseEntity.status(400).body("Submission has no answer data");
        }
        
        ScorecardResponse response = new ScorecardResponse();
        response.setSubmissionId(submission.getId());
        response.setAssessmentId(submission.getAssessmentId());
        response.setAssessmentTitle(submission.getAssessmentTitle());
        response.setSubject(submission.getSubject());
        response.setMarksObtained(submission.getMarksObtained());
        response.setTotalMarks(submission.getTotalMarks());
        response.setPercentage(submission.getPercentage() != null ? submission.getPercentage() : 0.0);
        response.setFeedback(submission.getFeedback());
        response.setSubmittedAt(submission.getSubmittedAt());
        response.setSubmittedFileName(submission.getSubmittedFileName());
        response.setSubmittedFileUrl(submission.getSubmittedFileUrl());
        response.setDetailedReviewAvailable(true);
        
        // Calculate status
        double pct = submission.getPercentage() != null ? submission.getPercentage() : 0.0;
        response.setStatus(pct >= 90.0 ? "PASSED" : "FAILED");
        
        if (hasQuestions) {
            int totalQuestions = 0;
            int correctCount = 0;
            int wrongCount = 0;
            int unansweredCount = 0;
            
            for (Question q : questions) {
                totalQuestions++;
                ScorecardAnswer ans = new ScorecardAnswer();
                ans.setQuestionId(q.getId());
                ans.setQuestionText(q.getText());
                ans.setOptions(q.getOptions());
                ans.setCorrectAnswer(q.getCorrectAnswer());
                ans.setQuestionMarks(q.getMarks());
                ans.setExplanation(q.getExplanation());
                
                String studentAns = submission.getAnswers().get(q.getId());
                ans.setStudentAnswer(studentAns);
                
                if (studentAns == null || studentAns.trim().isEmpty()) {
                    unansweredCount++;
                    ans.setCorrect(false);
                    ans.setMarksAwarded(0);
                } else if (q.getCorrectAnswer() != null && studentAns.trim().equalsIgnoreCase(q.getCorrectAnswer().trim())) {
                    correctCount++;
                    ans.setCorrect(true);
                    ans.setMarksAwarded(q.getMarks());
                } else {
                    wrongCount++;
                    ans.setCorrect(false);
                    ans.setMarksAwarded(0);
                }
                response.getAnswers().add(ans);
            }
            
            response.setTotalQuestions(totalQuestions);
            response.setCorrectCount(correctCount);
            response.setWrongCount(wrongCount);
            response.setUnansweredCount(unansweredCount);
        }
        
        return ResponseEntity.ok(response);
    }

    public static class BulkGradeItem {
        private String id;
        private int marks;
        private String feedback;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public int getMarks() { return marks; }
        public void setMarks(int marks) { this.marks = marks; }
        public String getFeedback() { return feedback; }
        public void setFeedback(String feedback) { this.feedback = feedback; }
    }

    public static class ScorecardResponse {
        private String submissionId;
        private String assessmentId;
        private String assessmentTitle;
        private String subject;
        private int totalQuestions;
        private int correctCount;
        private int wrongCount;
        private int unansweredCount;
        private Integer marksObtained;
        private int totalMarks;
        private double percentage;
        private String status;
        private String feedback;
        private String submittedAt;
        private String submittedFileName;
        private String submittedFileUrl;
        private boolean detailedReviewAvailable;
        private List<ScorecardAnswer> answers = new ArrayList<>();

        public String getSubmissionId() { return submissionId; }
        public void setSubmissionId(String submissionId) { this.submissionId = submissionId; }
        public String getAssessmentId() { return assessmentId; }
        public void setAssessmentId(String assessmentId) { this.assessmentId = assessmentId; }
        public String getAssessmentTitle() { return assessmentTitle; }
        public void setAssessmentTitle(String assessmentTitle) { this.assessmentTitle = assessmentTitle; }
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
        public int getTotalQuestions() { return totalQuestions; }
        public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }
        public int getCorrectCount() { return correctCount; }
        public void setCorrectCount(int correctCount) { this.correctCount = correctCount; }
        public int getWrongCount() { return wrongCount; }
        public void setWrongCount(int wrongCount) { this.wrongCount = wrongCount; }
        public int getUnansweredCount() { return unansweredCount; }
        public void setUnansweredCount(int unansweredCount) { this.unansweredCount = unansweredCount; }
        public Integer getMarksObtained() { return marksObtained; }
        public void setMarksObtained(Integer marksObtained) { this.marksObtained = marksObtained; }
        public int getTotalMarks() { return totalMarks; }
        public void setTotalMarks(int totalMarks) { this.totalMarks = totalMarks; }
        public double getPercentage() { return percentage; }
        public void setPercentage(double percentage) { this.percentage = percentage; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getFeedback() { return feedback; }
        public void setFeedback(String feedback) { this.feedback = feedback; }
        public String getSubmittedAt() { return submittedAt; }
        public void setSubmittedAt(String submittedAt) { this.submittedAt = submittedAt; }
        public String getSubmittedFileName() { return submittedFileName; }
        public void setSubmittedFileName(String submittedFileName) { this.submittedFileName = submittedFileName; }
        public String getSubmittedFileUrl() { return submittedFileUrl; }
        public void setSubmittedFileUrl(String submittedFileUrl) { this.submittedFileUrl = submittedFileUrl; }
        public boolean isDetailedReviewAvailable() { return detailedReviewAvailable; }
        public void setDetailedReviewAvailable(boolean detailedReviewAvailable) { this.detailedReviewAvailable = detailedReviewAvailable; }
        public List<ScorecardAnswer> getAnswers() { return answers; }
        public void setAnswers(List<ScorecardAnswer> answers) { this.answers = answers; }
    }

    public static class ScorecardAnswer {
        private String questionId;
        private String questionText;
        private List<String> options;
        private String studentAnswer;
        private String correctAnswer;
        private boolean isCorrect;
        private int marksAwarded;
        private int questionMarks;
        private String explanation;

        public String getQuestionId() { return questionId; }
        public void setQuestionId(String questionId) { this.questionId = questionId; }
        public String getQuestionText() { return questionText; }
        public void setQuestionText(String questionText) { this.questionText = questionText; }
        public List<String> getOptions() { return options; }
        public void setOptions(List<String> options) { this.options = options; }
        public String getStudentAnswer() { return studentAnswer; }
        public void setStudentAnswer(String studentAnswer) { this.studentAnswer = studentAnswer; }
        public String getCorrectAnswer() { return correctAnswer; }
        public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }
        public boolean isCorrect() { return isCorrect; }
        public void setCorrect(boolean correct) { isCorrect = correct; }
        public int getMarksAwarded() { return marksAwarded; }
        public void setMarksAwarded(int marksAwarded) { this.marksAwarded = marksAwarded; }
        public int getQuestionMarks() { return questionMarks; }
        public void setQuestionMarks(int questionMarks) { this.questionMarks = questionMarks; }
        public String getExplanation() { return explanation; }
        public void setExplanation(String explanation) { this.explanation = explanation; }
    }
}
