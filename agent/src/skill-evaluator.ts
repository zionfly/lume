/**
 * SkillEvaluator: Auto-generates skills from execution history.
 *
 * Triggers every 15 tool calls. Evaluates whether the recent execution
 * pattern should become a reusable skill.
 *
 * Criteria for skill creation:
 * 1. Complex task completed (5+ tool calls in sequence)
 * 2. Error encountered and resolved (learning moment)
 * 3. User corrected the agent's approach (preference capture)
 */

interface ToolLog {
  name: string;
  input: Record<string, unknown>;
  output: string;
  status: "success" | "error";
  duration_ms: number;
}

interface SkillCandidate {
  name: string;
  action: "created" | "updated";
  content: string;
}

const CHECKPOINT_INTERVAL = 15;

export class SkillEvaluator {
  private callCount = 0;

  shouldEvaluate(): boolean {
    this.callCount++;
    return this.callCount % CHECKPOINT_INTERVAL === 0;
  }

  async evaluate(
    _sessionId: string,
    messages: Array<{ role: string; content: string }>,
    recentLogs: ToolLog[]
  ): Promise<SkillCandidate | null> {
    // Check criteria
    const hasComplexTask = recentLogs.length >= 5;
    const hasErrorRecovery = recentLogs.some(
      (l, i) =>
        l.status === "error" &&
        i < recentLogs.length - 1 &&
        recentLogs[i + 1].status === "success"
    );
    const hasUserCorrection = messages.some(
      (m, i) =>
        m.role === "user" &&
        i > 0 &&
        messages[i - 1].role === "assistant" &&
        (m.content.toLowerCase().includes("no,") ||
          m.content.toLowerCase().includes("not that") ||
          m.content.toLowerCase().includes("instead"))
    );

    if (!hasComplexTask && !hasErrorRecovery && !hasUserCorrection) {
      return null;
    }

    // Generate skill from the pattern
    const skillName = this.deriveSkillName(recentLogs);
    const skillContent = this.generateSkillMd(
      skillName,
      recentLogs,
      messages,
      { hasComplexTask, hasErrorRecovery, hasUserCorrection }
    );

    return {
      name: skillName,
      action: "created",
      content: skillContent,
    };
  }

  private deriveSkillName(logs: ToolLog[]): string {
    // Use the most common tool as the base name
    const toolCounts = new Map<string, number>();
    for (const log of logs) {
      toolCounts.set(log.name, (toolCounts.get(log.name) || 0) + 1);
    }
    const topTool = [...toolCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const timestamp = Date.now().toString(36);
    return `${topTool?.[0] || "task"}-${timestamp}`;
  }

  private generateSkillMd(
    name: string,
    logs: ToolLog[],
    _messages: Array<{ role: string; content: string }>,
    criteria: {
      hasComplexTask: boolean;
      hasErrorRecovery: boolean;
      hasUserCorrection: boolean;
    }
  ): string {
    const steps = logs
      .filter((l) => l.status === "success")
      .map((l, i) => `${i + 1}. Execute \`${l.name}\` with appropriate params`);

    const pitfalls = logs
      .filter((l) => l.status === "error")
      .map((l) => `- \`${l.name}\` may fail: check input format`);

    const trigger = criteria.hasComplexTask
      ? "When performing a similar multi-step task"
      : criteria.hasErrorRecovery
        ? "When encountering this type of error"
        : "When user requests this pattern";

    return `---
name: "${name}"
description: "Auto-generated skill from execution pattern"
trigger: "${trigger}"
version: 1
auto_generated: true
---

# ${name}

## When to Use
${trigger}

## Steps
${steps.join("\n")}

## Pitfalls
${pitfalls.length > 0 ? pitfalls.join("\n") : "- None documented yet"}

## Verification
- Check that all steps completed successfully
- Verify output matches expected format
`;
  }
}
