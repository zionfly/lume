import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, Session } from "../stores/appStore";

interface SidebarProps {
  onTogglePanel: (panel: "none" | "memory" | "skills") => void;
  activePanel: "none" | "memory" | "skills";
  onOpenSettings: () => void;
}

export default function Sidebar({ onTogglePanel, activePanel, onOpenSettings }: SidebarProps) {
  const { sessions, setSessions, activeSessionId, setActiveSession } =
    useAppStore();

  useEffect(() => {
    invoke<Session[]>("get_sessions").then(setSessions).catch(console.error);
  }, [setSessions]);

  const handleNewSession = async () => {
    const session = await invoke<Session>("create_session", {
      title: "New Chat",
    });
    setSessions([session, ...sessions]);
    setActiveSession(session.id);
  };

  return (
    <aside className="w-64 bg-surface-1 border-r border-surface-3 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-surface-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lume-400 to-lume-600 flex items-center justify-center">
            <span className="text-black font-bold text-sm">L</span>
          </div>
          <span className="font-semibold text-lg">Lume</span>
        </div>
      </div>

      {/* New chat */}
      <div className="p-3">
        <button
          onClick={handleNewSession}
          className="w-full py-2 px-3 rounded-lg border border-surface-4 hover:bg-surface-2 transition-colors text-sm flex items-center gap-2"
        >
          <span className="text-lume-400">+</span> New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSession(s.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors truncate ${
              activeSessionId === s.id
                ? "bg-surface-3 text-white"
                : "text-gray-400 hover:bg-surface-2 hover:text-gray-200"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Bottom panels */}
      <div className="p-3 border-t border-surface-3 space-y-1">
        <button
          onClick={() =>
            onTogglePanel(activePanel === "memory" ? "none" : "memory")
          }
          className={`w-full py-1.5 px-3 rounded-lg text-sm text-left transition-colors ${
            activePanel === "memory"
              ? "bg-lume-400/10 text-lume-400"
              : "text-gray-400 hover:bg-surface-2"
          }`}
        >
          Memory
        </button>
        <button
          onClick={() =>
            onTogglePanel(activePanel === "skills" ? "none" : "skills")
          }
          className={`w-full py-1.5 px-3 rounded-lg text-sm text-left transition-colors ${
            activePanel === "skills"
              ? "bg-lume-400/10 text-lume-400"
              : "text-gray-400 hover:bg-surface-2"
          }`}
        >
          Skills
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full py-1.5 px-3 rounded-lg text-sm text-left transition-colors text-gray-400 hover:bg-surface-2"
        >
          Settings
        </button>
      </div>
    </aside>
  );
}
