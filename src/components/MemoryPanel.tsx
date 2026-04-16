import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, MemoryProfile } from "../stores/appStore";

export default function MemoryPanel() {
  const { memoryProfile, setMemoryProfile } = useAppStore();
  const [activeTab, setActiveTab] = useState<"user" | "env" | "search">("user");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ content: string; created_at: string }[]>([]);

  // Editable state
  const [editingUser, setEditingUser] = useState(false);
  const [editingEnv, setEditingEnv] = useState(false);
  const [userDraft, setUserDraft] = useState("");
  const [envDraft, setEnvDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    invoke<MemoryProfile>("get_memory_profile")
      .then(setMemoryProfile)
      .catch(console.error);
  }, [setMemoryProfile]);

  useEffect(() => {
    if (memoryProfile) {
      setUserDraft(memoryProfile.user.raw);
      setEnvDraft(memoryProfile.env.raw);
    }
  }, [memoryProfile]);

  const handleSave = async (layer: "user" | "env") => {
    const content = layer === "user" ? userDraft : envDraft;
    try {
      await invoke("update_memory", { layer, content });
      setSaveStatus("Saved!");
      setTimeout(() => setSaveStatus(null), 2000);
      // Refresh
      const profile = await invoke<MemoryProfile>("get_memory_profile");
      setMemoryProfile(profile);
      if (layer === "user") setEditingUser(false);
      else setEditingEnv(false);
    } catch (err) {
      setSaveStatus(`Error: ${err}`);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await invoke<{ content: string; created_at: string }[]>(
        "search_memory",
        { query: searchQuery, limit: 20 }
      );
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  return (
    <div className="h-full bg-surface-1 flex flex-col">
      <div className="p-4 border-b border-surface-3">
        <h3 className="font-semibold text-sm text-sand-900">Memory</h3>
        <p className="text-xs text-sand-400 mt-1">Global user-level memory</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-3">
        {(["user", "env", "search"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "text-lume-600 border-b-2 border-lume-600"
                : "text-sand-400 hover:text-sand-700"
            }`}
          >
            {tab === "user" ? "User Profile" : tab === "env" ? "Environment" : "Search"}
          </button>
        ))}
      </div>

      {/* Save status */}
      {saveStatus && (
        <div className={`px-4 py-1.5 text-xs ${saveStatus.startsWith("Error") ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
          {saveStatus}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "user" && memoryProfile && (
          <div>
            <div className="flex justify-between items-center text-xs text-sand-400 mb-2">
              <span>USER.md</span>
              <div className="flex items-center gap-2">
                <span>{memoryProfile.user.char_count} / 1375</span>
                {editingUser ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSave("user")}
                      className="text-lume-600 hover:text-lume-700 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(false);
                        setUserDraft(memoryProfile.user.raw);
                      }}
                      className="text-sand-400 hover:text-sand-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingUser(true)}
                    className="text-lume-600 hover:text-lume-700 font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="w-full h-1 bg-surface-3 rounded-full mb-3">
              <div
                className="h-1 bg-lume-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, (memoryProfile.user.char_count / 1375) * 100)}%` }}
              />
            </div>
            {editingUser ? (
              <textarea
                value={userDraft}
                onChange={(e) => setUserDraft(e.target.value)}
                className="w-full min-h-[200px] text-xs text-sand-700 font-mono bg-white rounded-lg p-3 border border-lume-400 outline-none resize-y"
              />
            ) : (
              <pre className="text-xs text-sand-700 whitespace-pre-wrap font-mono bg-white shadow-sm rounded-lg p-3">
                {memoryProfile.user.raw}
              </pre>
            )}
          </div>
        )}

        {activeTab === "env" && memoryProfile && (
          <div>
            <div className="flex justify-between items-center text-xs text-sand-400 mb-2">
              <span>ENV.md</span>
              <div className="flex items-center gap-2">
                <span>{memoryProfile.env.char_count} / 2200</span>
                {editingEnv ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSave("env")}
                      className="text-lume-600 hover:text-lume-700 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingEnv(false);
                        setEnvDraft(memoryProfile.env.raw);
                      }}
                      className="text-sand-400 hover:text-sand-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingEnv(true)}
                    className="text-lume-600 hover:text-lume-700 font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="w-full h-1 bg-surface-3 rounded-full mb-3">
              <div
                className="h-1 bg-lume-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, (memoryProfile.env.char_count / 2200) * 100)}%` }}
              />
            </div>
            {editingEnv ? (
              <textarea
                value={envDraft}
                onChange={(e) => setEnvDraft(e.target.value)}
                className="w-full min-h-[200px] text-xs text-sand-700 font-mono bg-white rounded-lg p-3 border border-lume-400 outline-none resize-y"
              />
            ) : (
              <pre className="text-xs text-sand-700 whitespace-pre-wrap font-mono bg-white shadow-sm rounded-lg p-3">
                {memoryProfile.env.raw}
              </pre>
            )}
          </div>
        )}

        {activeTab === "search" && (
          <div>
            <div className="flex gap-2 mb-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search all conversations..."
                className="flex-1 bg-white border border-surface-3 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-lume-400/50 text-sand-700"
              />
            </div>
            <div className="space-y-2">
              {searchResults.map((r, i) => (
                <div key={i} className="bg-white shadow-sm rounded-lg p-2">
                  <p className="text-xs text-sand-700 line-clamp-3">{r.content}</p>
                  <p className="text-[10px] text-sand-400 mt-1">{r.created_at}</p>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && (
                <p className="text-xs text-sand-400 text-center py-4">
                  No results.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
