import { useEffect, useState } from "react";
import { MessageSquare, Plus, Trash2, Pencil, Check, X, Bot } from "lucide-react";
import type { Chat } from "@/lib/supabase";
import { fetchChats, deleteChat, renameChat } from "@/lib/api";

interface SidebarProps {
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  refreshKey: number;
  onChatsLoaded: (chats: Chat[]) => void;
}

export default function Sidebar({
  currentChatId,
  onSelectChat,
  onNewChat,
  refreshKey,
  onChatsLoaded,
}: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChats()
      .then((data) => {
        if (cancelled) return;
        setChats(data || []);
        onChatsLoaded(data || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      await deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete chat");
    }
  };

  const startEdit = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const confirmEdit = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await renameChat(chatId, editTitle.trim());
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: editTitle.trim() } : c))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename chat");
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Logo / Header */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Nova AI</h1>
            <p className="text-slate-400 text-[11px]">Your全能 AI Assistant</p>
          </div>
        </div>
      </div>

      {/* New Chat button */}
      <div className="px-3 pt-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-3 scrollbar-thin">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-11 rounded-lg bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-rose-400 text-xs px-2">{error}</p>
        ) : chats.length === 0 ? (
          <div className="text-center py-8 px-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-xs">No chats yet. Start a new conversation!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => editingId !== chat.id && onSelectChat(chat.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  currentChatId === chat.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                {editingId === chat.id ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none border border-cyan-500"
                      autoFocus
                    />
                    <button
                      onClick={(e) => confirmEdit(e, chat.id)}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="text-rose-400 hover:text-rose-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <MessageSquare
                      className={`w-4 h-4 flex-shrink-0 ${
                        currentChatId === chat.id ? "text-cyan-400" : "text-slate-500"
                      }`}
                    />
                    <span className="flex-1 truncate text-sm">{chat.title}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startEdit(e, chat)}
                        className="text-slate-500 hover:text-cyan-400 p-0.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, chat.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800">
        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Powered by Nova AI Engine</span>
        </div>
      </div>
    </div>
  );
}
