package com.assessmentportal.controller;

import com.assessmentportal.model.Assessment;
import com.assessmentportal.model.Submission;
import com.assessmentportal.repository.AssessmentRepository;
import com.assessmentportal.repository.SubmissionRepository;
import com.assessmentportal.repository.UserRepository;
import com.assessmentportal.service.CertificateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/assessments")
public class AssessmentController {

    private final AssessmentRepository assessmentRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final CertificateService certificateService;

    public AssessmentController(AssessmentRepository assessmentRepository,
                                SubmissionRepository submissionRepository,
                                UserRepository userRepository,
                                CertificateService certificateService) {
        this.assessmentRepository = assessmentRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.certificateService = certificateService;
    }

    @GetMapping
    public List<Assessment> getAll(
            @RequestParam(required = false) String batch,
            @RequestParam(required = false) String timeFilter,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role) {

        List<Assessment> assessments;

        if (batch != null && !batch.isEmpty() && !batch.equals("All Batches")) {
            final String normalizedBatch = batch.trim().toLowerCase();
            // Fetch all and perform case-insensitive and trimmed filtering
            assessments = assessmentRepository.findAll().stream().filter(a -> {
                boolean matchOld = a.getBatch() != null && a.getBatch().trim().toLowerCase().equals(normalizedBatch);
                boolean matchNew = a.getBatches() != null && a.getBatches().stream()
                        .anyMatch(bz -> bz != null && bz.trim().toLowerCase().equals(normalizedBatch));
                return matchOld || matchNew;
            }).collect(Collectors.toList());
        } else {
            assessments = assessmentRepository.findAll();
        }

        // Apply status and role filters
        if ("learner".equalsIgnoreCase(role)) {
            // Learners can ONLY see published assessments (case-insensitive)
            assessments = assessments.stream()
                    .filter(a -> "published".equalsIgnoreCase(a.getStatus()))
                    .collect(Collectors.toList());
        } else {
            // Non-learners (teachers)
            if (status != null && !status.isEmpty()) {
                assessments = assessments.stream()
                        .filter(a -> status.equalsIgnoreCase(a.getStatus()))
                        .collect(Collectors.toList());
            }
        }

        if (timeFilter != null && !timeFilter.equals("All")) {
            final LocalDate today = LocalDate.now();
            assessments = assessments.stream().filter(a -> {
                try {
                    LocalDate createdDate;
                    String createdAt = a.getCreatedAt();
                    if (createdAt.contains("T")) {
                        createdDate = OffsetDateTime.parse(createdAt).toLocalDate();
                    } else {
                        createdDate = LocalDate.parse(createdAt, DateTimeFormatter.ISO_LOCAL_DATE);
                    }

                    if ("Today".equals(timeFilter)) {
                        return createdDate.isEqual(today);
                    } else if ("This Week".equals(timeFilter)) {
                        return !createdDate.isBefore(today.minusDays(7));
                    } else if ("This Month".equals(timeFilter)) {
                        return !createdDate.isBefore(today.minusDays(30));
                    }
                    return true;
                } catch (Exception e) {
                    return true;
                }
            }).collect(Collectors.toList());
        }

        return assessments;
    }

    @PostMapping
    public Assessment save(@RequestBody Assessment assessment) {
        assessment.syncQuestions();
        if (assessment.getStatus() == null || assessment.getStatus().isEmpty()) {
            assessment.setStatus("published");
        }
        return assessmentRepository.save(assessment);
    }

    @PostMapping("/draft")
    public Assessment saveDraft(@RequestBody Assessment assessment) {
        assessment.syncQuestions();
        assessment.setStatus("draft");
        return assessmentRepository.save(assessment);
    }

    @PostMapping("/publish")
    public Assessment savePublish(@RequestBody Assessment assessment) {
        assessment.syncQuestions();
        assessment.setStatus("published");
        return assessmentRepository.save(assessment);
    }

    @PatchMapping("/{id}/publish")
    public ResponseEntity<?> publishAssessment(@PathVariable String id) {
        return assessmentRepository.findById(id).map(a -> {
            a.setStatus("published");
            assessmentRepository.save(a);
            return ResponseEntity.ok(a);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        if (!assessmentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        assessmentRepository.deleteById(id);
        Map<String, Boolean> result = new HashMap<>();
        result.put("success", true);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Assessment> getById(@PathVariable String id) {
        return assessmentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/submit")
    public Submission submitAssessment(
            @PathVariable String id, 
            @RequestBody Map<String, Object> payload) {
        
        Assessment assessment = assessmentRepository.findById(id).orElse(null);
        if (assessment == null) {
            throw new RuntimeException("Assessment not found");
        }

        Submission submission = new Submission();
        submission.setId("submission-" + System.currentTimeMillis());
        submission.setAssessmentId(id);
        submission.setAssessmentTitle(assessment.getTitle());
        submission.setSubject(assessment.getSubject());
        
        String learnerId = String.valueOf(payload.getOrDefault("learnerId", "learner-1"));
        submission.setLearnerId(learnerId);
        
        userRepository.findById(learnerId).ifPresent(u -> {
            submission.setLearnerName(u.getName());
            submission.setRollNumber(u.getRollNumber());
            submission.setBatch(u.getBatch());
        });
        
        submission.setSubmittedAt(java.time.Instant.now().toString());
        submission.setStatus("submitted");

        Map<String, String> answers = new HashMap<>();
        if (payload.containsKey("answers") && payload.get("answers") instanceof Map) {
            ((Map<?, ?>) payload.get("answers")).forEach((k, v) -> answers.put(String.valueOf(k), String.valueOf(v)));
        }
        submission.setAnswers(answers);
        submission.setTotalMarks(assessment.getTotalMarks());

        List<com.assessmentportal.model.Question> questions = assessment.getQuestions();
        if (questions != null && !questions.isEmpty()) {
            boolean hasWritten = false;
            int mcqMarksObtained = 0;
            int totalMcqQuestions = 0;
            
            for (com.assessmentportal.model.Question q : questions) {
                if ("written".equalsIgnoreCase(q.getType())) {
                    hasWritten = true;
                } else if ("mcq".equalsIgnoreCase(q.getType())) {
                    totalMcqQuestions++;
                    String studentAns = answers.get(q.getId());
                    if (studentAns != null && q.getCorrectAnswer() != null) {
                        if (studentAns.trim().equalsIgnoreCase(q.getCorrectAnswer().trim())) {
                            mcqMarksObtained += q.getMarks();
                        }
                    }
                }
            }
            
            submission.setMarksObtained(mcqMarksObtained);
            double pct = ((double) mcqMarksObtained / assessment.getTotalMarks()) * 100.0;
            submission.setPercentage(pct);
            
            if (totalMcqQuestions > 0 && !hasWritten) {
                submission.setStatus("Auto Graded");
            } else {
                submission.setStatus("submitted");
            }
        } else {
            submission.setPercentage(0.0);
        }

        Submission saved = submissionRepository.save(submission);
        if ("Auto Graded".equals(saved.getStatus())) {
            certificateService.checkAndGenerate(saved.getLearnerId(), saved.getAssessmentId());
        }
        return saved;
    }
}
