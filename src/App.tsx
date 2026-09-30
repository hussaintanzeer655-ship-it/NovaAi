import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Mic,
  Square,
  Menu,
  X,
  Bot,
  Loader2,
  Globe,
  Volume2,
  Phone,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import MessageRenderer from "@/components/MessageRenderer";
import WelcomeScreen from "@/components/WelcomeScreen";
import LiveCall from "@/components/LiveCall";
import { sendToAi, fetchMessages } from "@/lib/api";
import { supabase, type Message } from "@/lib/supabase";
import {
  SpeechRecognizer,
  speak,
  stopSpeaking,
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
} from "@/lib/speech";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [urduMode, setUrduMode] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [liveCallActive, setLiveCallActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const interimRef = useRef("");

  // Initialize speech recognizer
  useEffect(() => {
    recognizerRef.current = new SpeechRecognizer();
    return () => {
      recognizerRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load voices for TTS
  useEffect(() => {
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const handleSelectChat = useCallback(async (chatId: string) => {
    setCurrentChatId(chatId);
    setLoadingChat(true);
    setError(null);
    try {
      const dbMessages = await fetchMessages(chatId);
      setMessages(
        dbMessages.map((m: Message) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat");
    } finally {
      setLoadingChat(false);
      setMobileSidebarOpen(false);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentChatId(null);
    setMessages([]);
    setError(null);
    setMobileSidebarOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setInput("");

      const userMsg: DisplayMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      const prevMessages = [...messages, userMsg];
      setMessages(prevMessages);
      setLoading(true);

      try {
        const apiMessages = prevMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result = await sendToAi(apiMessages, currentChatId || undefined);

      const assistantMsg: DisplayMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.response,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Update chat ID if this was a new chat
      if (!currentChatId && result.chatId) {
        setCurrentChatId(result.chatId);
      }

      // Refresh sidebar
      setSidebarRefreshKey((k) => k + 1);

      // Auto-speak if enabled
      if (autoSpeak && isSpeechSynthesisSupported()) {
        speak(result.response, {
          lang: urduMode ? "ur-PK" : "en-US",
        });
      }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to get AI response";
        setError(errMsg);
        // Remove the user message if it was a new chat with no save
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, currentChatId, autoSpeak, urduMode]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const toggleListening = () => {
    const recognizer = recognizerRef.current;
    if (!recognizer || !recognizer.isSupported()) {
      setError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognizer.stop();
      setIsListening(false);
      return;
    }

    interimRef.current = "";
    const lang = urduMode ? "ur-PK" : "en-US";
    recognizer.start(lang, {
      onResult: (text, isFinal) => {
        if (isFinal) {
          setInput((prev) => {
            const base = prev.replace(interimRef.current, "");
            return base + text + " ";
          });
          interimRef.current = "";
        } else {
          setInput((prev) => {
            const base = prev.replace(interimRef.current, "");
            interimRef.current = text;
            return base + text;
          });
        }
      },
      onEnd: () => {
        setIsListening(false);
        interimRef.current = "";
      },
      onError: (err) => {
        setIsListening(false);
        setError(`Voice recognition error: ${err}`);
      },
    });
    setIsListening(true);
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const speechSupported = isSpeechSynthesisSupported();
  const recognitionSupported = isSpeechRecognitionSupported();

  const isUrduText = /[\u0600-\u06FF]/.test(input);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar - desktop */}
      {sidebarOpen && (
        <div className="hidden md:flex w-72 flex-shrink-0">
          <Sidebar
            currentChatId={currentChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            refreshKey={sidebarRefreshKey}
            onChatsLoaded={() => {}}
          />
        </div>
      )}

      {/* Sidebar - mobile drawer */}
      {mobileSidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="md:hidden fixed left-0 top-0 bottom-0 w-72 z-50">
            <Sidebar
              currentChatId={currentChatId}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              refreshKey={sidebarRefreshKey}
              onChatsLoaded={() => {}}
            />
          </div>
        </>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-sm">
                  {currentChatId ? "Conversation" : "New Chat"}
                </h2>
                <p className="text-slate-500 text-xs hidden sm:block">
                  {urduMode ? "اردو موڈ" : "English Mode"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Urdu mode toggle */}
            <button
              onClick={() => setUrduMode(!urduMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                urduMode
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              }`}
              title="Toggle Urdu mode"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{urduMode ? "اردو" : "English"}</span>
            </button>

            {/* Auto-speak toggle */}
            {speechSupported && (
              <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  autoSpeak
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
                }`}
                title="Auto-speak AI responses"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-Voice</span>
              </button>
            )}

            {/* Live Call button */}
            {speechSupported && recognitionSupported && (
              <button
                onClick={() => setLiveCallActive(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20"
                title="Start live voice call with AI"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Live Call</span>
              </button>
            )}

            {/* New chat (mobile) */}
            <button
              onClick={handleNewChat}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {loadingChat ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen onPromptClick={(prompt) => handleSend(prompt)} onStartCall={() => setLiveCallActive(true)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messages.map((msg) => (
                <MessageRenderer key={msg.id} content={msg.content} role={msg.role} />
              ))}
              {loading && (
                <div className="flex justify-start mb-6">
                  <div className="rounded-2xl rounded-tl-sm bg-slate-800/60 border border-slate-700/50 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-slate-400 text-sm">Nova is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20">
            <div className="max-w-3xl mx-auto flex items-center gap-2 text-rose-400 text-xs">
              <X className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 rounded-2xl bg-slate-800/80 border border-slate-700 focus-within:border-cyan-500/50 transition-colors">
              {/* Voice button */}
              {recognitionSupported && (
                <button
                  onClick={toggleListening}
                  className={`flex-shrink-0 p-3 rounded-xl transition-all ${
                    isListening
                      ? "text-rose-400 bg-rose-500/10"
                      : "text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50"
                  }`}
                  title={isListening ? "Stop recording" : "Start voice input"}
                >
                  {isListening ? (
                    <span className="relative flex h-5 w-5 items-center justify-center">
                      <span className="absolute h-4 w-4 rounded-full bg-rose-400 animate-ping opacity-60" />
                      <Square className="w-4 h-4 relative" fill="currentColor" />
                    </span>
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening
                    ? "Listening..."
                    : urduMode
                    ? "اردو میں ٹائپ کریں یا بولیں..."
                    : "Type your message, or use the mic to speak..."
                }
                rows={1}
                dir={isUrduText || urduMode ? "rtl" : "ltr"}
                className="flex-1 bg-transparent text-white text-sm py-3 pr-2 outline-none resize-none max-h-32 min-h-[44px] placeholder:text-slate-500"
                style={{
                  fontFamily: isUrduText || urduMode ? "'Noto Naskh Arabic', 'Arial', sans-serif" : "inherit",
                }}
                disabled={loading}
              />

              {/* Send button */}
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 p-3 m-1 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Hint text */}
            <p className="text-slate-600 text-[11px] mt-2 text-center">
              Press Enter to send • Shift+Enter for new line •{" "}
              {recognitionSupported ? "Mic for voice input" : "Voice input not supported in this browser"}
            </p>
          </div>
        </div>
      </div>

      {/* Live Call Overlay */}
      {liveCallActive && (
        <LiveCall
          onEnd={() => {
            setLiveCallActive(false);
            setSidebarRefreshKey((k) => k + 1);
          }}
          urduMode={urduMode}
          onToggleUrdu={() => setUrduMode(!urduMode)}
        />
      )}
    </div>
  );
}
