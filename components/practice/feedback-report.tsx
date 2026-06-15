"use client";

import { useEffect, useState } from "react";
import { type Scenario } from "@/lib/scenarios";
import { Button } from "@/components/ui/button";
import { ScenarioIcon } from "@/components/ui/scenario-icon";
import {
  ArrowRight, CheckCircle, TrendingUp, Star,
  Lightbulb, RefreshCw, Trophy, Zap,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface FeedbackData {
  overall_score: number;
  confidence_score: number;
  clarity_score: number;
  relevance_score: number;
  summary: string;
  strengths: string[];
  areas_for_improvement: string[];
  key_moments: string[];
  tips: string[];
}

interface Props {
  feedback: FeedbackData;
  scenario: Scenario;
  onPracticeAgain: () => void;
}

function useCountUp(target: number, duration = 1200, delayMs = 300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const tid = setTimeout(() => {
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delayMs);
    return () => clearTimeout(tid);
  }, [target, duration, delayMs]);
  return value;
}

const RATING: Record<string, { label: string; color: string; bg: string; text: string; border: string }> = {
  excellent: { label: "EXCELLENT",    color: "#16a34a", bg: "bg-green-50",    text: "text-green-700",  border: "border-green-200" },
  good:      { label: "SOLID WORK",   color: "#290c4e", bg: "bg-primary/8",   text: "text-primary",    border: "border-primary/20" },
  developing:{ label: "KEEP GOING",   color: "#f18805", bg: "bg-amber-50",    text: "text-amber-700",  border: "border-amber-200" },
  practice:  { label: "TRAIN HARDER", color: "#ef4444", bg: "bg-red-50",      text: "text-red-700",    border: "border-red-200" },
};

function getRating(score: number) {
  if (score >= 80) return RATING.excellent;
  if (score >= 60) return RATING.good;
  if (score >= 40) return RATING.developing;
  return RATING.practice;
}

function AnimatedRing({
  score, label, color, delayMs = 400, large = false,
}: {
  score: number; label?: string; color: string; delayMs?: number; large?: boolean;
}) {
  const r = large ? 40 : 28;
  const circ = 2 * Math.PI * r;
  const cx = large ? 48 : 36;
  const sw = large ? 8 : 6;
  const vb = large ? "0 0 96 96" : "0 0 72 72";
  const target = (score / 100) * circ;
  const displayed = useCountUp(score, 1200, delayMs + 200);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={large ? "relative w-24 h-24" : "relative w-16 h-16"}>
        <svg className="w-full h-full -rotate-90" viewBox={vb}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-muted" />
          <circle
            cx={cx} cy={cx} r={r}
            fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={`${target} ${circ}`}
            strokeLinecap="round"
            className="ring-animate"
            style={{ "--ring-delay": `${delayMs}ms` } as React.CSSProperties}
          />
        </svg>
        <span
          className={[
            "absolute inset-0 flex items-center justify-center font-bold score-pop",
            large ? "text-2xl" : "text-sm",
          ].join(" ")}
          style={{ "--score-delay": `${delayMs + 400}ms` } as React.CSSProperties}
        >
          {displayed}
        </span>
      </div>
      {label && <span className="text-xs text-muted-foreground text-center">{label}</span>}
    </div>
  );
}

export function FeedbackReport({ feedback, scenario, onPracticeAgain }: Props) {
  const rating = getRating(feedback.overall_score);

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="text-center mb-8 space-y-2"
      >
        <div className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20 uppercase tracking-wider mb-2">
          <Trophy className="w-3.5 h-3.5" />
          Mission Results
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <ScenarioIcon name={scenario.icon} className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{scenario.title}</h1>
        </div>
      </motion.div>

      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="bg-white border-2 border-primary/20 rounded-2xl p-6 shadow-lg shadow-primary/8 mb-5"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Main score ring + badge */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <AnimatedRing score={feedback.overall_score} color={rating.color} delayMs={400} large />
            <span
              className={[
                "text-xs font-extrabold px-4 py-1.5 rounded-full border badge-unlock tracking-widest uppercase",
                rating.bg, rating.text, rating.border,
              ].join(" ")}
            >
              {rating.label}
            </span>
          </div>

          {/* Sub-score rings */}
          <div className="flex-1 space-y-4">
            <div className="flex gap-6 justify-center sm:justify-start flex-wrap">
              <AnimatedRing score={feedback.confidence_score} label="Confidence" color="#f18805" delayMs={650} />
              <AnimatedRing score={feedback.clarity_score}    label="Clarity"    color="#EF4E22" delayMs={800} />
              <AnimatedRing score={feedback.relevance_score}  label="Relevance"  color="#290c4e" delayMs={950} />
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-sm text-muted-foreground leading-relaxed"
            >
              {feedback.summary}
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Strengths + Improvements */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.65, duration: 0.4 }}
          className="bg-white border border-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-semibold text-sm">What you did well</h3>
          </div>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li
                key={i}
                className="text-sm flex gap-2 item-slide"
                style={{ "--item-delay": `${1.75 + i * 0.12}s` } as React.CSSProperties}
              >
                <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.75, duration: 0.4 }}
          className="bg-white border border-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Level up on</h3>
          </div>
          <ul className="space-y-2">
            {feedback.areas_for_improvement.map((a, i) => (
              <li
                key={i}
                className="text-sm flex gap-2 item-slide"
                style={{ "--item-delay": `${1.9 + i * 0.12}s` } as React.CSSProperties}
              >
                <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Key moments */}
      {feedback.key_moments?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.95, duration: 0.4 }}
          className="bg-white border border-border rounded-2xl p-5 shadow-sm mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-secondary" />
            </div>
            <h3 className="font-semibold text-sm">Key moments</h3>
          </div>
          <ul className="space-y-2">
            {feedback.key_moments.map((m, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex gap-2 item-slide"
                style={{ "--item-delay": `${2.05 + i * 0.1}s` } as React.CSSProperties}
              >
                <Star className="w-3.5 h-3.5 text-secondary mt-0.5 flex-shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Next mission prep */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.05, duration: 0.4 }}
        className="bg-primary/5 border border-primary/20 rounded-2xl p-5 shadow-sm mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Next mission prep</h3>
        </div>
        <ul className="space-y-2">
          {feedback.tips.map((tip, i) => (
            <li
              key={i}
              className="text-sm flex gap-2 item-slide"
              style={{ "--item-delay": `${2.15 + i * 0.12}s` } as React.CSSProperties}
            >
              <span className="text-primary font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
              {tip}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.25, duration: 0.4 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button onClick={onPracticeAgain} className="gap-2 shadow-md shadow-primary/20">
          <Zap className="w-4 h-4" />
          Accept Another Mission
        </Button>
        <Link href="/history">
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            View History
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
