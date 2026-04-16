import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, Message } from "../stores/appStore";
import { PROVIDERS, getProviderById } from "../lib/providers";

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

  // Per-chat model selector state
  const settings = JSON.parse(localStorage.getItem("lume_settings") || "{}");
  const [chatProvider, setChatProvider] = useState(
    settings.provider || "google"
  );
  const [chatModel, setChatModel] = useState(
    settings.model || "gemini-2.5-flash"
  );
  const currentProvider = getProviderById(chatProvider);

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
      const reply = await invoke<Message>("send_message", {
        sessionId: activeSessionId,
        content: input,
        provider: chatProvider,
        model: chatModel,
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

  const hasApiKey = !!settings.apiKey;

  if (!activeSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-0">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-lume-400 to-lume-700 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-sand-900">
            Welcome to Lume
          </h2>
          {hasApiKey ? (
            <p className="text-sand-500 text-sm">
              Start a new chat to illuminate your workflow
            </p>
          ) : (
            <div className="space-y-3 mt-4">
              <p className="text-sand-500 text-sm">
                Connect an AI provider to start chatting. Google Gemini is free:
              </p>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener"
                className="inline-block px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Get free Gemini API Key
              </a>
              <p className="text-sand-400 text-xs">
                Then paste it in Settings → Google Gemini
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-0">
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
                  ? "bg-lume-100 text-sand-900"
                  : "bg-white text-sand-800 shadow-sm border border-surface-3"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 text-sm shadow-sm border border-surface-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-lume-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-lume-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-lume-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-surface-3 bg-surface-1">
        {/* Model selector row */}
        <div className="flex items-center gap-2 mb-2">
          <select
            value={`${chatProvider}::${chatModel}`}
            onChange={(e) => {
              const [p, m] = e.target.value.split("::");
              setChatProvider(p);
              setChatModel(m);
            }}
            className="bg-surface-2 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-lume-400/50 cursor-pointer text-sand-700 max-w-[240px]"
          >
            {PROVIDERS.map((p) => (
              <optgroup key={p.id} label={p.name}>
                {p.models.map((m) => (
                  <option key={`${p.id}::${m.id}`} value={`${p.id}::${m.id}`}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {currentProvider && (
            <div
              className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0"
              style={{ backgroundColor: currentProvider.color }}
            >
              {currentProvider.icon}
            </div>
          )}
          <span className="text-[10px] text-sand-400">
            {currentProvider?.name}
          </span>
        </div>

        {/* Input + send */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask Lume anything..."
            className="flex-1 bg-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-lume-400/30 placeholder:text-sand-400 border border-surface-3 text-sand-900"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-lume-600 hover:bg-lume-700 disabled:opacity-40 rounded-xl text-white font-medium text-sm transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
