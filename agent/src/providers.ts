/**
 * Multi-Model Provider Registry
 *
 * Supports all mainstream LLM platforms with a unified interface.
 * Each provider adapter normalizes request/response to a common format.
 */

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  models: ModelInfo[];
  format: "anthropic" | "openai";
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  tier: string;
}

export const PROVIDERS: ProviderConfig[] = [
  // ──────────── Tier 1: Global Leaders ────────────
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    format: "anthropic",
    models: [
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000, tier: "Most capable" },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000, tier: "Balanced" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", contextWindow: 200000, tier: "Fast" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    format: "openai",
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, tier: "Flagship" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, tier: "Fast & cheap" },
      { id: "o3", name: "o3", contextWindow: 200000, tier: "Reasoning" },
      { id: "o4-mini", name: "o4-mini", contextWindow: 200000, tier: "Reasoning (fast)" },
    ],
  },
  {
    id: "google",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyEnv: "GOOGLE_API_KEY",
    format: "openai",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, tier: "Most capable" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000, tier: "Fast" },
    ],
  },

  // ──────────── Tier 2: China Domestic ────────────
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    format: "openai",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3", contextWindow: 64000, tier: "Balanced" },
      { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 64000, tier: "Reasoning" },
    ],
  },
  {
    id: "zhipu",
    name: "Zhipu AI (GLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    format: "openai",
    models: [
      { id: "glm-4-plus", name: "GLM-4 Plus", contextWindow: 128000, tier: "Most capable" },
      { id: "glm-4-flash", name: "GLM-4 Flash", contextWindow: 128000, tier: "Fast & free" },
      { id: "glm-4-long", name: "GLM-4 Long", contextWindow: 1000000, tier: "Long context" },
    ],
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeyEnv: "MOONSHOT_API_KEY",
    format: "openai",
    models: [
      { id: "moonshot-v1-128k", name: "Kimi 128K", contextWindow: 128000, tier: "Long context" },
      { id: "moonshot-v1-32k", name: "Kimi 32K", contextWindow: 32000, tier: "Balanced" },
      { id: "moonshot-v1-8k", name: "Kimi 8K", contextWindow: 8000, tier: "Fast" },
    ],
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "DASHSCOPE_API_KEY",
    format: "openai",
    models: [
      { id: "qwen-max", name: "Qwen Max", contextWindow: 32000, tier: "Most capable" },
      { id: "qwen-plus", name: "Qwen Plus", contextWindow: 131072, tier: "Balanced" },
      { id: "qwen-turbo", name: "Qwen Turbo", contextWindow: 131072, tier: "Fast" },
      { id: "qwen-long", name: "Qwen Long", contextWindow: 10000000, tier: "Long context" },
    ],
  },
  {
    id: "baichuan",
    name: "Baichuan",
    baseUrl: "https://api.baichuan-ai.com/v1",
    apiKeyEnv: "BAICHUAN_API_KEY",
    format: "openai",
    models: [
      { id: "Baichuan4", name: "Baichuan 4", contextWindow: 32000, tier: "Most capable" },
      { id: "Baichuan3-Turbo-128k", name: "Baichuan 3 Turbo 128K", contextWindow: 128000, tier: "Fast" },
    ],
  },
  {
    id: "minimax",
    name: "MiniMax",
    baseUrl: "https://api.minimax.chat/v1",
    apiKeyEnv: "MINIMAX_API_KEY",
    format: "openai",
    models: [
      { id: "abab6.5s-chat", name: "abab 6.5s", contextWindow: 245760, tier: "Most capable" },
    ],
  },
  {
    id: "stepfun",
    name: "StepFun",
    baseUrl: "https://api.stepfun.com/v1",
    apiKeyEnv: "STEPFUN_API_KEY",
    format: "openai",
    models: [
      { id: "step-2-16k", name: "Step 2 16K", contextWindow: 16000, tier: "Most capable" },
      { id: "step-1-128k", name: "Step 1 128K", contextWindow: 128000, tier: "Long context" },
    ],
  },
  {
    id: "yi",
    name: "Yi (01.AI)",
    baseUrl: "https://api.lingyiwanwu.com/v1",
    apiKeyEnv: "YI_API_KEY",
    format: "openai",
    models: [
      { id: "yi-large", name: "Yi Large", contextWindow: 32000, tier: "Most capable" },
      { id: "yi-medium", name: "Yi Medium", contextWindow: 16000, tier: "Balanced" },
    ],
  },

  // ──────────── Tier 3: Specialized / Open-Source Hosts ────────────
  {
    id: "mistral",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
    format: "openai",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large", contextWindow: 128000, tier: "Most capable" },
      { id: "mistral-medium-latest", name: "Mistral Medium", contextWindow: 32000, tier: "Balanced" },
      { id: "codestral-latest", name: "Codestral", contextWindow: 32000, tier: "Code" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    format: "openai",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextWindow: 128000, tier: "Fast open-source" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextWindow: 32000, tier: "Fast MoE" },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    apiKeyEnv: "TOGETHER_API_KEY",
    format: "openai",
    models: [
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B", contextWindow: 128000, tier: "Largest open-source" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen 2.5 72B", contextWindow: 32000, tier: "Strong open-source" },
    ],
  },

  // ──────────── Tier 4: Aggregators / Relays ────────────
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    format: "openai",
    models: [
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4 (via OR)", contextWindow: 200000, tier: "Relay" },
      { id: "openai/gpt-4o", name: "GPT-4o (via OR)", contextWindow: 128000, tier: "Relay" },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro (via OR)", contextWindow: 1000000, tier: "Relay" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3 (via OR)", contextWindow: 64000, tier: "Relay" },
    ],
  },
  {
    id: "siliconflow",
    name: "Silicon Flow",
    baseUrl: "https://api.siliconflow.cn/v1",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    format: "openai",
    models: [
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", contextWindow: 64000, tier: "Relay" },
      { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B", contextWindow: 32000, tier: "Relay" },
      { id: "Pro/deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", contextWindow: 64000, tier: "Relay" },
    ],
  },

  // ──────────── Custom / Self-hosted ────────────
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    baseUrl: "http://localhost:11434/v1",
    apiKeyEnv: "CUSTOM_API_KEY",
    format: "openai",
    models: [
      { id: "custom-model", name: "Custom Model", contextWindow: 8000, tier: "Self-hosted" },
    ],
  },
];

export function getProvider(id: string): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getProviderForModel(modelId: string): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.models.some((m) => m.id === modelId));
}
