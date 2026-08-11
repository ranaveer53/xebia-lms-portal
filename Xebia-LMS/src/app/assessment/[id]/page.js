"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card, { CardBody } from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import { assessmentService } from "../../../services/api";
import { useSession } from "next-auth/react";
import { CheckCircle2, XCircle, Trophy, ArrowRight, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await assessmentService.getAssessmentById(params.id);
      setAssessment(data);
    }
    if (params?.id) load();
  }, [params?.id]);

  const totalQuestions = useMemo(() => assessment?.questions?.length || 0, [assessment]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    // Validate that all questions are answered
    if (Object.keys(answers).length < totalQuestions) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await assessmentService.submitAssessment(params.id, {
        learnerId: session?.user?.id || "learner-1",
        learnerEmail: session?.user?.email || "learner@xebia.com",
        answers,
      });
      setResult(res);
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to submit assessment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
  };

  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-text-muted animate-pulse">Loading assessment details...</div>
      </div>
    );
  }

  // If results are available, show the score screen
  if (result) {
    const isPass = result.passed;
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-4">
        <Card className={`overflow-hidden border-t-8 ${isPass ? "border-t-emerald-500" : "border-t-rose-500"}`}>
          <CardBody className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              {isPass ? (
                <div className="bg-emerald-50 p-4 rounded-full border border-emerald-100 animate-bounce">
                  <Trophy className="w-12 h-12 text-emerald-600" />
                </div>
              ) : (
                <div className="bg-rose-50 p-4 rounded-full border border-rose-100">
                  <XCircle className="w-12 h-12 text-rose-600" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-foreground">{result.assessmentTitle}</h1>
              <p className="text-sm text-text-muted">Assessment Submission Complete</p>
            </div>

            <div className="py-4 bg-gray-50 rounded-2xl border border-gray-100/50 max-w-sm mx-auto space-y-1">
              <p className="text-[10px] uppercase font-black tracking-wider text-text-muted">Your Score</p>
              <p className={`text-5xl font-black ${isPass ? "text-emerald-600" : "text-rose-600"}`}>
                {result.percentage}%
              </p>
              <p className="text-xs font-semibold text-text-muted">
                {result.score} / {result.total} Correct Answers
              </p>
            </div>

            <div className="max-w-md mx-auto">
              {isPass ? (
                <p className="text-sm text-emerald-800 bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100 font-medium">
                  Congratulations! You passed this assessment and satisfied the minimum threshold of {assessment.passingScore}%.
                </p>
              ) : (
                <p className="text-sm text-rose-800 bg-rose-50/50 rounded-xl p-3.5 border border-rose-100 font-medium">
                  You did not meet the passing score of {assessment.passingScore}%. We recommend reviewing the learning modules and trying again.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-border">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full justify-center flex items-center gap-1.5">
                  <Home className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                </Button>
              </Link>
              {!isPass && (
                <Button onClick={handleRetry} variant="primary" className="w-full sm:w-auto flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry Assessment</span>
                </Button>
              )}
              {isPass && (
                <Link href="/results" className="w-full sm:w-auto">
                  <Button variant="primary" className="w-full justify-center flex items-center gap-1.5">
                    <span>View Performance History</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-black text-foreground">{assessment.title}</h1>
        <p className="text-sm text-text-muted">{assessment.description}</p>
      </div>

      <Card>
        <CardBody className="p-6 md:p-8 space-y-6">
          {assessment.questions?.map((question, index) => (
            <div key={question.id} className="space-y-3.5 border-b border-border/60 pb-5 last:border-0 last:pb-0">
              <p className="font-bold text-foreground text-sm leading-snug">
                {index + 1}. {question.prompt}
              </p>
              <div className="grid gap-2.5">
                {question.options?.map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-3 text-sm p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      answers[question.id] === option
                        ? "border-primary/50 bg-primary/5 font-semibold text-primary"
                        : "border-border/60 hover:bg-gray-50 text-text-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === option}
                      onChange={() => handleAnswerChange(question.id, option)}
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 cursor-pointer"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {Object.keys(answers).length} of {totalQuestions} Answered
            </span>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={Object.keys(answers).length < totalQuestions}
              variant="primary"
              className="px-6"
            >
              Submit Assessment
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
