import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SCENARIOS } from "@/lib/scenarios";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Target, TrendingUp, Zap } from "lucide-react";
import { SessionCard } from "@/components/history/session-card";

async function getSessions(userId: string) {
  const { data } = await supabaseAdmin
    .from("practice_sessions")
    .select(`
      id, scenario_id, language, status, message_count, started_at, completed_at,
      feedback_reports ( overall_score, confidence_score, clarity_score, relevance_score, summary, strengths, areas_for_improvement, key_moments, tips )
    `)
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(50);

  return data || [];
}

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const sessions = await getSessions(session.user.id);
  const completed = sessions.filter((s) => s.status === "completed");
  const inProgress = sessions.filter((s) => s.status === "active" && (s.message_count ?? 0) > 0);

  const scoredSessions = completed.filter((s) => {
    const report = (s.feedback_reports as any)?.[0] || s.feedback_reports;
    return report?.overall_score;
  });
  const avgScore = scoredSessions.length > 0
    ? Math.round(
        scoredSessions.reduce((sum, s) => {
          const report = (s.feedback_reports as any)?.[0] || s.feedback_reports;
          return sum + (report?.overall_score || 0);
        }, 0) / scoredSessions.length
      )
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Session History</h1>
        <p className="text-muted-foreground mt-1">Every session you&apos;ve started — resume, score, or review.</p>
      </div>

      {/* Stats */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold">{sessions.length}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Total sessions
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold">{completed.length}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Completed
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold text-amber-600">{inProgress.length}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> In progress
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className={`text-2xl font-bold ${avgScore ? "text-primary" : "text-muted-foreground"}`}>
              {avgScore ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Avg score
            </p>
          </div>
        </div>
      )}

      {/* In-progress sessions */}
      {inProgress.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            In progress — resume or score these
          </h2>
          <div className="space-y-3">
            {inProgress.map((s) => (
              <SessionCard
                key={s.id}
                session={s as any}
                scenario={SCENARIOS[s.scenario_id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* All sessions */}
      {sessions.length === 0 ? (
        <div className="text-center py-16 space-y-4 bg-card border border-border rounded-2xl">
          <div className="text-4xl select-none">🎯</div>
          <h2 className="text-lg font-semibold">No sessions yet</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Start your first practice session to see your history here.
          </p>
          <Link href="/practice">
            <Button>Start Practising</Button>
          </Link>
        </div>
      ) : (
        <div>
          {inProgress.length > 0 && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              All sessions
            </h2>
          )}
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s as any}
                scenario={SCENARIOS[s.scenario_id]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
