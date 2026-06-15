"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Browsers (Chrome/Edge/Safari) only support speech recognition reliably for English.
// ha/yo/ig recognition codes exist in the spec but are not implemented in any major browser.
const STT_SUPPORTED_LANGS = new Set(["en"]);

// Web Speech API language codes by session language
const langCodeMap: Record<string, string> = {
  en: "en-NG",
  ha: "ha",
  yo: "yo",
  ig: "ig",
};

export interface UseVoiceInputOptions {
  language?: string;
  onTranscript?: (text: string) => void;
  autoSendDelay?: number; // ms of silence before auto-send; 0 = disabled
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  interimTranscript: string;
  isSupported: boolean;
  /** false for ha/yo/ig — browser speech recognition doesn't support these languages */
  hasLangSupport: boolean;
  startListening: () => void;
  stopListening: () => void;
}

export function useVoiceInput({
  language = "en",
  onTranscript,
  autoSendDelay = 0,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the user explicitly stopped — prevents auto-restart
  const stoppedByUserRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const hasLangSupport = STT_SUPPORTED_LANGS.has(language);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    stoppedByUserRef.current = true;
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    // Already running — don't spawn a second instance
    if (recognitionRef.current) return;

    stoppedByUserRef.current = false;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = langCodeMap[language] || "en-NG";
    recognition.interimResults = true;
    // continuous = true keeps the mic open after each utterance so the user
    // doesn't need to re-tap between sentences
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event: any) => {
      clearSilenceTimer();

      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) setInterimTranscript(interim);

      if (final) {
        setInterimTranscript("");
        onTranscript?.(final.trim());

        if (autoSendDelay > 0) {
          silenceTimerRef.current = setTimeout(() => {
            stopListening();
          }, autoSendDelay);
        }
      }
    };

    recognition.onerror = (event: any) => {
      // "no-speech" is a normal timeout — auto-restart if user hasn't stopped
      if (event.error === "no-speech") {
        recognitionRef.current = null;
        if (!stoppedByUserRef.current) {
          // Small delay before restarting to avoid a tight loop on some browsers
          setTimeout(() => startListening(), 200);
        }
        return;
      }
      stopListening();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      // If the browser ended recognition but the user hasn't tapped stop,
      // restart automatically so the mic stays open
      if (!stoppedByUserRef.current) {
        setTimeout(() => startListening(), 200);
      } else {
        setIsListening(false);
        setInterimTranscript("");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language, onTranscript, autoSendDelay, clearSilenceTimer, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppedByUserRef.current = true;
      clearSilenceTimer();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [clearSilenceTimer]);

  return { isListening, interimTranscript, isSupported, hasLangSupport, startListening, stopListening };
}
