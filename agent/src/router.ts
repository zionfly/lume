/**
 * AgentRouter: Universal multi-model routing.
 *
 * Supports 20+ providers via two API formats:
 * - Anthropic format (Anthropic Claude)
 * - OpenAI-compatible format (everyone else)
 *
 * Builds the system prompt with memory layers + skill summaries.
 */

import Anthropic from "@anthropic-ai/sdk";
import { PROVIDERS, getProvider, type ProviderConfig } from "./providers";

interface ChatRequest {
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
  systemContext: string;
  skillsSummary: string[];
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

interface ChatResponse {
  content: string;
  tokenUsage: { input: number; output: number };
  model: string;
  provider: string;
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>;
  skillUpdate?: { name: string; action: "created" | "updated" };
}

export class AgentRouter {
  private anthropicClients = new Map<string, Anthropic>();

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const systemPrompt = this.buildSystemPrompt(
      req.systemContext,
      req.skillsSummary
    );

    const providerId = req.provider || process.env.LUME_PROVIDER || "anthropic";
    const provider = getProvider(providerId);
    if (!provider) {
      return this.errorResponse(providerId, `Unknown provider: ${providerId}`);
    }

    const modelId =
      req.model ||
      process.env.LUME_MODEL ||
      provider.models[0]?.id ||
      "claude-sonnet-4-20250514";

    const apiKey =
      req.apiKey ||
      process.env[provider.apiKeyEnv] ||
      process.env.LUME_API_KEY ||
      "";

    if (!apiKey) {
      return {
        content: `No API key for ${provider.name}. Set it in Settings or as environment variable ${provider.apiKeyEnv}.`,
        tokenUsage: { input: 0, output: 0 },
        model: modelId,
        provider: providerId,
      };
    }

    const baseUrl = req.baseUrl || process.env.LUME_BASE_URL || provider.baseUrl;

    try {
      if (provider.format === "anthropic") {
        return await this.callAnthropic(
          apiKey,
          baseUrl,
          modelId,
          providerId,
          systemPrompt,
          req.messages
        );
      } else {
        return await this.callOpenAICompatible(
          apiKey,
          baseUrl,
          modelId,
          providerId,
          systemPrompt,
          req.messages
        );
      }
    } catch (err) {
      return this.errorResponse(
        providerId,
        err instanceof Error ? err.message : String(err),
        modelId
      );
    }
  }

  // ─────────── Anthropic Native ───────────

  private async callAnthropic(
    apiKey: string,
    baseUrl: string,
    model: string,
    provider: string,
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<ChatResponse> {
    const cacheKey = `${baseUrl}:${apiKey.slice(0, 8)}`;
    let client = this.anthropicClients.get(cacheKey);
    if (!client) {
      client = new Anthropic({
        apiKey,
        baseURL: baseUrl !== "https://api.anthropic.com" ? baseUrl : undefined,
      });
      this.anthropicClients.set(cacheKey, client);
    }

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({
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
      model,
      provider,
    };
  }

  // ─────────── OpenAI-Compatible (covers 90% of providers) ───────────

  private async callOpenAICompatible(
    apiKey: string,
    baseUrl: string,
    model: string,
    provider: string,
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<ChatResponse> {
    const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    const body = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      max_tokens: 4096,
      temperature: 0.7,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${provider} API error ${response.status}: ${errorText.slice(0, 500)}`
      );
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: { content: string; role: string };
      }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
      };
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    return {
      content,
      tokenUsage: {
        input: data.usage?.prompt_tokens ?? 0,
        output: data.usage?.completion_tokens ?? 0,
      },
      model,
      provider,
    };
  }

  // ─────────── System Prompt Builder ───────────

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

  private errorResponse(
    provider: string,
    error: string,
    model?: string
  ): ChatResponse {
    return {
      content: `[${provider}] Error: ${error}`,
      tokenUsage: { input: 0, output: 0 },
      model: model || "unknown",
      provider,
    };
  }
}
