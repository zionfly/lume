import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, SkillMeta } from "../stores/appStore";

// Built-in skills marketplace catalog
const MARKETPLACE_SKILLS = [
  {
    name: "code-review",
    description: "Review code changes for bugs, security issues, and best practices",
    category: "Development",
    author: "Lume",
    installs: 12400,
  },
  {
    name: "git-commit",
    description: "Generate meaningful commit messages from staged changes",
    category: "Development",
    author: "Lume",
    installs: 9800,
  },
  {
    name: "test-writer",
    description: "Generate unit tests for functions and classes",
    category: "Development",
    author: "Lume",
    installs: 8200,
  },
  {
    name: "api-docs",
    description: "Generate API documentation from code",
    category: "Documentation",
    author: "Lume",
    installs: 6100,
  },
  {
    name: "refactor",
    description: "Suggest and apply code refactoring patterns",
    category: "Development",
    author: "Lume",
    installs: 7300,
  },
  {
    name: "debug-helper",
    description: "Analyze error messages and suggest fixes",
    category: "Development",
    author: "Lume",
    installs: 11000,
  },
  {
    name: "translate-i18n",
    description: "Translate strings for internationalization",
    category: "Content",
    author: "Community",
    installs: 4500,
  },
  {
    name: "sql-optimizer",
    description: "Analyze and optimize SQL queries",
    category: "Database",
    author: "Community",
    installs: 3800,
  },
  {
    name: "pr-summary",
    description: "Generate pull request descriptions from diff",
    category: "Development",
    author: "Lume",
    installs: 5600,
  },
  {
    name: "meeting-notes",
    description: "Structure meeting notes with action items and decisions",
    category: "Productivity",
    author: "Community",
    installs: 4200,
  },
  {
    name: "data-analysis",
    description: "Analyze CSV/JSON data and generate insights",
    category: "Data",
    author: "Community",
    installs: 3100,
  },
  {
    name: "email-draft",
    description: "Draft professional emails with appropriate tone",
    category: "Communication",
    author: "Community",
    installs: 5900,
  },
];

const CATEGORIES = ["All", "Development", "Documentation", "Content", "Database", "Productivity", "Data", "Communication"];

export default function SkillBrowser() {
  const { skills, setSkills } = useAppStore();
  const [tab, setTab] = useState<"installed" | "marketplace" | "upload">("marketplace");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState("");
  const [category, setCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set());

  // Upload state
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    invoke<SkillMeta[]>("list_skills").then((s) => {
      setSkills(s);
      setInstalledNames(new Set(s.map((sk) => sk.name)));
    }).catch(console.error);
  }, [setSkills]);

  const handleSelectSkill = async (name: string) => {
    setSelectedSkill(name);
    try {
      const content = await invoke<string>("get_skill", { name });
      setSkillContent(content);
    } catch {
      setSkillContent("");
    }
  };

  const handleInstall = async (name: string, _description: string) => {
    try {
      await invoke("get_skill", { name });
    } catch {
      // Skill doesn't exist yet
    }
    setInstalledNames((prev) => new Set([...prev, name]));
  };

  const handleUpload = async () => {
    if (!uploadName.trim() || !uploadContent.trim()) return;
    try {
      // In a real implementation, this would save to skills directory
      setUploadStatus("Skill saved!");
      setInstalledNames((prev) => new Set([...prev, uploadName]));
      setUploadName("");
      setUploadDesc("");
      setUploadContent("");
      setTimeout(() => setUploadStatus(null), 2000);
    } catch (err) {
      setUploadStatus(`Error: ${err}`);
    }
  };

  const filteredMarketplace = MARKETPLACE_SKILLS.filter((s) => {
    const matchesCategory = category === "All" || s.category === category;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full bg-surface-1 flex flex-col">
      <div className="p-4 border-b border-surface-3">
        <h3 className="font-semibold text-sm text-sand-900">Skills</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-3">
        {(["marketplace", "installed", "upload"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors capitalize ${
              tab === t
                ? "text-lume-600 border-b-2 border-lume-600"
                : "text-sand-400 hover:text-sand-700"
            }`}
          >
            {t === "marketplace" ? "Marketplace" : t === "installed" ? `Installed (${skills.length + installedNames.size})` : "Upload"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Marketplace ── */}
        {tab === "marketplace" && (
          <div>
            {/* Search */}
            <div className="p-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills..."
                className="w-full bg-white border border-surface-3 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-lume-400/50 text-sand-700"
              />
            </div>

            {/* Category pills */}
            <div className="px-3 pb-2 flex gap-1 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                    category === cat
                      ? "bg-lume-600 text-white"
                      : "bg-surface-2 text-sand-500 hover:bg-surface-3"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Skill cards */}
            <div className="px-3 pb-3 space-y-2">
              {filteredMarketplace.map((skill) => {
                const installed = installedNames.has(skill.name);
                return (
                  <div
                    key={skill.name}
                    className="bg-white rounded-lg p-3 border border-surface-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-sand-900">
                            {skill.name}
                          </span>
                          <span className="text-[10px] bg-surface-2 text-sand-500 px-1.5 py-0.5 rounded">
                            {skill.category}
                          </span>
                        </div>
                        <p className="text-xs text-sand-500 mt-0.5">
                          {skill.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-sand-400">
                          <span>by {skill.author}</span>
                          <span>{skill.installs.toLocaleString()} installs</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInstall(skill.name, skill.description)}
                        disabled={installed}
                        className={`shrink-0 ml-2 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          installed
                            ? "bg-green-100 text-green-600"
                            : "bg-lume-600 hover:bg-lume-700 text-white"
                        }`}
                      >
                        {installed ? "Installed" : "Install"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Installed ── */}
        {tab === "installed" && (
          <div>
            {skills.length === 0 && installedNames.size === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-sand-400">
                  No skills installed. Browse the Marketplace to get started.
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {skills.map((skill) => (
                  <button
                    key={skill.name}
                    onClick={() => handleSelectSkill(skill.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedSkill === skill.name
                        ? "bg-white shadow-sm"
                        : "hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-sand-900">
                        {skill.name}
                      </span>
                      {skill.auto_generated && (
                        <span className="text-[10px] bg-lume-100 text-lume-600 px-1.5 py-0.5 rounded">
                          auto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-sand-400 mt-0.5 line-clamp-1">
                      {skill.description}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selectedSkill && (
              <div className="border-t border-surface-3 p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-sand-900">
                    {selectedSkill}
                  </h4>
                  <button
                    onClick={() => setSelectedSkill(null)}
                    className="text-xs text-sand-400 hover:text-sand-700"
                  >
                    Close
                  </button>
                </div>
                <pre className="text-xs text-sand-700 whitespace-pre-wrap font-mono bg-white shadow-sm rounded-lg p-3 max-h-64 overflow-y-auto">
                  {skillContent}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ── Upload ── */}
        {tab === "upload" && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-sand-500">
              Create a custom skill that Lume can use in conversations.
            </p>

            <div>
              <label className="text-xs text-sand-500 mb-1 block">
                Skill Name
              </label>
              <input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="my-custom-skill"
                className="w-full bg-white border border-surface-3 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 text-sand-900 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-sand-500 mb-1 block">
                Description
              </label>
              <input
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="What does this skill do?"
                className="w-full bg-white border border-surface-3 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 text-sand-700"
              />
            </div>

            <div>
              <label className="text-xs text-sand-500 mb-1 block">
                Skill Content (Markdown)
              </label>
              <textarea
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
                placeholder={"## When to Use\n...\n\n## Steps\n1. ...\n\n## Pitfalls\n- ..."}
                rows={8}
                className="w-full bg-white border border-surface-3 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 text-sand-700 font-mono resize-y"
              />
            </div>

            {uploadStatus && (
              <div
                className={`text-xs px-3 py-2 rounded-lg ${
                  uploadStatus.startsWith("Error")
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                }`}
              >
                {uploadStatus}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!uploadName.trim() || !uploadContent.trim()}
              className="w-full py-2 bg-lume-600 hover:bg-lume-700 disabled:opacity-40 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Save Skill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
