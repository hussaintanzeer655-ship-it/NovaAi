// Speech utilities for Urdu, Hindi + English text-to-speech and speech-to-text

export type LanguageMode = "en" | "ur" | "hi";

export function getLangCode(mode: LanguageMode): string {
  switch (mode) {
    case "ur": return "ur-PK";
    case "hi": return "hi-IN";
    default: return "en-US";
  }
}

export function isRtlMode(mode: LanguageMode): boolean {
  return mode === "ur";
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

function getSpeechRecognitionConstructor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onStart?: () => void;
  onError?: (err: string) => void;
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSynthesisSupported()) {
    opts.onError?.("Speech synthesis not supported in this browser");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip markdown for cleaner speech
  const cleanText = text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[*#`>_~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Detect language: Urdu and Hindi Unicode ranges
  const isUrdu = /[\u0600-\u06FF]/.test(text);
  const isHindi = /[\u0900-\u097F]/.test(text);
  const detected = isUrdu ? "ur-PK" : isHindi ? "hi-IN" : "en-US";
  utterance.lang = opts.lang || detected;
  utterance.rate = opts.rate ?? 0.9;
  utterance.pitch = opts.pitch ?? 1;

  // Try to find a matching voice
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const langPrefix = utterance.lang.split("-")[0];
    const match =
      voices.find((v) => v.lang === utterance.lang) ||
      voices.find((v) => v.lang.startsWith(langPrefix));
    if (match) utterance.voice = match;
  }

  utterance.onend = () => {
    currentUtterance = null;
    opts.onEnd?.();
  };
  utterance.onstart = () => {
    opts.onStart?.();
  };
  utterance.onerror = (e) => {
    currentUtterance = null;
    opts.onError?.(e.error || "Speech error");
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking(): boolean {
  return isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
}

export interface ListenOptions {
  lang?: string;
  onResult?: (text: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

export class SpeechRecognizer {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    const ctor = getSpeechRecognitionConstructor();
    if (ctor) {
      this.recognition = new ctor();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  start(lang: string, opts: ListenOptions = {}, continuous: boolean = false): void {
    if (!this.recognition || this.isListening) return;

    this.recognition.lang = lang;
    this.recognition.continuous = continuous;
    this.recognition.interimResults = true;
    this.recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        opts.onResult?.(final, true);
      } else if (interim) {
        opts.onResult?.(interim, false);
      }
    };
    this.recognition.onend = () => {
      this.isListening = false;
      opts.onEnd?.();
    };
    this.recognition.onerror = (e: any) => {
      this.isListening = false;
      opts.onError?.(e.error || "Recognition error");
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (err) {
      opts.onError?.(String(err));
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isListening = false;
    }
  }

  get active(): boolean {
    return this.isListening;
  }
}
