import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PROVIDERS, TIER_LABELS, getProviderById } from "../lib/providers";

interface SettingsConfig {
  provider: string;
  model: string;
  apiKey: string;
  customBaseUrl: string;
  actionPreview: boolean;
  feishuToken: string;
  telegramToken: string;
  dingtalkToken: string;
}

const DEFAULT_CONFIG: SettingsConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  apiKey: "",
  customBaseUrl: "",
  actionPreview: true,
  feishuToken: "",
  telegramToken: "",
  dingtalkToken: "",
};

interface SettingsProps {
  onClose: () => void;
}

type Tab = "models" | "bots" | "advanced";

export default function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<SettingsConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("models");
  const [authStatus, setAuthStatus] = useState<
    Record<string, "none" | "loading" | "connected">
  >({});
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lume_settings");
    if (stored) {
      const parsed = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      setConfig(parsed);
      // Mark providers that have keys as connected
      if (parsed.apiKey) {
        setAuthStatus((s) => ({ ...s, [parsed.provider]: "connected" }));
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("lume_settings", JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (partial: Partial<SettingsConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  const selectedProvider = getProviderById(config.provider);

  // Map provider ID to login URL (same as backend, for fallback)
  const LOGIN_URLS: Record<string, string> = {
    anthropic: "https://console.anthropic.com/login",
    openai: "https://platform.openai.com/login",
    google: "https://aistudio.google.com",
    deepseek: "https://platform.deepseek.com/sign_in",
    mistral: "https://console.mistral.ai",
    moonshot: "https://platform.moonshot.cn/console",
    zhipu: "https://open.bigmodel.cn/login",
    qwen: "https://dashscope.console.aliyun.com",
    doubao: "https://console.volcengine.com/ark",
    baichuan: "https://platform.baichuan-ai.com",
    minimax: "https://www.minimaxi.com/platform",
    stepfun: "https://platform.stepfun.com",
    yi: "https://platform.lingyiwanwu.com",
    groq: "https://console.groq.com",
    together: "https://api.together.xyz",
    openrouter: "https://openrouter.ai/settings/keys",
    siliconflow: "https://cloud.siliconflow.cn",
  };

  const handleOAuthLogin = async (providerId: string) => {
    setAuthStatus((s) => ({ ...s, [providerId]: "loading" }));
    try {
      // Start OAuth flow (PKCE for OpenAI, browser-open for others)
      await invoke("start_oauth", { provider: providerId });

      if (providerId === "openai") {
        // Poll for OAuth result — OpenAI returns a real token
        const pollInterval = setInterval(async () => {
          try {
            const result = await invoke<{
              provider: string;
              access_token: string | null;
              error: string | null;
              status: string;
            } | null>("poll_oauth_result");

            if (result && result.status === "success" && result.access_token) {
              clearInterval(pollInterval);
              update({ apiKey: result.access_token });
              setAuthStatus((s) => ({ ...s, [providerId]: "connected" }));
              setTestResult({
                success: true,
                message: "Authenticated via OAuth!",
              });
            } else if (result && result.status === "error") {
              clearInterval(pollInterval);
              setAuthStatus((s) => ({ ...s, [providerId]: "none" }));
              setTestResult({
                success: false,
                message: result.error || "OAuth failed",
              });
            }
          } catch {
            // ignore poll errors
          }
        }, 1500);

        // Stop polling after 3 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setAuthStatus((s) => ({
            ...s,
            [providerId]:
              s[providerId] === "loading" ? "none" : s[providerId],
          }));
        }, 180000);
      } else {
        // Non-OAuth providers: just opened browser, wait a bit
        setTimeout(() => {
          setAuthStatus((s) => ({
            ...s,
            [providerId]: config.apiKey ? "connected" : "none",
          }));
        }, 2000);
      }
    } catch {
      // Fallback: open URL directly from webview
      const url = LOGIN_URLS[providerId];
      if (url) window.open(url, "_blank");
      setTimeout(() => {
        setAuthStatus((s) => ({
          ...s,
          [providerId]: config.apiKey ? "connected" : "none",
        }));
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-1 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-3 flex justify-between items-center shrink-0">
          <h2 className="font-semibold text-lg">Settings</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-colors"
          >
            x
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-3 px-5 shrink-0">
          {(
            [
              ["models", "Models"],
              ["bots", "Bot Gateway"],
              ["advanced", "Advanced"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`py-2.5 px-4 text-sm font-medium transition-colors border-b-2 ${
                tab === id
                  ? "text-lume-400 border-lume-400"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === "models" && (
            <>
              {/* ── Provider dropdown ── */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">
                  Provider
                </label>
                <select
                  value={config.provider}
                  onChange={(e) => {
                    const p = getProviderById(e.target.value);
                    update({
                      provider: e.target.value,
                      model: p?.models[0]?.id || "",
                      apiKey: "", // reset key when switching
                    });
                  }}
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 appearance-none cursor-pointer"
                >
                  {Object.entries(TIER_LABELS).map(([tier, label]) => {
                    const group = PROVIDERS.filter((p) => p.tier === tier);
                    if (group.length === 0) return null;
                    return (
                      <optgroup key={tier} label={`── ${label} ──`}>
                        {group.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.models.length} models)
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {/* ── Model dropdown ── */}
              {selectedProvider && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-2 block">
                    Model
                  </label>
                  <select
                    value={config.model}
                    onChange={(e) => update({ model: e.target.value })}
                    className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 appearance-none cursor-pointer"
                  >
                    {selectedProvider.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Authentication ── */}
              {selectedProvider && (
                <div className="bg-surface-2 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: selectedProvider.color }}
                      >
                        {selectedProvider.icon}
                      </div>
                      <span className="text-sm font-medium">
                        {selectedProvider.name} Authentication
                      </span>
                    </div>
                    {authStatus[config.provider] === "connected" && (
                      <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                        Connected
                      </span>
                    )}
                  </div>

                  {/* Login button — opens provider's auth/key page */}
                  <button
                    onClick={() => handleOAuthLogin(config.provider)}
                    disabled={authStatus[config.provider] === "loading"}
                    className="w-full py-2.5 bg-surface-3 hover:bg-surface-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {authStatus[config.provider] === "loading" ? (
                      <>
                        <span className="w-3 h-3 border-2 border-lume-400 border-t-transparent rounded-full animate-spin" />
                        Opening {selectedProvider.name}...
                      </>
                    ) : (
                      <>
                        {config.provider === "openai"
                          ? `Sign in with OpenAI OAuth`
                          : `Sign in to ${selectedProvider.name}`}
                        <span className="text-xs text-gray-500">
                          {config.provider === "openai"
                            ? "(auto-connects)"
                            : "(opens browser)"}
                        </span>
                      </>
                    )}
                  </button>

                  {/* API Key input + Connect button */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Or paste your API Key directly
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={config.apiKey}
                        onChange={(e) => {
                          update({ apiKey: e.target.value });
                          setTestResult(null);
                        }}
                        placeholder={selectedProvider.apiKeyPlaceholder}
                        className="flex-1 bg-surface-3 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 font-mono"
                      />
                      <button
                        disabled={!config.apiKey || testing}
                        onClick={async () => {
                          setTesting(true);
                          setTestResult(null);
                          try {
                            const result = await invoke<{
                              success: boolean;
                              message: string;
                              latency_ms: number;
                            }>("test_connection", {
                              provider: config.provider,
                              apiKey: config.apiKey,
                              model: config.model,
                              baseUrl: config.customBaseUrl || null,
                            });
                            setTestResult(result);
                            if (result.success) {
                              setAuthStatus((s) => ({
                                ...s,
                                [config.provider]: "connected",
                              }));
                            }
                          } catch (err) {
                            setTestResult({
                              success: false,
                              message: String(err),
                            });
                          } finally {
                            setTesting(false);
                          }
                        }}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                          !config.apiKey || testing
                            ? "bg-surface-3 text-gray-600 cursor-not-allowed"
                            : "bg-lume-500 hover:bg-lume-600 text-black"
                        }`}
                      >
                        {testing ? (
                          <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin inline-block" />
                        ) : (
                          "Connect"
                        )}
                      </button>
                    </div>
                    {/* Connection test result */}
                    {testResult && (
                      <div
                        className={`mt-2 text-xs px-3 py-2 rounded-lg ${
                          testResult.success
                            ? "bg-green-400/10 text-green-400"
                            : "bg-red-400/10 text-red-400"
                        }`}
                      >
                        {testResult.message}
                      </div>
                    )}
                  </div>

                  {/* Custom base URL for custom provider or overrides */}
                  {(config.provider === "custom" ||
                    config.provider === "siliconflow" ||
                    config.provider === "openrouter") && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Base URL (optional override)
                      </label>
                      <input
                        value={config.customBaseUrl}
                        onChange={(e) =>
                          update({ customBaseUrl: e.target.value })
                        }
                        placeholder="https://api.example.com/v1"
                        className="w-full bg-surface-3 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 font-mono"
                      />
                    </div>
                  )}

                  <a
                    href={selectedProvider.signupUrl}
                    target="_blank"
                    rel="noopener"
                    className="block text-xs text-lume-400 hover:underline"
                  >
                    Don't have an account? Sign up at {selectedProvider.name} →
                  </a>
                </div>
              )}

              {/* ── Quick switch: recent models ── */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">
                  Popular Models
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { p: "anthropic", m: "claude-opus-4-6", label: "Claude Opus 4.6" },
                    { p: "openai", m: "gpt-5.4", label: "GPT-5.4" },
                    { p: "google", m: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
                    { p: "deepseek", m: "deepseek-chat", label: "DeepSeek V3" },
                    { p: "openai", m: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
                    { p: "groq", m: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
                  ].map((item) => {
                    const prov = getProviderById(item.p);
                    const isActive =
                      config.provider === item.p && config.model === item.m;
                    return (
                      <button
                        key={item.m}
                        onClick={() =>
                          update({ provider: item.p, model: item.m })
                        }
                        className={`text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                          isActive
                            ? "bg-lume-400/10 ring-1 ring-lume-400/30 text-lume-300"
                            : "bg-surface-2 hover:bg-surface-3 text-gray-400"
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ backgroundColor: prov?.color || "#666" }}
                        >
                          {prov?.icon}
                        </div>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === "bots" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Connect Lume to messaging platforms. Skills become slash
                commands.
              </p>
              {[
                {
                  key: "feishuToken" as const,
                  label: "Feishu / Lark",
                  placeholder: "App Token from Feishu Open Platform",
                  color: "#3370ff",
                },
                {
                  key: "telegramToken" as const,
                  label: "Telegram",
                  placeholder: "Bot Token from @BotFather",
                  color: "#229ed9",
                },
                {
                  key: "dingtalkToken" as const,
                  label: "DingTalk",
                  placeholder: "Robot Token",
                  color: "#0089ff",
                },
              ].map((bot) => (
                <div
                  key={bot.key}
                  className="bg-surface-2 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-md"
                      style={{ backgroundColor: bot.color }}
                    />
                    <span className="text-sm font-medium">{bot.label}</span>
                    {config[bot.key] && (
                      <span className="ml-auto text-xs text-green-400">
                        Connected
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={config[bot.key]}
                    onChange={(e) => update({ [bot.key]: e.target.value })}
                    placeholder={bot.placeholder}
                    className="w-full bg-surface-3 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 font-mono"
                  />
                </div>
              ))}
            </div>
          )}

          {tab === "advanced" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-surface-2 rounded-xl p-4">
                <div>
                  <h4 className="text-sm font-medium">Action Preview</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Show execution plan before every action
                  </p>
                </div>
                <button
                  onClick={() =>
                    update({ actionPreview: !config.actionPreview })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    config.actionPreview ? "bg-lume-500" : "bg-surface-4"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                      config.actionPreview
                        ? "translate-x-[22px]"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="bg-surface-2 rounded-xl p-4">
                <h4 className="text-sm font-medium mb-2">Current Config</h4>
                <div className="space-y-1 text-xs font-mono text-gray-400">
                  <div>provider: {config.provider}</div>
                  <div>model: {config.model}</div>
                  <div>
                    api_key:{" "}
                    {config.apiKey ? "***configured***" : "(not set)"}
                  </div>
                  <div>action_preview: {String(config.actionPreview)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-3 shrink-0">
          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-lume-500 hover:bg-lume-600 text-black font-medium rounded-xl text-sm transition-colors"
          >
            {saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
