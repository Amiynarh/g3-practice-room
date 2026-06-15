"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Scenario } from "@/lib/scenarios";
import { type SessionBrief, type UserProfile } from "@/app/api/ai/brief/route";
import { ScenarioIcon } from "@/components/ui/scenario-icon";
import { Button } from "@/components/ui/button";
import {
  Loader2, X, Building2, ChevronRight, Sparkles,
} from "lucide-react";

// ─── Scenario-specific question configs ───────────────────────────────────────

interface FieldConfig {
  key: string;
  label: string;
  placeholder?: string;
  type: "text" | "chips";
  required?: boolean;
  options?: { value: string; label: string }[];
}

const EXP_OPTIONS = [
  { value: "0-1", label: "0–1 yrs" },
  { value: "1-3", label: "1–3 yrs" },
  { value: "3-5", label: "3–5 yrs" },
  { value: "5+",  label: "5+ yrs" },
];

const ROLE_IN_ROLE_OPTIONS = [
  { value: "<6m",  label: "< 6 months" },
  { value: "6m-1y",label: "6–12 months" },
  { value: "1-2y", label: "1–2 years" },
  { value: "2y+",  label: "2+ years" },
];

const SPEC_OPTIONS = [
  { value: "frontend",  label: "Frontend" },
  { value: "backend",   label: "Backend" },
  { value: "data",      label: "Data / ML" },
  { value: "product",   label: "Product" },
  { value: "devops",    label: "DevOps / Cloud" },
  { value: "mobile",    label: "Mobile" },
  { value: "design",    label: "Design / UX" },
  { value: "fullstack", label: "Full-Stack" },
];

const SCENARIO_FIELDS: Record<string, FieldConfig[]> = {
  tech_interview: [
    { key: "currentRole", label: "Your current role", placeholder: "e.g. Frontend Developer", type: "text", required: true },
    { key: "yearsExp", label: "Years of experience", type: "chips", options: EXP_OPTIONS, required: true },
    { key: "targetLevel", label: "Role you're targeting", placeholder: "e.g. Senior Frontend Developer at a fintech", type: "text", required: true },
    { key: "specialization", label: "Specialization (optional)", type: "chips", options: SPEC_OPTIONS },
  ],
  salary_negotiation: [
    { key: "currentRole", label: "Your role & company", placeholder: "e.g. Software Engineer at Andela", type: "text", required: true },
    { key: "timeInRole", label: "Time in this role", type: "chips", options: ROLE_IN_ROLE_OPTIONS, required: true },
    { key: "targetSalary", label: "Target salary / range", placeholder: "e.g. ₦700k–₦900k/month", type: "text", required: true },
    { key: "achievement", label: "Your strongest achievement to mention (optional)", placeholder: "e.g. Led migration that cut costs by 30%", type: "text" },
  ],
  client_pitch: [
    { key: "product", label: "What you're pitching", placeholder: "e.g. Payroll automation software for SMEs", type: "text", required: true },
    { key: "clientType", label: "Type of client you're pitching to", placeholder: "e.g. Lagos-based mid-size manufacturing company", type: "text", required: true },
    { key: "pricePoint", label: "Rough price point (optional)", placeholder: "e.g. ₦150k/month subscription", type: "text" },
    { key: "mainBenefit", label: "Strongest selling point (optional)", placeholder: "e.g. Saves finance team 15 hrs/week", type: "text" },
  ],
  promotion: [
    { key: "currentTitle", label: "Your current title", placeholder: "e.g. Software Engineer II", type: "text", required: true },
    { key: "targetTitle", label: "Title you're asking for", placeholder: "e.g. Senior Software Engineer", type: "text", required: true },
    { key: "timeInRole", label: "Time in current role", type: "chips", options: ROLE_IN_ROLE_OPTIONS, required: true },
    { key: "topAchievement", label: "Strongest case for the promotion (optional)", placeholder: "e.g. Delivered the payments API used by 50k+ users", type: "text" },
  ],
  networking: [
    { key: "currentRole", label: "What you do", placeholder: "e.g. Mobile Developer, 2 years at Flutterwave", type: "text", required: true },
    { key: "goal", label: "What you want from this conversation", placeholder: "e.g. Advice on moving into product, a referral, insights on their company", type: "text", required: true },
  ],
  difficult_conversation: [
    { key: "situation", label: "What the conversation is about", placeholder: "e.g. A colleague taking credit for my work in front of the team", type: "text", required: true },
    { key: "relationship", label: "Your relationship with them", placeholder: "e.g. Peer at the same level / my direct manager", type: "text", required: true },
    { key: "desiredOutcome", label: "What you want to happen (optional)", placeholder: "e.g. Public acknowledgment in the next team meeting", type: "text" },
  ],
};

function getFields(scenarioId: string): FieldConfig[] {
  return SCENARIO_FIELDS[scenarioId] ?? [
    { key: "context", label: "Tell Ada a bit about your situation", placeholder: "e.g. Your role, what you're working on, what you want to practise", type: "text", required: true },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  scenario: Scenario;
  language: string;
  onConfirm: (userProfile: UserProfile, sessionBrief: SessionBrief) => void;
  onClose: () => void;
}

export function SessionSetup({ scenario, language, onConfirm, onClose }: Props) {
  const fields = getFields(scenario.id);
  const initialProfile = Object.fromEntries(fields.map((f) => [f.key, ""]));

  const [step, setStep] = useState<"profile" | "brief">("profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brief, setBrief] = useState<SessionBrief | null>(null);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const requiredFields = fields.filter((f) => f.required);
  const allRequiredFilled = requiredFields.every((f) => profile[f.key]?.trim());

  const handleGenerateBrief = async () => {
    if (!allRequiredFilled) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id, userProfile: profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate brief.");
      setBrief(data.brief);
      setStep("brief");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (brief) onConfirm(profile, brief);
  };

  const setField = (key: string, value: string) =>
    setProfile((p) => ({ ...p, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22, ease: "easeOut" as const }}
        className="relative bg-white border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <ScenarioIcon name={scenario.icon} className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">{scenario.title}</h2>
              <p className="text-xs text-muted-foreground">
                {step === "profile" ? "Mission briefing" : "Your briefing card"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Profile ── */}
          {step === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-6 space-y-5"
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tell Ada about your situation so the session feels real and relevant to where you actually are.
              </p>

              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {field.label}
                  </label>

                  {field.type === "text" && (
                    <input
                      type="text"
                      value={profile[field.key] || ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                    />
                  )}

                  {field.type === "chips" && field.options && (
                    <div className="flex flex-wrap gap-2">
                      {field.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setField(
                              field.key,
                              profile[field.key] === opt.value ? "" : opt.value
                            )
                          }
                          className={[
                            "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all",
                            profile[field.key] === opt.value
                              ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-white",
                          ].join(" ")}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {error && (
                <div className="text-sm text-destructive bg-destructive/8 border border-destructive/20 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerateBrief}
                disabled={loading || !allRequiredFilled}
                className="w-full gap-2"
                size="lg"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Ada is building your brief...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Generate my briefing</>
                )}
              </Button>
            </motion.div>
          )}

          {/* ── Step 2: Brief ── */}
          {step === "brief" && brief && (
            <motion.div
              key="brief"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-6 space-y-4"
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                Read this before you start. Ada knows all of it — stay in character.
              </p>

              {/* Company */}
              <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">{brief.companyName}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {brief.companyDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Role + Who */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 border border-border rounded-xl p-3.5">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">
                    {scenario.id === "client_pitch" ? "You are pitching" : "Role in focus"}
                  </p>
                  <p className="font-semibold text-sm text-foreground leading-snug">{brief.roleTitle}</p>
                  {brief.roleLevel && (
                    <p className="text-xs text-muted-foreground mt-0.5">{brief.roleLevel}</p>
                  )}
                </div>
                <div className="bg-muted/40 border border-border rounded-xl p-3.5">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">You&apos;ll speak with</p>
                  <p className="font-semibold text-sm text-foreground leading-snug">{brief.interviewerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{brief.interviewerTitle}</p>
                </div>
              </div>

              {/* Context */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1.5">Context</p>
                <p className="text-sm text-foreground leading-relaxed">{brief.interviewContext}</p>
              </div>

              {/* Focus areas */}
              {brief.keyFocusAreas?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">
                    Expect focus on
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.keyFocusAreas.map((area) => (
                      <span
                        key={area}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setStep("profile")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  ← Edit
                </button>
                <Button onClick={handleStart} className="flex-1 gap-2" size="lg">
                  Accept mission
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
