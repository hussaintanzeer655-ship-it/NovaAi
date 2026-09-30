import { supabase } from "./supabase";
import type { Message } from "./supabase";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface AiResponse {
  response: string;
  chatId: string;
}

export async function sendToAi(
  messages: { role: "user" | "assistant"; content: string }[],
  chatId?: string
): Promise<AiResponse> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ messages, chatId }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Request failed");
    throw new Error(errText);
  }

  const data = await res.json();
  if (!data || typeof data.response !== "string") {
    throw new Error("Invalid response from AI service");
  }
  return { response: data.response, chatId: data.chatId };
}

export async function fetchChats() {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function deleteChat(chatId: string) {
  const { error } = await supabase.from("chats").delete().eq("id", chatId);
  if (error) throw error;
}

export async function renameChat(chatId: string, title: string) {
  const { error } = await supabase
    .from("chats")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", chatId);
  if (error) throw error;
}
