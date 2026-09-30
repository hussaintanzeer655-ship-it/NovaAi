import { Code, FileText, Languages, Mic, Phone, Sparkles, Bot } from "lucide-react";

interface WelcomeScreenProps {
  onPromptClick: (prompt: string) => void;
  onStartCall: () => void;
}

const suggestions = [
  {
    icon: Code,
    title: "Write Code",
    prompt: "Write a Python function that sorts a list of dictionaries by a specific key",
    color: "from-cyan-400 to-blue-500",
  },
  {
    icon: Languages,
    title: "Chat in Urdu",
    prompt: "اردو میں میرے ساتھ بات کریں اور ایک مختصر کہانی سنائیں",
    color: "from-emerald-400 to-teal-500",
  },
  {
    icon: FileText,
    title: "Create a PDF",
    prompt: "Create a PDF document about the history of artificial intelligence with headings and bullet points",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: Phone,
    title: "Live Voice Call",
    prompt: "Start a hands-free voice conversation with Nova AI",
    color: "from-rose-400 to-pink-500",
    isCall: true,
  },
];

export default function WelcomeScreen({ onPromptClick, onStartCall }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
      <div className="max-w-3xl w-full">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-2xl shadow-cyan-500/30 mb-5">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Nova AI</h1>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Your all-in-one AI assistant. Chat, code, speak Urdu, and generate PDFs — all in one place.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            { icon: Code, label: "Coding" },
            { icon: Languages, label: "Urdu + English" },
            { icon: FileText, label: "PDF Export" },
            { icon: Phone, label: "Live Call" },
          ].map((feat) => (
            <div
              key={feat.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-300 text-xs font-medium"
            >
              <feat.icon className="w-3.5 h-3.5 text-cyan-400" />
              {feat.label}
            </div>
          ))}
        </div>

        {/* Suggestion cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((s) => {
            const isCall = (s as any).isCall === true;
            const handleClick = isCall ? onStartCall : () => onPromptClick(s.prompt);
            return (
              <button
                key={s.title}
                onClick={handleClick}
                className="group text-left p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/80 transition-all"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} mb-3 shadow-lg`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-1.5">
                  {s.title}
                  <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{s.prompt}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
