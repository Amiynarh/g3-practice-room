import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScenarioIcon } from "@/components/ui/scenario-icon";
import {
  ArrowRight, BookOpen, Target, Calendar,
  MessageSquare, Zap, Trophy, Star,
} from "lucide-react";
import { SCENARIOS } from "@/lib/scenarios";

// ── Level system ────────────────────────────────────────────────────────────

const LEVELS = [
  { rank: 1, name: "Practitioner",    emoji: "🎯", min: 0,    max: 99   },
  { rank: 2, name: "Practitioner II", emoji: "🎯", min: 100,  max: 249  },
  { rank: 3, name: "Negotiator",      emoji: "⚔️",  min: 250,  max: 499  },
  { rank: 4, name: "Expert",          emoji: "🌟", min: 500,  max: 999  },
  { rank: 5, name: "Master",          emoji: "👑", min: 1000, max: Infinity },
];

function getLevel(xp: number) {
  const level = LEVELS.find((l) => xp >= l.min && xp <= l.max) ?? LEVELS[0];
  const next  = LEVELS.find((l) => l.rank === level.rank + 1);
  const pct   = next
    ? Math.round(((xp - level.min) / (next.min - level.min)) * 100)
    : 100;
  return { ...level, pct, xpToNext: next ? next.min - xp : 0, nextName: next?.name };
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const days = [
    ...new Set(dates.map((d) => new Date(d).toDateString())),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  if (days[0] !== today && days[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = new Date(days[i - 1]).getTime() - new Date(days[i]).getTime();
    if (Math.round(diff / 86_400_000) === 1) streak++;
    else break;
  }
  return streak;
}

// ── Data fetching ────────────────────────────────────────────────────────────

async function getDashboardData(userId: string) {
  const [profileRes, sessionsRes, feedbackRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("name, sessions_this_month").eq("id", userId).single(),
    supabaseAdmin.from("practice_sessions")
      .select("id, scenario_id, status, started_at, message_count")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(30),
    supabaseAdmin.from("feedback_reports").select("overall_score").eq("user_id", userId),
  ]);

  const sessions  = sessionsRes.data  ?? [];
  const feedbacks = feedbackRes.data  ?? [];
  const totalXP   = feedbacks.reduce((sum, f) => sum + (f.overall_score ?? 0), 0);
  const streak    = calcStreak(sessions.map((s) => s.started_at));

  return {
    profile:          profileRes.data,
    recentSessions:   sessions.slice(0, 3),
    hasAnySessions:   sessions.length > 0,
    completedCount:   sessions.filter((s) => s.status === "completed").length,
    totalXP,
    streak,
  };
}

const levelLabel: Record<string, string> = {
  beginner:     "Level 1",
  intermediate: "Level 2",
  advanced:     "Level 3",
};
const levelColor: Record<string, string> = {
  beginner:     "bg-green-50 text-green-700",
  intermediate: "bg-primary/8 text-primary",
  advanced:     "bg-amber-50 text-amber-700",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { profile, recentSessions, hasAnySessions, completedCount, totalXP, streak } =
    await getDashboardData(session.user.id);

  const firstName = profile?.name?.split(" ")[0] || session.user?.name?.split(" ")[0] || "there";
  const level = getLevel(totalXP);
  const featuredScenarios = Object.values(SCENARIOS).slice(0, 3);
  const beginnerScenarios = Object.values(SCENARIOS).filter((s) => s.difficulty === "beginner").slice(0, 2);

  // Contextual sub-copy
  const subCopy = completedCount === 0
    ? `Your first mission is waiting, ${firstName}. Accept it.`
    : streak > 0
    ? `${firstName}, you're on a ${streak}-day streak. Don't break it.`
    : `Ready for your next mission, ${firstName}?`;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">{subCopy}</p>
        </div>
        {streak > 0 && (
          <div className="flex flex-col items-center bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-2.5 flex-shrink-0">
            <span className="flicker text-2xl leading-none">🔥</span>
            <span className="text-lg font-extrabold text-secondary leading-tight">{streak}</span>
            <span className="text-[10px] text-secondary/80 font-medium uppercase tracking-wide">
              day streak
            </span>
          </div>
        )}
      </div>

      {/* Level + XP card */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl leading-none">
              {level.emoji}
            </div>
            <div>
              <p className="text-xl font-extrabold text-foreground leading-tight">
                {level.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {level.rank < 5
                  ? `Only ${level.xpToNext} XP until you become a ${level.nextName} →`
                  : "Max rank achieved 👑"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/10 text-secondary text-sm font-bold px-3 py-1 rounded-full border border-secondary/20 flex-shrink-0">
            <Zap className="w-3.5 h-3.5" />
            {totalXP} XP
          </div>
        </div>

        {/* Animated XP bar */}
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className="xp-bar-fill bg-primary rounded-full h-full"
            style={{ "--xp-pct": `${level.pct}%` } as React.CSSProperties}
          />
        </div>

        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-muted-foreground">Level {level.rank}</span>
          {level.rank < 5 && (
            <span className="text-xs text-muted-foreground">Level {level.rank + 1}</span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Missions done</p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalXP}</p>
            <p className="text-xs text-muted-foreground">Total XP earned</p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{Object.values(SCENARIOS).length}</p>
            <p className="text-xs text-muted-foreground">Missions to unlock</p>
          </div>
        </div>
      </div>

      {/* Quick start */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Accept a mission</h2>
          <Link
            href="/practice"
            className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
          >
            All missions <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {featuredScenarios.map((scenario) => (
            <Link key={scenario.id} href="/practice">
              <div className="group bg-white border border-border rounded-xl p-5 space-y-3 mission-card hover:border-primary/40 cursor-pointer h-full relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <ScenarioIcon name={scenario.icon} className="w-5 h-5 text-primary" />
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${levelColor[scenario.difficulty]}`}>
                    {levelLabel[scenario.difficulty]}
                  </span>
                </div>
                <h3 className="font-semibold text-sm leading-snug">{scenario.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {scenario.description}
                </p>
                <p className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  → Accept
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent missions</h2>
            <Link
              href="/history"
              className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentSessions.map((s) => {
              const scenario = SCENARIOS[s.scenario_id];
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-white hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/8 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ScenarioIcon name={scenario?.icon || "Briefcase"} className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{scenario?.title || s.scenario_id}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(s.started_at).toLocaleDateString("en-NG", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {s.message_count} exchanges
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={[
                      "text-xs font-semibold px-2.5 py-1 rounded-full border",
                      s.status === "completed"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : s.status === "active"
                        ? "bg-primary/8 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border",
                    ].join(" ")}
                  >
                    {s.status === "completed" ? "Done" : s.status === "active" ? "Active" : "Abandoned"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnySessions && (
        <div className="space-y-4">
          <div className="text-center py-10 bg-muted/40 rounded-2xl border border-border">
            <div className="text-4xl mb-3 select-none">🎯</div>
            <h3 className="font-bold text-lg mb-2">Aunty Ada is ready</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Accept your first mission and start building the skills that change how you work.
            </p>
          </div>

          {/* Quick-pick beginner missions */}
          <div className="grid sm:grid-cols-2 gap-4">
            {beginnerScenarios.map((scenario) => (
              <Link key={scenario.id} href="/practice">
                <div className="group bg-white border-2 border-border hover:border-primary/50 rounded-xl p-5 space-y-2 cursor-pointer transition-all hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                      <ScenarioIcon name={scenario.icon} className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{scenario.title}</p>
                      <span className="text-xs font-medium text-green-700">Level 1 · Beginner</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {scenario.description}
                  </p>
                  <p className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    → Accept this mission
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
