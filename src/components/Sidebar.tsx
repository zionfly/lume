import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, Session } from "../stores/appStore";

interface SidebarProps {
  onTogglePanel: (panel: "none" | "memory" | "skills" | "workspace") => void;
  activePanel: "none" | "memory" | "skills" | "workspace";
  onOpenSettings: () => void;
  onCollapse: () => void;
}

export default function Sidebar({
  onTogglePanel,
  activePanel,
  onOpenSettings,
  onCollapse,
}: SidebarProps) {
  const { sessions, setSessions, activeSessionId, setActiveSession } =
    useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  useEffect(() => {
    invoke<Session[]>("get_sessions").then(setSessions).catch(console.error);
  }, [setSessions]);

  const handleNewSession = async () => {
    const session = await invoke<Session>("create_session", {
      title: "New Chat",
    });
    setSessions([session, ...sessions]);
    setActiveSession(session.id);
    // Auto-enter edit mode for the new chat
    setEditingId(session.id);
    setEditTitle("New Chat");
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    await invoke("rename_session", { sessionId: id, title: editTitle.trim() });
    setSessions(
      sessions.map((s) =>
        s.id === id ? { ...s, title: editTitle.trim() } : s
      )
    );
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await invoke("delete_session", { sessionId: id });
    setSessions(sessions.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      const next = sessions.find((s) => s.id !== id);
      setActiveSession(next ? next.id : null);
    }
    setContextMenuId(null);
  };

  return (
    <aside className="w-full h-full bg-surface-1 flex flex-col">
      {/* Logo + Collapse */}
      <div className="p-4 border-b border-surface-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lume-400 to-lume-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-lg text-sand-900">Lume</span>
          </div>
          <button
            onClick={onCollapse}
            className="text-sand-400 hover:text-sand-700 text-xs px-1"
            title="Collapse sidebar"
          >
            &laquo;
          </button>
        </div>
      </div>

      {/* New chat */}
      <div className="p-3">
        <button
          onClick={handleNewSession}
          className="w-full py-2 px-3 rounded-lg border border-surface-4 hover:bg-surface-2 transition-colors text-sm flex items-center gap-2 text-sand-700"
        >
          <span className="text-lume-600">+</span> New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="relative group"
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenuId(contextMenuId === s.id ? null : s.id);
            }}
          >
            {editingId === s.id ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleRename(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(s.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-lume-400 outline-none text-sand-900"
              />
            ) : (
              <button
                onClick={() => {
                  setActiveSession(s.id);
                  setContextMenuId(null);
                }}
                onDoubleClick={() => {
                  setEditingId(s.id);
                  setEditTitle(s.title);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors truncate flex items-center justify-between ${
                  activeSessionId === s.id
                    ? "bg-surface-2 text-sand-900 font-medium"
                    : "text-sand-600 hover:bg-surface-2 hover:text-sand-800"
                }`}
              >
                <span className="truncate">{s.title}</span>
                {/* Inline menu trigger */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenuId(contextMenuId === s.id ? null : s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-sand-400 hover:text-sand-700 ml-1 shrink-0"
                >
                  ...
                </span>
              </button>
            )}

            {/* Context menu */}
            {contextMenuId === s.id && editingId !== s.id && (
              <div className="absolute right-2 top-8 z-50 bg-white rounded-lg shadow-lg border border-surface-3 py-1 min-w-[120px]">
                <button
                  onClick={() => {
                    setEditingId(s.id);
                    setEditTitle(s.title);
                    setContextMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-sand-700 hover:bg-surface-1"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom panels */}
      <div className="p-3 border-t border-surface-3 space-y-1">
        {(
          [
            ["workspace", "Workspace"],
            ["memory", "Memory"],
            ["skills", "Skills"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() =>
              onTogglePanel(activePanel === key ? "none" : key)
            }
            className={`w-full py-1.5 px-3 rounded-lg text-sm text-left transition-colors ${
              activePanel === key
                ? "bg-lume-100 text-lume-700"
                : "text-sand-500 hover:bg-surface-2"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={onOpenSettings}
          className="w-full py-1.5 px-3 rounded-lg text-sm text-left transition-colors text-sand-500 hover:bg-surface-2"
        >
          Settings
        </button>
      </div>
    </aside>
  );
}
