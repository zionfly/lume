/**
 * Multi-Model Provider Registry
 *
 * Supports all mainstream LLM platforms with a unified interface.
 * Each provider adapter normalizes request/response to a common format.
 * 5-8 latest models per provider.
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
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    format: "anthropic",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", contextWindow: 1000000 },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", contextWindow: 200000 },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000 },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000 },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", contextWindow: 200000 },
      { id: "claude-sonnet-4-5-20250514", name: "Claude Sonnet 4.5", contextWindow: 200000 },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    format: "openai",
    models: [
      { id: "gpt-5.4", name: "GPT-5.4", contextWindow: 200000 },
      { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", contextWindow: 200000 },
      { id: "gpt-5", name: "GPT-5", contextWindow: 200000 },
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000 },
      { id: "o4-mini", name: "o4-mini", contextWindow: 200000 },
      { id: "o3", name: "o3", contextWindow: 200000 },
      { id: "o3-mini", name: "o3-mini", contextWindow: 200000 },
    ],
  },
  {
    id: "google",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyEnv: "GOOGLE_API_KEY",
    format: "openai",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000 },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000 },
      { id: "gemini-2.0-pro", name: "Gemini 2.0 Pro", contextWindow: 1000000 },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 2000000 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextWindow: 1000000 },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    format: "openai",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3", contextWindow: 64000 },
      { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 64000 },
      { id: "deepseek-r1-0528", name: "DeepSeek R1-0528", contextWindow: 64000 },
      { id: "deepseek-v2.5", name: "DeepSeek V2.5", contextWindow: 32000 },
      { id: "deepseek-coder", name: "DeepSeek Coder", contextWindow: 16000 },
    ],
  },
  {
    id: "zhipu",
    name: "Zhipu AI (GLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    format: "openai",
    models: [
      { id: "glm-4-plus", name: "GLM-4 Plus", contextWindow: 128000 },
      { id: "glm-4-air", name: "GLM-4 Air", contextWindow: 128000 },
      { id: "glm-4-airx", name: "GLM-4 AirX", contextWindow: 8000 },
      { id: "glm-4-flash", name: "GLM-4 Flash", contextWindow: 128000 },
      { id: "glm-4-long", name: "GLM-4 Long", contextWindow: 1000000 },
      { id: "glm-4v-plus", name: "GLM-4V Plus", contextWindow: 8000 },
    ],
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeyEnv: "MOONSHOT_API_KEY",
    format: "openai",
    models: [
      { id: "moonshot-v1-auto", name: "Kimi Auto", contextWindow: 128000 },
      { id: "moonshot-v1-128k", name: "Kimi 128K", contextWindow: 128000 },
      { id: "moonshot-v1-32k", name: "Kimi 32K", contextWindow: 32000 },
      { id: "moonshot-v1-8k", name: "Kimi 8K", contextWindow: 8000 },
      { id: "kimi-latest", name: "Kimi Latest", contextWindow: 128000 },
    ],
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "DASHSCOPE_API_KEY",
    format: "openai",
    models: [
      { id: "qwen-max", name: "Qwen Max", contextWindow: 32000 },
      { id: "qwen-plus", name: "Qwen Plus", contextWindow: 131072 },
      { id: "qwen-turbo", name: "Qwen Turbo", contextWindow: 131072 },
      { id: "qwen-long", name: "Qwen Long", contextWindow: 10000000 },
      { id: "qwen-vl-max", name: "Qwen VL Max", contextWindow: 32000 },
      { id: "qwen-coder-plus", name: "Qwen Coder Plus", contextWindow: 131072 },
      { id: "qwen2.5-72b-instruct", name: "Qwen 2.5 72B", contextWindow: 32000 },
    ],
  },
  {
    id: "doubao",
    name: "Doubao (ByteDance)",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    apiKeyEnv: "ARK_API_KEY",
    format: "openai",
    models: [
      { id: "doubao-1.5-pro-256k", name: "Doubao 1.5 Pro 256K", contextWindow: 256000 },
      { id: "doubao-1.5-pro-32k", name: "Doubao 1.5 Pro 32K", contextWindow: 32000 },
      { id: "doubao-1.5-lite-32k", name: "Doubao 1.5 Lite 32K", contextWindow: 32000 },
      { id: "doubao-pro-256k", name: "Doubao Pro 256K", contextWindow: 256000 },
      { id: "doubao-lite-128k", name: "Doubao Lite 128K", contextWindow: 128000 },
      { id: "doubao-vision-pro-32k", name: "Doubao Vision Pro", contextWindow: 32000 },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
    format: "openai",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large", contextWindow: 128000 },
      { id: "mistral-medium-latest", name: "Mistral Medium", contextWindow: 32000 },
      { id: "mistral-small-latest", name: "Mistral Small", contextWindow: 32000 },
      { id: "codestral-latest", name: "Codestral", contextWindow: 32000 },
      { id: "pixtral-large-latest", name: "Pixtral Large", contextWindow: 128000 },
      { id: "mistral-embed", name: "Mistral Embed", contextWindow: 8000 },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    format: "openai",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextWindow: 128000 },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", contextWindow: 128000 },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextWindow: 32000 },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", contextWindow: 8000 },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Llama 70B", contextWindow: 128000 },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    format: "openai",
    models: [
      { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6", contextWindow: 1000000 },
      { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6", contextWindow: 200000 },
      { id: "openai/gpt-5.4", name: "GPT-5.4", contextWindow: 200000 },
      { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128000 },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000 },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3", contextWindow: 64000 },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", contextWindow: 128000 },
    ],
  },
  {
    id: "siliconflow",
    name: "Silicon Flow",
    baseUrl: "https://api.siliconflow.cn/v1",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    format: "openai",
    models: [
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", contextWindow: 64000 },
      { id: "Pro/deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", contextWindow: 64000 },
      { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B", contextWindow: 32000 },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B", contextWindow: 32000 },
      { id: "THUDM/glm-4-9b-chat", name: "GLM-4 9B", contextWindow: 128000 },
    ],
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    baseUrl: "http://localhost:11434/v1",
    apiKeyEnv: "CUSTOM_API_KEY",
    format: "openai",
    models: [
      { id: "custom-model", name: "Custom Model", contextWindow: 8000 },
    ],
  },
];

export function getProvider(id: string): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
