"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { type Scenario } from "@/lib/scenarios";
import { type UserProfile, type SessionBrief } from "@/app/api/ai/brief/route";
import { Button } from "@/components/ui/button";
import { ScenarioIcon } from "@/components/ui/scenario-icon";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SessionSetup } from "./session-setup";
import { Loader2, Clock, Lock } from "lucide-react";

const languages = [
  { code: "en", label: "English" },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yoruba" },
  { code: "ig", label: "Igbo" },
];

const levelLabel: Record<string, string> = {
  beginner: "Level 1",
  intermediate: "Level 2",
  advanced: "Level 3",
};

const levelColor: Record<string, string> = {
  beginner: "bg-green-50 text-green-700 border-green-200",
  intermediate: "bg-primary/8 text-primary border-primary/20",
  advanced: "bg-amber-50 text-amber-700 border-amber-200",
};

interface Props {
  scenarios: Scenario[];
}

export function ScenarioGrid({ scenarios }: Props) {
  const router = useRouter();
  // dialogScenario: controls which scenario the dialog shows
  // sessionScenario: preserved after dialog closes so setup modal can use it
  const [dialogScenario, setDialogScenario] = useState<Scenario | null>(null);
  const [sessionScenario, setSessionScenario] = useState<Scenario | null>(null);
  const [language, setLanguage] = useState("en");
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSetupConfirm = async (userProfile: UserProfile, sessionBrief: SessionBrief) => {
    if (!sessionScenario) return;
    setShowSetup(false);
    setLoading(true);
    setError("");

    const res = await fetch("/api/sessions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId: sessionScenario.id,
        language,
        userProfile,
        sessionBrief,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not start session.");
      setLoading(false);
      return;
    }

    router.push(`/practice/${data.sessionId}?scenario=${sessionScenario.id}&lang=${language}`);
  };

  const closeDialog = () => {
    if (!loading) {
      setDialogScenario(null);
      setError("");
    }
  };

  const handleAcceptMission = () => {
    // Save scenario, close dialog first so z-indices don't conflict, then open setup
    setSessionScenario(dialogScenario);
    setDialogScenario(null);
    setShowSetup(true);
  };

  // Full-screen loading overlay while session is being created and router navigates
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary"
        />
        <div className="text-center">
          <p className="font-semibold text-foreground">Setting up your mission…</p>
          <p className="text-sm text-muted-foreground mt-1">Aunty Ada is getting ready</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mission cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scenario, i) => {
          const isSelected = dialogScenario?.id === scenario.id;
          const isLocked = scenario.proOnly;

          return (
            <motion.button
              key={scenario.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" as const }}
              onClick={() => !isLocked && setDialogScenario(scenario)}
              className={[
                "text-left rounded-xl border-2 transition-all w-full cursor-pointer mission-card",
                isSelected
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/15"
                  : isLocked
                  ? "border-border bg-muted/40 opacity-60 cursor-not-allowed"
                  : "border-border bg-white hover:border-primary/40 hover:shadow-sm",
              ].join(" ")}
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div
                    className={[
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary/15" : "bg-primary/8",
                    ].join(" ")}
                  >
                    <ScenarioIcon
                      name={scenario.icon}
                      className={["w-5 h-5 transition-colors", isSelected ? "text-primary" : "text-primary/70"].join(" ")}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${levelColor[scenario.difficulty]}`}>
                      {levelLabel[scenario.difficulty]}
                    </span>
                    {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </div>

                <h3 className={["font-semibold text-base leading-snug", isSelected ? "text-primary" : "text-foreground"].join(" ")}>
                  {scenario.title}
                </h3>

                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {scenario.description}
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {scenario.durationMin}–{scenario.durationMax} min
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Mission launch Dialog */}
      <Dialog open={!!dialogScenario} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg" title={dialogScenario?.title ?? "Mission details"}>
          {dialogScenario && (
            <div className="p-6 space-y-5">
              {/* Scenario header */}
              <div className="flex items-start gap-3 pr-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ScenarioIcon name={dialogScenario.icon} className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-lg leading-tight">{dialogScenario.title}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${levelColor[dialogScenario.difficulty]}`}>
                      {levelLabel[dialogScenario.difficulty]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{dialogScenario.description}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {dialogScenario.durationMin}–{dialogScenario.durationMax} min
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-muted/60 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
                  Mission tips
                </p>
                <ul className="space-y-2">
                  {dialogScenario.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Language selector */}
              <div>
                <p className="text-sm font-medium mb-2.5">Practice language:</p>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={[
                        "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                        language === lang.code
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      ].join(" ")}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/8 border border-destructive/20 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* CTA */}
              <Button
                onClick={handleAcceptMission}
                disabled={loading}
                size="lg"
                className="w-full gap-2 shadow-md shadow-primary/20"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Starting mission...</>
                ) : (
                  "Accept mission →"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session setup modal */}
      <AnimatePresence>
        {showSetup && sessionScenario && (
          <SessionSetup
            scenario={sessionScenario}
            language={language}
            onConfirm={handleSetupConfirm}
            onClose={() => setShowSetup(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
