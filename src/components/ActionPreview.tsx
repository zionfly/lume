import { useState } from "react";

export interface ActionPlan {
  id: string;
  title: string;
  steps: ActionStep[];
  risk: "low" | "medium" | "high";
}

export interface ActionStep {
  description: string;
  tool: string;
  args: Record<string, unknown>;
  reversible: boolean;
}

interface ActionPreviewProps {
  plan: ActionPlan;
  onApprove: (planId: string) => void;
  onReject: (planId: string) => void;
  onModify: (planId: string, feedback: string) => void;
}

const riskColors = {
  low: "text-green-400 bg-green-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  high: "text-red-400 bg-red-400/10",
};

export default function ActionPreview({
  plan,
  onApprove,
  onReject,
  onModify,
}: ActionPreviewProps) {
  const [feedback, setFeedback] = useState("");
  const [showModify, setShowModify] = useState(false);

  return (
    <div className="bg-surface-2 rounded-2xl p-4 border border-surface-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-lume-400 animate-pulse" />
          <span className="text-sm font-medium">Action Preview</span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${riskColors[plan.risk]}`}
        >
          {plan.risk} risk
        </span>
      </div>

      {/* Plan title */}
      <h4 className="text-sm font-semibold mb-3">{plan.title}</h4>

      {/* Steps */}
      <div className="space-y-2 mb-4">
        {plan.steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-xs bg-surface-3 rounded-lg p-2"
          >
            <span className="text-gray-500 font-mono min-w-[1.5rem]">
              {i + 1}.
            </span>
            <div className="flex-1">
              <p className="text-gray-300">{step.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-600 font-mono">{step.tool}</span>
                {!step.reversible && (
                  <span className="text-red-400/70 text-[10px]">
                    irreversible
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modify input */}
      {showModify && (
        <div className="mb-3">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && feedback.trim()) {
                onModify(plan.id, feedback);
                setFeedback("");
                setShowModify(false);
              }
            }}
            placeholder="How should Lume adjust this plan?"
            className="w-full bg-surface-3 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-lume-400/50"
            autoFocus
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(plan.id)}
          className="flex-1 py-2 bg-lume-500 hover:bg-lume-600 text-black font-medium rounded-lg text-xs transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => setShowModify(!showModify)}
          className="px-4 py-2 bg-surface-3 hover:bg-surface-4 rounded-lg text-xs transition-colors"
        >
          Modify
        </button>
        <button
          onClick={() => onReject(plan.id)}
          className="px-4 py-2 bg-surface-3 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
