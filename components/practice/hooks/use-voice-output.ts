"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Only English has reliable TTS voices in browsers — ha/yo/ig have no native voices
const NATIVE_TTS_LANGS = new Set(["en"]);

// For non-English sessions: fall back to the best English voice available
const langPrefixMap: Record<string, string[]> = {
  en: ["en-NG", "en-GB", "en-US", "en"],
  ha: ["en-NG", "en-GB", "en-US", "en"],
  yo: ["en-NG", "en-GB", "en-US", "en"],
  ig: ["en-NG", "en-GB", "en-US", "en"],
};

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  // Surface English voices first (the ones that work best for this product),
  // then all others so users can still pick anything available on their device
  const en = voices.filter((v) => v.lang.startsWith("en"));
  const rest = voices.filter((v) => !v.lang.startsWith("en"));
  return [...en, ...rest];
}

function pickVoice(language: string, preferredName?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();

  // Honor the user's explicit choice first
  if (preferredName) {
    const found = voices.find((v) => v.name === preferredName);
    if (found) return found;
  }

  const prefs = langPrefixMap[language] || ["en-NG", "en"];
  for (const pref of prefs) {
    const match = voices.find(
      (v) => v.lang === pref || v.lang.startsWith(pref.split("-")[0])
    );
    if (match) return match;
  }
  return voices[0] ?? null;
}

export interface UseVoiceOutputReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  /** false for ha/yo/ig — no native browser TTS voices exist for those languages */
  hasNativeVoice: boolean;
}

export function useVoiceOutput(language = "en", preferredVoiceName?: string): UseVoiceOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const hasNativeVoice = NATIVE_TTS_LANGS.has(language);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;
      stop();

      const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickVoice(language, preferredVoiceName);
        if (voice) utterance.voice = voice;
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => { setIsSpeaking(false); utteranceRef.current = null; };
        utterance.onerror = () => { setIsSpeaking(false); utteranceRef.current = null; };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          doSpeak();
        };
      } else {
        doSpeak();
      }
    },
    [isSupported, language, preferredVoiceName, stop]
  );

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, isSpeaking, isSupported, hasNativeVoice };
}
