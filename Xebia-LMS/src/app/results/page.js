"use client";

import React from "react";
import Card, { CardBody } from "../../components/common/Card";
import { assessmentService } from "../../services/api";
import { Trophy, CheckCircle, XCircle, Calendar, Percent } from "lucide-react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../../components/common/Skeleton";
import ErrorState from "../../components/common/ErrorState";

export default function ResultsPage() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";

  const { data: results = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["my-submissions", userEmail],
    queryFn: () => assessmentService.getResults(userEmail),
    enabled: !!userEmail,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Assessment Results</h1>
        <p className="text-sm text-text-muted">Review your completed submissions, passing history, and scores.</p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : results.length === 0 ? (
        <Card>
          <CardBody className="p-8 text-center text-sm text-text-muted space-y-2">
            <Trophy className="w-8 h-8 text-text-muted/60 mx-auto" />
            <p className="font-semibold text-foreground">No assessment submissions recorded yet.</p>
            <p className="text-xs">Assigned tests will show here once you complete and submit them.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {results.map((result) => {
            const isPass = result.passed;
            return (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardBody className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl p-3 border ${
                      isPass 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : "bg-rose-50 text-rose-600 border-rose-100"
                    }`}>
                      {isPass ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div className="space-y-1">
                      <h2 className="font-black text-foreground text-base leading-snug">{result.assessmentTitle}</h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(result.submittedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Percent className="w-3.5 h-3.5" />
                          Passing Score threshold achieved
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-border/60">
                    <div className="space-y-0.5">
                      <p className={`text-xl font-black ${isPass ? "text-emerald-600" : "text-rose-600"}`}>
                        {result.percentage}%
                      </p>
                      <p className="text-[10px] uppercase font-black tracking-wider text-text-muted">
                        {result.score} / {result.total} Correct
                      </p>
                    </div>
                    <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border ${
                      isPass 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-rose-50 text-rose-700 border-rose-100"
                    }`}>
                      {isPass ? "Passed" : "Failed"}
                    </span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
