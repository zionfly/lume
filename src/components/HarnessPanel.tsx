import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface HarnessStats {
  total_sessions: number;
  total_messages: number;
  total_tool_calls: number;
  tool_success_rate: number;
  avg_tool_duration_ms: number;
  top_tools: [string, number][];
}

export default function HarnessPanel() {
  const [stats, setStats] = useState<HarnessStats | null>(null);

  useEffect(() => {
    invoke<HarnessStats>("get_harness_stats")
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="p-4 text-center text-xs text-sand-400">
        Loading harness stats...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Sessions" value={stats.total_sessions} />
        <StatCard label="Messages" value={stats.total_messages} />
        <StatCard label="Tool Calls" value={stats.total_tool_calls} />
        <StatCard
          label="Success Rate"
          value={`${(stats.tool_success_rate * 100).toFixed(1)}%`}
        />
        <StatCard
          label="Avg Duration"
          value={`${stats.avg_tool_duration_ms.toFixed(0)}ms`}
        />
      </div>

      {/* Top tools */}
      {stats.top_tools.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-sand-400 mb-2">
            Top Tools
          </h4>
          <div className="space-y-1">
            {stats.top_tools.map(([name, count]) => (
              <div
                key={name}
                className="flex items-center justify-between text-xs bg-white shadow-sm rounded-lg px-3 py-1.5"
              >
                <span className="font-mono text-sand-700">{name}</span>
                <span className="text-sand-400">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white shadow-sm rounded-lg p-3">
      <div className="text-lg font-semibold text-sand-900">{value}</div>
      <div className="text-[10px] text-sand-400 mt-0.5">{label}</div>
    </div>
  );
}
