"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Scenario } from "@/lib/scenarios";
import { ScenarioIcon } from "@/components/ui/scenario-icon";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, MessageSquare, TrendingUp, Play, BarChart3 } from "lucide-react";
import { FeedbackReport } from "@/components/practice/feedback-report";

interface Session {
  id: string;
  scenario_id: string;
  language: string;
  status: string;
  message_count: number;
  started_at: string;
  feedback_reports: any;
}

interface Props {
  session: Session;
  scenario: Scenario | undefined;
}

const langLabel: Record<string, string> = { en: "English", ha: "Hausa", yo: "Yoruba", ig: "Igbo" };

const statusStyle: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  active: "bg-amber-50 text-amber-700 border-amber-200",
  abandoned: "bg-muted text-muted-foreground border-border",
};

export function SessionCard({ session, scenario }: Props) {
  const router = useRouter();
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const report = (session.feedback_reports as any)?.[0] || session.feedback_reports;
  const score = report?.overall_score;
  const hasMessages = (session.message_count ?? 0) > 0;
  const isResumable = session.status === "active" && hasMessages;
  const canScore = (session.status === "active" || session.status === "abandoned") && hasMessages && !score;
  const hasResults = session.status === "completed" && score;

  const getScore = async () => {
    setScoring(true);
    setScoreError("");
    try {
      // Fetch messages for this session
      const msgRes = await fetch(`/api/sessions/${session.id}`);
      const { messages = [] } = await msgRes.json();

      if (messages.length < 2) {
        setScoreError("Not enough messages to generate feedback.");
        return;
      }

      const transcript = messages.map((m: any) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          scenarioId: session.scenario_id,
          transcript,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate feedback.");
      setFeedback(data.feedback);
      setShowFeedback(true);
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setScoring(false);
    }
  };

  if (showFeedback && feedback && scenario) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Results for: <span className="text-foreground font-semibold">{scenario.title}</span>
          </p>
          <button
            onClick={() => setShowFeedback(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to list
          </button>
        </div>
        <div className="p-4">
          <FeedbackReport
            feedback={feedback}
            scenario={scenario}
            onPracticeAgain={() => router.push("/practice")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      <div className="p-4 flex items-center justify-between gap-4">
        {/* Left: info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-primary/8 rounded-xl flex items-center justify-center flex-shrink-0">
            <ScenarioIcon name={scenario?.icon || "Briefcase"} className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{scenario?.title || session.scenario_id}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(session.started_at).toLocaleDateString("en-NG", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
              {session.message_count > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {session.message_count} exchange{session.message_count !== 1 ? "s" : ""}
                </span>
              )}
              {session.language && session.language !== "en" && (
                <span className="text-xs text-muted-foreground">
                  {langLabel[session.language] || session.language}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: score + status + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {score && (
            <div className="flex items-center gap-1 bg-primary/8 text-primary text-xs font-bold px-2.5 py-1 rounded-full border border-primary/20">
              <TrendingUp className="w-3 h-3" />
              {score}
            </div>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyle[session.status] || statusStyle.abandoned}`}>
            {session.status === "active" ? "In progress" : session.status}
          </span>
        </div>
      </div>

      {/* Action bar */}
      {(isResumable || canScore || hasResults) && (
        <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
          {hasResults && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFeedback(report);
                setShowFeedback(true);
              }}
              className="gap-1.5 text-xs"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              View Results
            </Button>
          )}
          {isResumable && scenario && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/practice/${session.id}?scenario=${session.scenario_id}&lang=${session.language || "en"}`)
              }
              className="gap-1.5 text-xs"
            >
              <Play className="w-3.5 h-3.5" />
              Resume
            </Button>
          )}
          {canScore && (
            <Button
              size="sm"
              onClick={getScore}
              disabled={scoring}
              className="gap-1.5 text-xs shadow-sm shadow-primary/20"
            >
              {scoring ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Scoring…</>
              ) : (
                <><BarChart3 className="w-3.5 h-3.5" />Get Score</>
              )}
            </Button>
          )}
          {scoreError && (
            <p className="text-xs text-destructive">{scoreError}</p>
          )}
        </div>
      )}
    </div>
  );
}
