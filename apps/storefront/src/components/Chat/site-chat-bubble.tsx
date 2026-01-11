"use client";

import { useState } from "react";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { sendChatMessage, clearChatSession } from "@/lib/data/chat";
import { useRouter } from "next/navigation";
import { retrieveStore } from "@lib/data/store";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export default function ChatBubble() {
  const { selectedOrg } = retrieveStore() as any;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("session_id") : null
  );

  const timestamp = () =>
    new Date().toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: input,
      timestamp: timestamp(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await sendChatMessage({
        message: userMsg.content,
        session_id: sessionId,
        tenant_id: selectedOrg?.id,
      });

      if (res.session_id && res.session_id !== sessionId) {
        setSessionId(res.session_id);
        localStorage.setItem("session_id", res.session_id);
      }

      if (res.message) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res.message,
            timestamp: timestamp(),
          },
        ]);
      }

      if (res.action?.resource) {
        router.push(res.action.resource);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: timestamp(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // if (!selectedOrg?.chatEnabled) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <div className="w-[360px] bg-white rounded-xl shadow-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-3">
            <p className="font-medium text-lg text-dark">
              Chat with Support
            </p>
            <button onClick={() => setOpen(false)}>
              <X className="w-5 h-5 text-dark-5 hover:text-dark" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-md px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-blue text-white"
                    : "mr-auto bg-white border border-gray-3 text-dark"
                }`}
              >
                <p>{m.content}</p>
                <span className="block mt-1 text-[11px] opacity-70">
                  {m.timestamp}
                </span>
              </div>
            ))}

            {sending && (
              <div className="mr-auto bg-white border border-gray-3 rounded-md px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue" />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-3">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message"
              className="w-full rounded-md border border-gray-3 bg-gray-1 p-3 text-sm outline-none focus:ring-2 focus:ring-blue/20"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="flex justify-between items-center mt-3">
              <button
                onClick={async () => {
                  setMessages([]);
                  setSessionId(null);
                  localStorage.removeItem("session_id");
                  await clearChatSession(selectedOrg?.id);
                }}
                className="text-xs text-dark-5 hover:text-dark"
              >
                Clear
              </button>

              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center justify-center rounded-md bg-blue px-5 py-2 text-white text-sm hover:bg-blue-dark disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="h-12 w-12 rounded-full bg-blue text-white flex items-center justify-center shadow-1 hover:bg-blue-dark"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
