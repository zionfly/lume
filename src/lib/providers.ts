/**
 * Provider registry for the frontend Settings UI.
 * Mirrors agent/src/providers.ts but lightweight (no runtime deps).
 */

export interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  tier: "global" | "china" | "opensource" | "relay";
  models: { id: string; name: string; tier: string }[];
  apiKeyPlaceholder: string;
  signupUrl: string;
}

export const PROVIDERS: ProviderInfo[] = [
  // ── Global Leaders ──
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "A",
    color: "#d97757",
    tier: "global",
    apiKeyPlaceholder: "sk-ant-api03-...",
    signupUrl: "https://console.anthropic.com",
    models: [
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", tier: "Most capable" },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", tier: "Balanced" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", tier: "Fast" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "O",
    color: "#10a37f",
    tier: "global",
    apiKeyPlaceholder: "sk-proj-...",
    signupUrl: "https://platform.openai.com",
    models: [
      { id: "gpt-4o", name: "GPT-4o", tier: "Flagship" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", tier: "Fast & cheap" },
      { id: "o3", name: "o3", tier: "Reasoning" },
      { id: "o4-mini", name: "o4-mini", tier: "Reasoning (fast)" },
    ],
  },
  {
    id: "google",
    name: "Google Gemini",
    icon: "G",
    color: "#4285f4",
    tier: "global",
    apiKeyPlaceholder: "AIza...",
    signupUrl: "https://aistudio.google.com",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "Most capable" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "Fast" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    icon: "M",
    color: "#ff7000",
    tier: "global",
    apiKeyPlaceholder: "...",
    signupUrl: "https://console.mistral.ai",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large", tier: "Most capable" },
      { id: "codestral-latest", name: "Codestral", tier: "Code" },
    ],
  },

  // ── China Domestic ──
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "D",
    color: "#4d6bfe",
    tier: "china",
    apiKeyPlaceholder: "sk-...",
    signupUrl: "https://platform.deepseek.com",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3", tier: "Balanced" },
      { id: "deepseek-reasoner", name: "DeepSeek R1", tier: "Reasoning" },
    ],
  },
  {
    id: "zhipu",
    name: "Zhipu GLM",
    icon: "Z",
    color: "#3259f8",
    tier: "china",
    apiKeyPlaceholder: "...",
    signupUrl: "https://open.bigmodel.cn",
    models: [
      { id: "glm-4-plus", name: "GLM-4 Plus", tier: "Most capable" },
      { id: "glm-4-flash", name: "GLM-4 Flash", tier: "Fast & free" },
      { id: "glm-4-long", name: "GLM-4 Long", tier: "1M context" },
    ],
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    icon: "K",
    color: "#1a1a2e",
    tier: "china",
    apiKeyPlaceholder: "sk-...",
    signupUrl: "https://platform.moonshot.cn",
    models: [
      { id: "moonshot-v1-128k", name: "Kimi 128K", tier: "Long context" },
      { id: "moonshot-v1-32k", name: "Kimi 32K", tier: "Balanced" },
    ],
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    icon: "Q",
    color: "#6236ff",
    tier: "china",
    apiKeyPlaceholder: "sk-...",
    signupUrl: "https://dashscope.console.aliyun.com",
    models: [
      { id: "qwen-max", name: "Qwen Max", tier: "Most capable" },
      { id: "qwen-plus", name: "Qwen Plus", tier: "Balanced" },
      { id: "qwen-turbo", name: "Qwen Turbo", tier: "Fast" },
      { id: "qwen-long", name: "Qwen Long", tier: "10M context" },
    ],
  },
  {
    id: "baichuan",
    name: "Baichuan",
    icon: "B",
    color: "#ff6b35",
    tier: "china",
    apiKeyPlaceholder: "sk-...",
    signupUrl: "https://platform.baichuan-ai.com",
    models: [
      { id: "Baichuan4", name: "Baichuan 4", tier: "Most capable" },
    ],
  },
  {
    id: "minimax",
    name: "MiniMax",
    icon: "X",
    color: "#00d4aa",
    tier: "china",
    apiKeyPlaceholder: "...",
    signupUrl: "https://www.minimaxi.com",
    models: [
      { id: "abab6.5s-chat", name: "abab 6.5s", tier: "Most capable" },
    ],
  },
  {
    id: "stepfun",
    name: "StepFun",
    icon: "S",
    color: "#7c3aed",
    tier: "china",
    apiKeyPlaceholder: "...",
    signupUrl: "https://platform.stepfun.com",
    models: [
      { id: "step-2-16k", name: "Step 2", tier: "Most capable" },
    ],
  },
  {
    id: "yi",
    name: "Yi (01.AI)",
    icon: "Y",
    color: "#333333",
    tier: "china",
    apiKeyPlaceholder: "...",
    signupUrl: "https://platform.lingyiwanwu.com",
    models: [
      { id: "yi-large", name: "Yi Large", tier: "Most capable" },
    ],
  },

  // ── Open-Source Hosts ──
  {
    id: "groq",
    name: "Groq",
    icon: "G",
    color: "#f55036",
    tier: "opensource",
    apiKeyPlaceholder: "gsk_...",
    signupUrl: "https://console.groq.com",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", tier: "Fast" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", tier: "Fast MoE" },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    icon: "T",
    color: "#0ea5e9",
    tier: "opensource",
    apiKeyPlaceholder: "...",
    signupUrl: "https://api.together.xyz",
    models: [
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B", tier: "Largest" },
    ],
  },

  // ── Relays / Aggregators ──
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "R",
    color: "#6366f1",
    tier: "relay",
    apiKeyPlaceholder: "sk-or-...",
    signupUrl: "https://openrouter.ai",
    models: [
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", tier: "Relay" },
      { id: "openai/gpt-4o", name: "GPT-4o", tier: "Relay" },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "Relay" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3", tier: "Relay" },
    ],
  },
  {
    id: "siliconflow",
    name: "Silicon Flow",
    icon: "Si",
    color: "#8b5cf6",
    tier: "relay",
    apiKeyPlaceholder: "sk-...",
    signupUrl: "https://siliconflow.cn",
    models: [
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", tier: "Relay" },
      { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B", tier: "Relay" },
    ],
  },
];

export const TIER_LABELS: Record<string, string> = {
  global: "Global",
  china: "China",
  opensource: "Open-Source Hosts",
  relay: "Aggregators / Relay",
};

export function getProviderById(id: string) {
  return PROVIDERS.find((p) => p.id === id);
}
