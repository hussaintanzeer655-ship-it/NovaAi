import { useState, useRef, useEffect, useCallback } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Bot,
  Loader2,
  Globe,
  AudioLines,
} from "lucide-react";
import { sendToAi } from "@/lib/api";
import {
  SpeechRecognizer,
  speak,
  stopSpeaking,
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
} from "@/lib/speech";

interface LiveCallProps {
  onEnd: () => void;
  urduMode: boolean;
  onToggleUrdu: () => void;
}

type CallPhase = "listening" | "thinking" | "speaking" | "idle";

interface CallTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export default function LiveCall({ onEnd, urduMode, onToggleUrdu }: LiveCallProps) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [muted, setMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [turns, setTurns] = useState<CallTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const mutedRef = useRef(false);
  const urduRef = useRef(urduMode);
  const activeRef = useRef(true);
  const phaseRef = useRef<CallPhase>("idle");
  const conversationRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const currentChatIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnsEndRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { urduRef.current = urduMode; }, [urduMode]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Call timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (activeRef.current) setCallDuration((d) => d + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, liveTranscript]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const startListening = useCallback(() => {
    if (!activeRef.current) return;
    const recognizer = recognizerRef.current;
    if (!recognizer || !recognizer.isSupported()) return;
    if (mutedRef.current) {
      setPhase("idle");
      return;
    }

    setPhase("listening");
    setLiveTranscript("");
    const lang = urduRef.current ? "ur-PK" : "en-US";

    recognizer.start(lang, {
      onResult: (text, isFinal) => {
        if (isFinal && text.trim()) {
          setLiveTranscript("");
          handleUserSpeech(text.trim());
        } else {
          setLiveTranscript(text);
        }
      },
      onEnd: () => {
        // If we were listening and nothing was said, go back to listening
        if (phaseRef.current === "listening" && activeRef.current && !mutedRef.current) {
          // Restart listening after a short pause
          setTimeout(() => {
            if (activeRef.current && phaseRef.current === "listening" && !mutedRef.current) {
              startListening();
            }
          }, 300);
        }
      },
      onError: (err) => {
        if (!activeRef.current) return;
        setError(`Voice error: ${err}`);
        setPhase("idle");
      },
    }, true); // continuous mode
  }, []);

  const handleUserSpeech = useCallback(async (text: string) => {
    if (!activeRef.current) return;
    stopSpeaking();

    const userTurn: CallTurn = { id: `u-${Date.now()}`, role: "user", text };
    setTurns((prev) => [...prev, userTurn]);

    const apiMessages = [...conversationRef.current, { role: "user" as const, content: text }];
    conversationRef.current = apiMessages;

    setPhase("thinking");
    setLiveTranscript("");

    try {
      const result = await sendToAi(apiMessages, currentChatIdRef.current || undefined);
      if (!activeRef.current) return;

      if (!currentChatIdRef.current && result.chatId) {
        currentChatIdRef.current = result.chatId;
      }

      const assistantTurn: CallTurn = { id: `a-${Date.now()}`, role: "assistant", text: result.response };
      setTurns((prev) => [...prev, assistantTurn]);
      conversationRef.current = [...conversationRef.current, { role: "assistant", content: result.response }];

      // Speak the response
      setPhase("speaking");
      speak(result.response, {
        lang: urduRef.current ? "ur-PK" : "en-US",
        rate: 0.95,
        onEnd: () => {
          if (!activeRef.current) return;
          // Go back to listening after speaking
          setTimeout(() => {
            if (activeRef.current && !mutedRef.current) {
              startListening();
            } else {
              setPhase("idle");
            }
          }, 500);
        },
        onError: () => {
          if (!activeRef.current) return;
          setPhase("idle");
        },
      });
    } catch (err) {
      if (!activeRef.current) return;
      const errMsg = err instanceof Error ? err.message : "Connection error";
      setError(errMsg);
      setPhase("idle");
    }
  }, [startListening]);

  // Initialize and start call
  useEffect(() => {
    activeRef.current = true;
    recognizerRef.current = new SpeechRecognizer();

    if (!isSpeechRecognitionSupported()) {
      setError("Voice recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (!isSpeechSynthesisSupported()) {
      setError("Speech output is not supported in this browser.");
      return;
    }

    // Greeting
    const greeting = urduRef.current
      ? "السلام علیکم! میں Nova AI ہوں۔ آپ کسی بھی موضوع پر بات کر سکتے ہیں۔ بتائیے، کیسے مدد کروں؟"
      : "Hello! I'm Nova AI. You can talk to me about anything. How can I help you today?";

    const greetingTurn: CallTurn = { id: `a-greet-${Date.now()}`, role: "assistant", text: greeting };
    setTurns([greetingTurn]);

    setPhase("speaking");
    speak(greeting, {
      lang: urduRef.current ? "ur-PK" : "en-US",
      rate: 0.95,
      onEnd: () => {
        if (activeRef.current && !mutedRef.current) {
          startListening();
        }
      },
      onError: () => {
        if (activeRef.current) {
          startListening();
        }
      },
    });

    return () => {
      activeRef.current = false;
      stopSpeaking();
      recognizerRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndCall = () => {
    activeRef.current = false;
    stopSpeaking();
    recognizerRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    onEnd();
  };

  const handleToggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (newMuted) {
      recognizerRef.current?.stop();
      setPhase("idle");
      setLiveTranscript("");
    } else {
      // Resume listening if we're not speaking or thinking
      const current = phaseRef.current;
      if (current === "idle" || current === "listening") {
        setTimeout(() => startListening(), 200);
      }
    }
  };

  const phaseConfig: Record<CallPhase, { label: string; color: string; ring: string }> = {
    idle: {
      label: urduMode ? "تروس رہا ہے..." : "Tap to speak...",
      color: "bg-slate-500",
      ring: "",
    },
    listening: {
      label: urduMode ? "سن رہا ہوں..." : "Listening...",
      color: "bg-emerald-500",
      ring: "ring-4 ring-emerald-500/30 animate-pulse",
    },
    thinking: {
      label: urduMode ? "سوچ رہا ہوں..." : "Thinking...",
      color: "bg-amber-500",
      ring: "ring-4 ring-amber-500/30",
    },
    speaking: {
      label: urduMode ? "بول رہا ہوں..." : "Speaking...",
      color: "bg-cyan-500",
      ring: "ring-4 ring-cyan-500/30 animate-pulse",
    },
  };

  const currentPhase = phaseConfig[phase];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 transition-colors duration-1000 ${
          phase === "listening" ? "bg-emerald-500" :
          phase === "thinking" ? "bg-amber-500" :
          phase === "speaking" ? "bg-cyan-500" : "bg-blue-500"
        }`} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Nova AI</h2>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${currentPhase.color} animate-pulse`} />
              <span className="text-slate-400 text-xs">{currentPhase.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Duration */}
          <div className="flex items-center gap-1.5 text-slate-300 text-sm font-mono">
            <AudioLines className="w-4 h-4 text-cyan-400" />
            {formatTime(callDuration)}
          </div>

          {/* Urdu toggle */}
          <button
            onClick={onToggleUrdu}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              urduMode
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {urduMode ? "اردو" : "English"}
          </button>
        </div>
      </div>

      {/* Main call area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* AI Avatar */}
        <div className="mb-8">
          <div className={`relative w-36 h-36 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl transition-all duration-500 ${currentPhase.ring}`}>
            {/* Pulsing rings */}
            {phase === "speaking" && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping" style={{ animationDuration: "1.5s" }} />
                <span className="absolute inset-[-12px] rounded-full border-2 border-cyan-400/20 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
              </>
            )}
            {phase === "listening" && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping" style={{ animationDuration: "2s" }} />
                <span className="absolute inset-[-12px] rounded-full border-2 border-emerald-400/20 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
              </>
            )}
            <Bot className="w-16 h-16 text-white relative z-10" />
          </div>
        </div>

        {/* Live transcript */}
        <div className="max-w-lg w-full mb-6 min-h-[80px] flex flex-col items-center justify-center">
          {phase === "listening" && liveTranscript ? (
            <p className="text-white text-lg text-center font-medium" dir={urduMode ? "rtl" : "ltr"}>
              "{liveTranscript}"
            </p>
          ) : phase === "thinking" ? (
            <div className="flex items-center gap-2 text-amber-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">{urduMode ? "سوچ رہا ہوں..." : "Thinking..."}</span>
            </div>
          ) : phase === "speaking" && turns.length > 0 ? (
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-2 flex items-center justify-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                {urduMode ? "جواب دے رہا ہوں..." : "Speaking..."}
              </p>
              <p className="text-slate-200 text-sm leading-relaxed line-clamp-3" dir={urduMode ? "rtl" : "ltr"}>
                {turns[turns.length - 1]?.text}
              </p>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center">
              {muted
                ? urduMode ? "مائیک بند ہے — دوبارہ بولنے کے لیے آن کریں" : "Microphone is muted — unmute to talk"
                : urduMode ? "بات کرنا شروع کریں..." : "Start speaking..."}
            </p>
          )}
        </div>
      </div>

      {/* Conversation transcript (compact) */}
      {turns.length > 1 && (
        <div className="relative z-10 max-h-32 overflow-y-auto px-6 py-2 border-t border-slate-800/50 scrollbar-thin">
          <div className="max-w-lg mx-auto space-y-1.5">
            {turns.slice(-4).map((turn) => (
              <div
                key={turn.id}
                className={`text-xs leading-relaxed ${turn.role === "user" ? "text-right" : "text-left"}`}
                dir={urduMode ? "rtl" : "ltr"}
              >
                <span
                  className={`inline-block max-w-[85%] px-3 py-1.5 rounded-lg ${
                    turn.role === "user"
                      ? "bg-cyan-500/20 text-cyan-200"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {turn.text.slice(0, 120)}
                  {turn.text.length > 120 && "..."}
                </span>
              </div>
            ))}
            <div ref={turnsEndRef} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="relative z-10 px-6 py-2 bg-rose-500/10 border-t border-rose-500/20">
          <p className="text-rose-400 text-xs text-center">{error}</p>
        </div>
      )}

      {/* Call controls */}
      <div className="relative z-10 px-6 py-8 border-t border-slate-800/50 bg-slate-900/30">
        <div className="flex items-center justify-center gap-6">
          {/* Mute toggle */}
          <button
            onClick={handleToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              muted
                ? "bg-slate-700 text-slate-400 hover:bg-slate-600"
                : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* End call */}
          <button
            onClick={handleEndCall}
            className="w-18 h-18 p-[18px] rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-xl shadow-rose-500/30 hover:shadow-rose-500/40 hover:scale-105"
            title="End call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Restart listening (if idle) */}
          <button
            onClick={() => {
              if (phase === "idle" && !muted) {
                startListening();
              }
            }}
            disabled={phase !== "idle" || muted}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              phase === "idle" && !muted
                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                : "bg-slate-800 text-slate-600 cursor-not-allowed"
            }`}
            title="Start talking"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>

        <p className="text-center text-slate-600 text-[11px] mt-4">
          {urduMode
            ? "بات ختم کرنے کے لیے ریڈ بٹن دبائیں • مائیک بند/کھولنے کے لیے مائیک بٹن"
            : "Press the red button to end call • Toggle mic with the mic button"}
        </p>
      </div>
    </div>
  );
}
