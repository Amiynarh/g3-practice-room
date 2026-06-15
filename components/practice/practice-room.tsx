"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { type Scenario, MAX_TURNS_PER_SESSION } from "@/lib/scenarios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScenarioIcon } from "@/components/ui/scenario-icon";
import {
  Send, Loader2, StopCircle, ChevronDown, Lightbulb,
  Mic, MicOff, Volume2, VolumeX, User, SlidersHorizontal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { FeedbackReport } from "./feedback-report";
import { useVoiceInput } from "./hooks/use-voice-input";
import { useVoiceOutput, getAvailableVoices } from "./hooks/use-voice-output";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  sessionId: string;
  scenario: Scenario;
  language: string;
}

const langLabel: Record<string, string> = {
  en: "English",
  ha: "Hausa",
  yo: "Yoruba",
  ig: "Igbo",
};

// ─── Role initials for persona avatar ───────────────────────────────────────
function getRoleInitials(roleTitle: string): string {
  const skip = new Set(["your", "the", "a", "an"]);
  const words = roleTitle.split(" ").filter((w) => !skip.has(w.toLowerCase()));
  if (words.length === 0) return "AA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ─── Confidence heuristic ────────────────────────────────────────────────────
function calcConfidence(text: string): number {
  const lower = text.toLowerCase();
  let score = 55;

  const hedges = [
    "maybe", "perhaps", "i'm not sure", "not sure", "i think", "i guess",
    "sorry", "apologize", "unfortunately", "hopefully", "i don't know", "i hope",
  ];
  const power = [
    "i have", "i will", "i can", "i led", "i built", "i delivered",
    "my approach", "specifically", "absolutely", "definitely",
    "i achieved", "i accomplished", "i managed", "i drove",
  ];

  hedges.forEach((h) => { if (lower.includes(h)) score -= 9; });
  power.forEach((p) => { if (lower.includes(p)) score += 8; });

  const words = text.trim().split(/\s+/).length;
  if (words < 8) score -= 14;
  else if (words >= 20 && words <= 100) score += 10;
  else if (words > 160) score -= 6;

  return Math.max(10, Math.min(95, score));
}

// ─── Confidence ring (mini SVG) ──────────────────────────────────────────────
function ConfidenceRing({ score }: { score: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#16a34a" : score >= 45 ? "#f18805" : "#ef4444";

  return (
    <div className={`relative w-10 h-10 flex-shrink-0 ${score > 60 ? "conf-rising" : ""}`} title={`Confidence: ${score}%`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r}
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.4s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ─── Persona avatar ──────────────────────────────────────────────────────────
function PersonaAvatar({ initials, speaking }: { initials: string; speaking: boolean }) {
  return (
    <div
      className={[
        "w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 transition-all text-[10px] font-bold text-white",
        speaking ? "ring-2 ring-primary/50 ring-offset-1" : "",
      ].join(" ")}
    >
      {initials}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PracticeRoom({ sessionId, scenario, language }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openingLoading, setOpeningLoading] = useState(true);
  const [phase, setPhase] = useState<"intro" | "active" | "ending" | "feedback">("intro");
  const [feedback, setFeedback] = useState<any>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [error, setError] = useState("");
  const [tipsOpen, setTipsOpen] = useState(false);
  // Default speaker off for non-English sessions (no native TTS voices for ha/yo/ig)
  const [speakerOn, setSpeakerOn] = useState(language === "en");
  const [confidence, setConfidence] = useState(60);

  // Voice settings
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("ada_voice_name") || "";
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const voicePanelRef = useRef<HTMLDivElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking, hasNativeVoice } = useVoiceOutput(language, selectedVoiceName);

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
    inputRef.current?.focus();
  }, []);

  const { isListening, interimTranscript, isSupported: voiceInputSupported, hasLangSupport: sttLangSupported, startListening, stopListening } =
    useVoiceInput({ language, onTranscript: handleVoiceTranscript });

  const roleInitials = getRoleInitials(scenario.roleTitle);

  // Load available TTS voices (async on some browsers)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => setAvailableVoices(getAvailableVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  // Close voice panel when clicking outside
  useEffect(() => {
    if (!showVoicePanel) return;
    const handler = (e: MouseEvent) => {
      if (voicePanelRef.current && !voicePanelRef.current.contains(e.target as Node)) {
        setShowVoicePanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showVoicePanel]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    setOpeningLoading(true);

    // Check if this session already has messages (resuming)
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;

        const existing: Array<{ id: string; role: string; content: string }> = data.messages ?? [];
        if (existing.length > 0) {
          // Resuming an existing session — restore chat history
          setMessages(
            existing.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }))
          );
          setOpeningLoading(false);
          setPhase("active");
          return;
        }

        // Fresh session — generate opening message dynamically
        return fetch("/api/ai/practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, scenarioId: scenario.id, language, initialMessage: true }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (cancelled) return;
            const openingLine = d.message || scenario.openingLine[language] || scenario.openingLine.en;
            setMessages([{ id: "opening", role: "assistant", content: openingLine }]);
            setOpeningLoading(false);
            if (speakerOn) setTimeout(() => speak(openingLine), 600);
          });
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = scenario.openingLine[language] || scenario.openingLine.en;
        setMessages([{ id: "opening", role: "assistant", content: fallback }]);
        setOpeningLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, language]);

  const sendMessage = useCallback(async (messageOverride?: string) => {
    const text = (messageOverride ?? input).trim();
    if (!text || loading) return;
    if (messageOverride === undefined) setInput("");
    if (isListening) stopListening();
    if (isSpeaking) stopSpeaking();

    setConfidence(calcConfidence(text));

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError("");

    try {
      const history = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          scenarioId: scenario.id,
          language,
          conversationHistory: history,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (speakerOn) speak(data.message);

      const totalMessages = messagesRef.current.length + 2;
      if (totalMessages >= MAX_TURNS_PER_SESSION * 2) {
        setTimeout(() => setPhase("ending"), 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, scenario.id, language, isListening, stopListening, isSpeaking, stopSpeaking, speakerOn, speak]);

  const handleEndSession = () => { stopSpeaking(); stopListening(); setPhase("ending"); };

  const generateFeedback = async () => {
    stopSpeaking();
    setFeedbackLoading(true);
    setPhase("feedback");

    const transcript = messagesRef.current
      .filter((m) => m.id !== "opening")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, scenarioId: scenario.id, transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate feedback.");
      setFeedback(data.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate feedback.");
      setPhase("ending");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const toggleMic = () => { if (isListening) stopListening(); else startListening(); };
  const toggleSpeaker = () => { if (speakerOn) stopSpeaking(); setSpeakerOn((v) => !v); };

  const handleVoiceSelect = (name: string) => {
    setSelectedVoiceName(name);
    localStorage.setItem("ada_voice_name", name);
  };

  const turnCount = messages.filter((m) => m.role === "user").length;
  const turnsLeft = MAX_TURNS_PER_SESSION - turnCount;

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <ScenarioIcon name={scenario.icon} className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{scenario.title}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{scenario.description}</p>
            </div>
          </div>

          {/* Mission dossier — who you're talking to */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
              {roleInitials}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70 mb-0.5">
                You will be speaking with:
              </p>
              <p className="font-bold text-foreground">{scenario.roleTitle}</p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                {scenario.description}
              </p>
            </div>
          </div>

          <div className="bg-muted/60 rounded-xl p-5 space-y-2.5">
            <p className="text-sm font-semibold">Mission rules:</p>
            <ul className="space-y-2">
              {[
                <>Aunty Ada plays <strong>{scenario.roleTitle}</strong> — stay in character, respond as you would in real life.</>,
                language === "en"
                  ? <>Use the <Mic className="inline w-3.5 h-3.5 text-primary mx-0.5" /> mic button to speak your answers, or type them.</>
                  : <>Voice input isn&apos;t available in {langLabel[language]} — type your responses. Aunty Ada will reply in {langLabel[language]}.</>,
                <>When ready, click <strong>End Mission</strong> to get your score and feedback.</>,
                <>Practising in <strong>{langLabel[language] || "English"}</strong>{!hasNativeVoice && " · Voice playback uses an English voice"}</>,
              ].map((text, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2.5">
                  <span className="text-primary font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            size="lg"
            onClick={() => setPhase("active")}
            disabled={openingLoading}
            className="w-full sm:w-auto shadow-md shadow-primary/20 gap-2"
          >
            {openingLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Aunty Ada is getting ready…</>
            ) : (
              "Begin Mission"
            )}
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Feedback ───────────────────────────────────────────────────────────────
  if (phase === "feedback") {
    if (feedbackLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary"
          />
          <div className="text-center">
            <p className="font-semibold">Generating your results...</p>
            <p className="text-sm text-muted-foreground mt-1">Aunty Ada is scoring your performance. Won&apos;t be long.</p>
          </div>
        </div>
      );
    }
    if (feedback) {
      return <FeedbackReport feedback={feedback} scenario={scenario} onPracticeAgain={() => router.push("/practice")} />;
    }
  }

  // ── Ending ─────────────────────────────────────────────────────────────────
  if (phase === "ending") {
    return (
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-sm"
        >
          {/* Trophy animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
            className="text-5xl leading-none select-none"
          >
            🏆
          </motion.div>

          <div>
            <h2 className="text-xl font-bold">Mission complete!</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Ready to see your score?
            </p>
          </div>

          {/* Big exchange count reveal */}
          <div className="bg-muted/50 rounded-2xl py-5 px-8">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-extrabold text-primary leading-none"
            >
              {turnCount}
            </motion.p>
            <p className="text-sm text-muted-foreground mt-1.5">
              exchange{turnCount !== 1 ? "s" : ""} completed
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/8 border border-destructive/20 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => setPhase("active")}>Keep Practising</Button>
            <Button onClick={generateFeedback} disabled={feedbackLoading} className="shadow-md shadow-primary/20">
              {feedbackLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              See My Score
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Active ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
            {roleInitials}
          </div>
          <div>
            <h1 className="font-semibold text-sm sm:text-base leading-tight">{scenario.title}</h1>
            <p className="text-xs text-muted-foreground">
              Aunty Ada as: {scenario.roleTitle} &middot; {langLabel[language] || "English"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live confidence HUD */}
          {turnCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground hidden sm:inline">Confidence</span>
              <ConfidenceRing score={confidence} />
            </div>
          )}

          {/* Speaker + voice settings */}
          <div className="relative" ref={voicePanelRef}>
            <div className="flex items-center">
              <button
                onClick={toggleSpeaker}
                title={speakerOn ? "Mute Aunty Ada" : "Unmute Aunty Ada"}
                className={[
                  "w-8 h-8 rounded-l-lg flex items-center justify-center transition-colors border-r border-white/20",
                  speakerOn
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                ].join(" ")}
              >
                {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowVoicePanel((v) => !v)}
                title="Voice settings"
                className={[
                  "w-6 h-8 rounded-r-lg flex items-center justify-center transition-colors",
                  showVoicePanel
                    ? "bg-primary/20 text-primary"
                    : speakerOn
                      ? "bg-primary/10 text-primary/60 hover:bg-primary/20"
                      : "bg-muted text-muted-foreground/60 hover:bg-muted/80",
                ].join(" ")}
              >
                <SlidersHorizontal className="w-3 h-3" />
              </button>
            </div>

            {/* Voice settings panel */}
            {showVoicePanel && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-border rounded-xl shadow-xl z-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Voice Settings</p>

                {/* Speaker toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Read responses aloud</span>
                  <button
                    onClick={toggleSpeaker}
                    className={[
                      "w-10 h-5 rounded-full relative transition-colors",
                      speakerOn ? "bg-primary" : "bg-muted-foreground/30",
                    ].join(" ")}
                  >
                    <span className={[
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      speakerOn ? "translate-x-5" : "translate-x-0.5",
                    ].join(" ")} />
                  </button>
                </div>

                {/* Voice picker */}
                {language === "en" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">Aunty Ada&apos;s voice</label>
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => handleVoiceSelect(e.target.value)}
                      className="w-full text-xs border border-input rounded-lg px-2.5 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Auto (best match for your device)</option>
                      {availableVoices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} · {v.lang}
                          {v.localService ? "" : " ☁"}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      ☁ = online voice &nbsp;·&nbsp; Best quality voices: look for &ldquo;Premium&rdquo; or &ldquo;Enhanced&rdquo; on your device
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-1">
                    <p className="text-xs font-medium text-amber-800">Limited voice support</p>
                    <p className="text-xs text-amber-700">
                      Browsers don&apos;t have native {langLabel[language]} TTS voices yet. If enabled, Aunty Ada&apos;s voice will read {langLabel[language]} text using an English voice.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Badge variant={turnsLeft <= 5 ? "warning" : "outline"} className="text-xs hidden sm:flex">
            {turnsLeft} turns left
          </Badge>
          <Button variant="outline" size="sm" onClick={handleEndSession} className="text-xs gap-1">
            <StopCircle className="w-3 h-3" />
            End Mission
          </Button>
        </div>
      </div>

      {/* Tips accordion */}
      <div className="mb-3 flex-shrink-0">
        <button
          onClick={() => setTipsOpen((v) => !v)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Mission tips
          <ChevronDown className={["w-3.5 h-3.5 transition-transform", tipsOpen ? "rotate-180" : ""].join(" ")} />
        </button>
        <AnimatePresence>
          {tipsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 bg-muted/60 rounded-xl p-4 space-y-1.5">
                {scenario.tips.map((tip, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary font-bold flex-shrink-0">{i + 1}.</span>{tip}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <PersonaAvatar initials={roleInitials} speaking={isSpeaking} />
              )}
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0 ml-2 mt-0.5 order-last">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div
                className={[
                  "max-w-[75%] rounded-2xl px-4 py-2.5",
                  message.role === "user"
                    ? "bg-primary text-white rounded-br-md shadow-md shadow-primary/20 order-first"
                    : "bg-card border border-border rounded-bl-md shadow-sm",
                ].join(" ")}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <PersonaAvatar initials={roleInitials} speaking={false} />
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                {[0, 0.1, 0.2].map((delay) => (
                  <div
                    key={delay}
                    className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4 flex-shrink-0">
        {interimTranscript && (
          <p className="text-xs text-muted-foreground italic mb-2 px-1">&ldquo;{interimTranscript}&rdquo;</p>
        )}

        <div className="flex items-end gap-2">
          {voiceInputSupported && sttLangSupported && (
            <button
              onClick={toggleMic}
              disabled={loading}
              title={isListening ? "Stop recording" : "Speak your response"}
              className={[
                "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all border",
                isListening
                  ? "bg-destructive text-white border-destructive shadow-md shadow-destructive/30 animate-pulse"
                  : "border-border bg-white text-muted-foreground hover:bg-primary/8 hover:text-primary hover:border-primary/30",
                loading ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          {voiceInputSupported && !sttLangSupported && (
            <div
              title={`Voice input isn't available in ${langLabel[language] || language} — please type your response`}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border border-border bg-muted text-muted-foreground/40 cursor-not-allowed"
            >
              <MicOff className="w-4 h-4" />
            </div>
          )}

          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              voiceInputSupported && sttLangSupported
                ? "Type or tap the mic to speak... (Enter to send)"
                : "Type your response... (Enter to send, Shift+Enter for new line)"
            }
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm disabled:opacity-50 resize-none overflow-hidden leading-relaxed"
            style={{ minHeight: "44px" }}
          />

          <Button
            size="icon"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="rounded-full w-11 h-11 flex-shrink-0 shadow-md shadow-primary/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Aunty Ada &middot; G3Women
        </p>
      </div>
    </div>
  );
}
