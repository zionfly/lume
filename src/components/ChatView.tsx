import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, Message } from "../stores/appStore";

export default function ChatView() {
  const {
    activeSessionId,
    messages,
    setMessages,
    addMessage,
    isLoading,
    setLoading,
  } = useAppStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSessionId) {
      invoke<Message[]>("get_session_messages", {
        sessionId: activeSessionId,
      })
        .then(setMessages)
        .catch(console.error);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeSessionId || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      session_id: activeSessionId,
      role: "user",
      content: input,
      token_count: 0,
      created_at: new Date().toISOString(),
    };
    addMessage(userMsg);
    setInput("");
    setLoading(true);

    try {
      // Read saved settings to pass provider/model/apiKey
      const settings = JSON.parse(
        localStorage.getItem("lume_settings") || "{}"
      );

      const reply = await invoke<Message>("send_message", {
        sessionId: activeSessionId,
        content: input,
        provider: settings.provider || null,
        model: settings.model || null,
        apiKey: settings.apiKey || null,
        baseUrl: settings.customBaseUrl || null,
      });
      addMessage(reply);
    } catch (err) {
      addMessage({
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        role: "assistant",
        content: `Error: ${err}`,
        token_count: 0,
        created_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const settings = JSON.parse(localStorage.getItem("lume_settings") || "{}");
  const hasApiKey = !!settings.apiKey;

  if (!activeSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-lume-400 to-lume-600 flex items-center justify-center">
            <span className="text-black font-bold text-2xl">L</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Welcome to Lume</h2>
          {hasApiKey ? (
            <p className="text-gray-500 text-sm">
              Start a new chat to illuminate your workflow
            </p>
          ) : (
            <div className="space-y-3 mt-4">
              <p className="text-gray-400 text-sm">
                Connect an AI provider to start chatting.
                Google Gemini is free — get a key in 10 seconds:
              </p>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener"
                className="inline-block px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Get free Gemini API Key
              </a>
              <p className="text-gray-600 text-xs">
                Then paste it in Settings → Google Gemini
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-lume-500/20 text-lume-100"
                  : "bg-surface-2 text-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-2 rounded-2xl px-4 py-3 text-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-lume-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-lume-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-lume-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-surface-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask Lume anything..."
            className="flex-1 bg-surface-2 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 placeholder:text-gray-600"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-lume-500 hover:bg-lume-600 disabled:opacity-40 rounded-xl text-black font-medium text-sm transition-colors"
          >
            Send
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
          <span>Action preview: ON</span>
          <span>Memory: L1+L2 active</span>
          <span>Skills: {useAppStore.getState().skills.length} loaded</span>
        </div>
      </div>
    </div>
  );
}
