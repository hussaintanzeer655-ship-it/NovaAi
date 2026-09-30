import { useMemo, useState } from "react";
import { Copy, Check, FileDown, Volume2, Square } from "lucide-react";
import { speak, stopSpeaking, isSpeaking } from "@/lib/speech";
import { exportToPdf } from "@/lib/pdf";

interface MessageRendererProps {
  content: string;
  role: "user" | "assistant";
}

interface ParsedBlock {
  type: "text" | "code";
  content: string;
  lang?: string;
}

function parseContent(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: "text", content: content.slice(lastIndex, match.index).trim() });
    }
    blocks.push({ type: "code", lang: match[1] || "text", content: match[2].trim() });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    blocks.push({ type: "text", content: content.slice(lastIndex).trim() });
  }

  return blocks.length > 0 ? blocks : [{ type: "text", content }];
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/95">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/60">
        <span className="text-xs font-medium text-cyan-400 uppercase tracking-wide">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-sm leading-relaxed">
        <code className="text-slate-200 font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let listType: "bullet" | "numbered" | null = null;

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    if (listType === "bullet") {
      elements.push(
        <ul key={key} className="my-2 space-y-1 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-slate-300 text-sm leading-relaxed">
              <span className="text-cyan-400 mt-1">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>
      );
    } else if (listType === "numbered") {
      elements.push(
        <ol key={key} className="my-2 space-y-1 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-slate-300 text-sm leading-relaxed">
              <span className="text-cyan-400 font-medium min-w-[1.5em]">{i + 1}.</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ol>
      );
    }
    listItems = [];
    listType = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`list-${idx}`);
      return;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList(`list-${idx}`);
      elements.push(
        <h3 key={`h3-${idx}`} className="text-base font-semibold text-white mt-3 mb-1.5" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(4)) }} />
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(`list-${idx}`);
      elements.push(
        <h2 key={`h2-${idx}`} className="text-lg font-bold text-white mt-4 mb-2" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(3)) }} />
      );
    } else if (trimmed.startsWith("# ")) {
      flushList(`list-${idx}`);
      elements.push(
        <h1 key={`h1-${idx}`} className="text-xl font-bold text-white mt-4 mb-2" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(2)) }} />
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== "numbered") flushList(`list-${idx}`);
      listType = "numbered";
      listItems.push(trimmed.replace(/^\d+\.\s/, ""));
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (listType !== "bullet") flushList(`list-${idx}`);
      listType = "bullet";
      listItems.push(trimmed.slice(2));
    } else {
      flushList(`list-${idx}`);
      elements.push(
        <p key={`p-${idx}`} className="text-slate-300 text-sm leading-relaxed my-1.5" dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
      );
    }
  });

  flushList("list-final");
  return <>{elements}</>;
}

function formatInline(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-200">$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[0.85em]">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-cyan-400 underline hover:text-cyan-300">$1</a>');
}

export default function MessageRenderer({ content, role }: MessageRendererProps) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const blocks = useMemo(() => parseContent(content), [content]);

  // Lazy import speech functions
  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSpeak = () => {
    if (isSpeaking()) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(content, {
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const handlePdf = () => {
    exportToPdf(content, `ai-response-${Date.now()}.pdf`);
  };

  if (role === "user") {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-cyan-500 to-blue-600 text-white px-4 py-3 shadow-lg shadow-blue-500/10">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[85%] w-full">
        <div className="rounded-2xl rounded-tl-sm bg-slate-800/60 border border-slate-700/50 px-5 py-4">
          {blocks.map((block, idx) =>
            block.type === "code" ? (
              <CodeBlock key={idx} code={block.content} lang={block.lang || "text"} />
            ) : (
              block.content && <FormattedText key={idx} text={block.content} />
            )
          )}
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 mt-2 ml-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors px-2 py-1 rounded-md hover:bg-slate-800/50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleSpeak}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors px-2 py-1 rounded-md hover:bg-slate-800/50"
          >
            {speaking ? <Square className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            {speaking ? "Stop" : "Speak"}
          </button>
          <button
            onClick={handlePdf}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors px-2 py-1 rounded-md hover:bg-slate-800/50"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}
