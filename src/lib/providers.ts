/**
 * Provider registry — latest models from official sources.
 * Updated: 2026-04-15
 */

export interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  tier: "global" | "china" | "opensource" | "relay";
  models: { id: string; name: string }[];
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
      // Latest (from docs.anthropic.com 2026-04)
      { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
      // Legacy (still available)
      { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5" },
      { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
      { id: "claude-opus-4-1-20250805", name: "Claude Opus 4.1" },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
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
      // Frontier (from developers.openai.com 2026-04)
      { id: "gpt-5.4", name: "GPT-5.4" },
      { id: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
      { id: "gpt-5.4-nano", name: "GPT-5.4 Nano" },
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro" },
      // Previous gen
      { id: "gpt-5-mini", name: "GPT-5 Mini" },
      { id: "gpt-5-nano", name: "GPT-5 Nano" },
      // Reasoning
      { id: "o4-mini", name: "o4-mini" },
      { id: "gpt-4o", name: "GPT-4o" },
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
      // Latest (from ai.google.dev 2026-04)
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro" },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
      { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
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
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "mistral-medium-latest", name: "Mistral Medium" },
      { id: "mistral-small-latest", name: "Mistral Small" },
      { id: "codestral-latest", name: "Codestral" },
      { id: "pixtral-large-latest", name: "Pixtral Large" },
      { id: "mistral-embed", name: "Mistral Embed" },
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
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
      { id: "deepseek-r1-0528", name: "DeepSeek R1-0528" },
      { id: "deepseek-v2.5", name: "DeepSeek V2.5" },
      { id: "deepseek-coder", name: "DeepSeek Coder" },
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
      { id: "glm-4-plus", name: "GLM-4 Plus" },
      { id: "glm-4-air", name: "GLM-4 Air" },
      { id: "glm-4-airx", name: "GLM-4 AirX" },
      { id: "glm-4-flash", name: "GLM-4 Flash" },
      { id: "glm-4-long", name: "GLM-4 Long" },
      { id: "glm-4v-plus", name: "GLM-4V Plus" },
    ],
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    icon: "K",
    color: "#6c5ce7",
    tier: "china",
    apiKeyPlaceholder: "sk-...",
    signupUrl: "https://platform.moonshot.cn",
    models: [
      { id: "moonshot-v1-auto", name: "Kimi Auto" },
      { id: "moonshot-v1-128k", name: "Kimi 128K" },
      { id: "moonshot-v1-32k", name: "Kimi 32K" },
      { id: "moonshot-v1-8k", name: "Kimi 8K" },
      { id: "kimi-latest", name: "Kimi Latest" },
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
      { id: "qwen-max", name: "Qwen Max" },
      { id: "qwen-plus", name: "Qwen Plus" },
      { id: "qwen-turbo", name: "Qwen Turbo" },
      { id: "qwen-long", name: "Qwen Long" },
      { id: "qwen-vl-max", name: "Qwen VL Max" },
      { id: "qwen-coder-plus", name: "Qwen Coder Plus" },
      { id: "qwen2.5-72b-instruct", name: "Qwen 2.5 72B" },
    ],
  },
  {
    id: "doubao",
    name: "Doubao (ByteDance)",
    icon: "D",
    color: "#00d4aa",
    tier: "china",
    apiKeyPlaceholder: "...",
    signupUrl: "https://console.volcengine.com/ark",
    models: [
      { id: "doubao-1.5-pro-256k", name: "Doubao 1.5 Pro 256K" },
      { id: "doubao-1.5-pro-32k", name: "Doubao 1.5 Pro 32K" },
      { id: "doubao-1.5-lite-32k", name: "Doubao 1.5 Lite 32K" },
      { id: "doubao-pro-256k", name: "Doubao Pro 256K" },
      { id: "doubao-lite-128k", name: "Doubao Lite 128K" },
      { id: "doubao-vision-pro-32k", name: "Doubao Vision Pro" },
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
      { id: "Baichuan4-Air", name: "Baichuan 4 Air" },
      { id: "Baichuan4-Turbo", name: "Baichuan 4 Turbo" },
      { id: "Baichuan4", name: "Baichuan 4" },
      { id: "Baichuan3-Turbo-128k", name: "Baichuan 3 Turbo 128K" },
      { id: "Baichuan3-Turbo", name: "Baichuan 3 Turbo" },
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
      { id: "MiniMax-Text-01", name: "MiniMax Text 01" },
      { id: "abab6.5s-chat", name: "abab 6.5s" },
      { id: "abab6.5t-chat", name: "abab 6.5t" },
      { id: "abab6.5g-chat", name: "abab 6.5g" },
      { id: "abab5.5-chat", name: "abab 5.5" },
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
      { id: "step-2-16k", name: "Step 2 16K" },
      { id: "step-1-256k", name: "Step 1 256K" },
      { id: "step-1-128k", name: "Step 1 128K" },
      { id: "step-1-32k", name: "Step 1 32K" },
      { id: "step-1v-32k", name: "Step 1V 32K" },
    ],
  },
  {
    id: "yi",
    name: "Yi (01.AI)",
    icon: "Y",
    color: "#1e40af",
    tier: "china",
    apiKeyPlaceholder: "...",
    signupUrl: "https://platform.lingyiwanwu.com",
    models: [
      { id: "yi-lightning", name: "Yi Lightning" },
      { id: "yi-large", name: "Yi Large" },
      { id: "yi-large-turbo", name: "Yi Large Turbo" },
      { id: "yi-medium", name: "Yi Medium" },
      { id: "yi-vision", name: "Yi Vision" },
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
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Llama 70B" },
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
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B" },
      { id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", name: "Llama 3.1 70B" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen 2.5 72B" },
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1" },
      { id: "mistralai/Mixtral-8x22B-Instruct-v0.1", name: "Mixtral 8x22B" },
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
      { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6" },
      { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6" },
      { id: "openai/gpt-5.4", name: "GPT-5.4" },
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3" },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
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
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
      { id: "Pro/deepseek-ai/DeepSeek-R1", name: "DeepSeek R1" },
      { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B" },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B" },
      { id: "THUDM/glm-4-9b-chat", name: "GLM-4 9B" },
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
