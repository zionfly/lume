/**
 * AgentRouter: Multi-model routing with Claude as the primary model.
 *
 * Builds the system prompt with:
 * - Memory Layer 1 (USER.md) + Layer 2 (ENV.md) as system context
 * - L0 skill summaries (names + descriptions only)
 * - Action preview instructions (always show plan before executing)
 */

import Anthropic from "@anthropic-ai/sdk";

interface ChatRequest {
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
  systemContext: string;
  skillsSummary: string[];
}

interface ChatResponse {
  content: string;
  tokenUsage: { input: number; output: number };
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>;
  skillUpdate?: { name: string; action: "created" | "updated" };
}

export class AgentRouter {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic();
    }
    return this.client;
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const systemPrompt = this.buildSystemPrompt(
      req.systemContext,
      req.skillsSummary
    );

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        content:
          "No API key configured. Please set up your AI model in Settings, or use the built-in relay.",
        tokenUsage: { input: 0, output: 0 },
      };
    }

    try {
      const client = this.getClient();
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: req.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return {
        content: textBlock?.text ?? "",
        tokenUsage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      };
    } catch (err) {
      return {
        content: `LLM error: ${err instanceof Error ? err.message : String(err)}`,
        tokenUsage: { input: 0, output: 0 },
      };
    }
  }

  private buildSystemPrompt(
    memoryContext: string,
    skillsSummary: string[]
  ): string {
    const skillsList =
      skillsSummary.length > 0
        ? `\n<available_skills>\n${skillsSummary.join("\n")}\n</available_skills>`
        : "";

    return `You are Lume, an AI assistant that illuminates the user's workflow. You grow smarter with every interaction through your memory and skill systems.

## Core Principles
1. **Action Preview**: Always show your execution plan before taking action. Wait for user confirmation.
2. **Memory-Aware**: Use the user profile and environment context below to personalize responses.
3. **Skill-Driven**: When a task matches a known skill, use it. When you discover a reusable pattern, note it for skill creation.
4. **Progressive**: Start simple, add complexity only when needed.

${memoryContext}
${skillsList}

## Behavior
- Be concise and direct
- Show your reasoning for non-trivial decisions
- When executing multi-step tasks, present the plan first
- Track errors and solutions for future skill creation
- Respect the user's tool preferences and communication style`;
  }
}
