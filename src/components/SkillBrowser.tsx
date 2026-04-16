import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, SkillMeta } from "../stores/appStore";

export default function SkillBrowser() {
  const { skills, setSkills } = useAppStore();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [skillContent, setSkillContent] = useState<string>("");

  useEffect(() => {
    invoke<SkillMeta[]>("list_skills").then(setSkills).catch(console.error);
  }, [setSkills]);

  const handleSelectSkill = async (name: string) => {
    setSelectedSkill(name);
    try {
      const content = await invoke<string>("get_skill", { name });
      setSkillContent(content);
    } catch (err) {
      setSkillContent(`Failed to load skill: ${err}`);
    }
  };

  return (
    <div className="w-80 bg-surface-1 border-l border-surface-3 flex flex-col">
      <div className="p-4 border-b border-surface-3">
        <h3 className="font-semibold text-sm text-sand-900">Skills</h3>
        <p className="text-xs text-sand-400 mt-1">
          Progressive disclosure: L0 → L1 → L2
        </p>
      </div>

      {/* Skill list (L0) */}
      <div className="flex-1 overflow-y-auto">
        {skills.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-sand-400">
              No skills yet. Lume will auto-create skills as you work.
            </p>
            <p className="text-[10px] text-sand-400 mt-2">
              Skills emerge every 15 tool calls via self-evaluation checkpoints.
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
                    ? "bg-surface-3"
                    : "hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-sand-900">{skill.name}</span>
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

        {/* L1: Full skill view */}
        {selectedSkill && (
          <div className="border-t border-surface-3 p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-sand-900">{selectedSkill}</h4>
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
    </div>
  );
}
