import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, MemoryProfile } from "../stores/appStore";

export default function MemoryPanel() {
  const { memoryProfile, setMemoryProfile } = useAppStore();
  const [activeTab, setActiveTab] = useState<"user" | "env" | "search">(
    "user"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { content: string; created_at: string }[]
  >([]);

  useEffect(() => {
    invoke<MemoryProfile>("get_memory_profile")
      .then(setMemoryProfile)
      .catch(console.error);
  }, [setMemoryProfile]);

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
    <div className="w-80 bg-surface-1 border-l border-surface-3 flex flex-col">
      <div className="p-4 border-b border-surface-3">
        <h3 className="font-semibold text-sm">Memory System</h3>
        <p className="text-xs text-gray-500 mt-1">3-layer architecture</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-3">
        {(["user", "env", "search"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "text-lume-400 border-b-2 border-lume-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab === "user"
              ? "L1: Profile"
              : tab === "env"
                ? "L2: Env"
                : "L3: Search"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "user" && memoryProfile && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>USER.md</span>
              <span>
                {memoryProfile.user.char_count} / 1375 chars
              </span>
            </div>
            <div className="w-full h-1 bg-surface-3 rounded-full mb-3">
              <div
                className="h-1 bg-lume-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (memoryProfile.user.char_count / 1375) * 100)}%`,
                }}
              />
            </div>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-surface-2 rounded-lg p-3">
              {memoryProfile.user.raw}
            </pre>
          </div>
        )}

        {activeTab === "env" && memoryProfile && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>ENV.md</span>
              <span>
                {memoryProfile.env.char_count} / 2200 chars
              </span>
            </div>
            <div className="w-full h-1 bg-surface-3 rounded-full mb-3">
              <div
                className="h-1 bg-lume-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (memoryProfile.env.char_count / 2200) * 100)}%`,
                }}
              />
            </div>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-surface-2 rounded-lg p-3">
              {memoryProfile.env.raw}
            </pre>
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
                className="flex-1 bg-surface-2 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-lume-400/50"
              />
            </div>
            <div className="space-y-2">
              {searchResults.map((r, i) => (
                <div key={i} className="bg-surface-2 rounded-lg p-2">
                  <p className="text-xs text-gray-300 line-clamp-3">
                    {r.content}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {r.created_at}
                  </p>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && (
                <p className="text-xs text-gray-600 text-center py-4">
                  No results. Try different keywords.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
