import { useState, useEffect } from "react";

interface SettingsConfig {
  apiProvider: "anthropic" | "relay" | "custom";
  apiKey: string;
  model: string;
  relayEndpoint: string;
  feishuToken: string;
  telegramToken: string;
  dingtalkToken: string;
  actionPreview: boolean;
  theme: "dark" | "light";
}

const DEFAULT_CONFIG: SettingsConfig = {
  apiProvider: "relay",
  apiKey: "",
  model: "claude-sonnet-4-20250514",
  relayEndpoint: "https://api.lume.dev/v1",
  feishuToken: "",
  telegramToken: "",
  dingtalkToken: "",
  actionPreview: true,
  theme: "dark",
};

const MODELS = [
  { id: "claude-opus-4-20250514", name: "Claude Opus 4", tier: "Most capable" },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    tier: "Balanced",
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    tier: "Fast & affordable",
  },
];

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<SettingsConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lume_settings");
    if (stored) {
      setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("lume_settings", JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (partial: Partial<SettingsConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-1 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-1 p-4 border-b border-surface-3 flex justify-between items-center">
          <h2 className="font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-sm"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* AI Provider */}
          <section>
            <h3 className="text-sm font-medium mb-3">AI Provider</h3>
            <div className="space-y-2">
              {[
                {
                  id: "relay" as const,
                  label: "Built-in Relay (no API key needed)",
                  desc: "Use Lume's relay service. Just works.",
                },
                {
                  id: "anthropic" as const,
                  label: "Anthropic Direct",
                  desc: "Use your own Anthropic API key.",
                },
                {
                  id: "custom" as const,
                  label: "Custom Endpoint",
                  desc: "ZenMux, OpenRouter, or other compatible API.",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => update({ apiProvider: opt.id })}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                    config.apiProvider === opt.id
                      ? "bg-lume-400/15 ring-1 ring-lume-400/30"
                      : "bg-surface-2 hover:bg-surface-3"
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            {config.apiProvider === "anthropic" && (
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder="sk-ant-..."
                className="mt-3 w-full bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 font-mono"
              />
            )}

            {config.apiProvider === "custom" && (
              <input
                value={config.relayEndpoint}
                onChange={(e) => update({ relayEndpoint: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="mt-3 w-full bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 font-mono"
              />
            )}
          </section>

          {/* Model */}
          <section>
            <h3 className="text-sm font-medium mb-3">Model</h3>
            <div className="space-y-1.5">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => update({ model: m.id })}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    config.model === m.id
                      ? "bg-lume-400/15 ring-1 ring-lume-400/30"
                      : "bg-surface-2 hover:bg-surface-3"
                  }`}
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{m.tier}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Bot Tokens */}
          <section>
            <h3 className="text-sm font-medium mb-3">Bot Gateway (optional)</h3>
            <div className="space-y-2">
              {[
                {
                  key: "feishuToken" as const,
                  label: "Feishu/Lark",
                  placeholder: "App Token",
                },
                {
                  key: "telegramToken" as const,
                  label: "Telegram",
                  placeholder: "Bot Token from @BotFather",
                },
                {
                  key: "dingtalkToken" as const,
                  label: "DingTalk",
                  placeholder: "Robot Token",
                },
              ].map((bot) => (
                <div key={bot.key}>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {bot.label}
                  </label>
                  <input
                    type="password"
                    value={config[bot.key]}
                    onChange={(e) => update({ [bot.key]: e.target.value })}
                    placeholder={bot.placeholder}
                    className="w-full bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 font-mono"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Action Preview Toggle */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Action Preview</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Show execution plan before every action
                </p>
              </div>
              <button
                onClick={() =>
                  update({ actionPreview: !config.actionPreview })
                }
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  config.actionPreview ? "bg-lume-500" : "bg-surface-4"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                    config.actionPreview ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </section>
        </div>

        {/* Save */}
        <div className="sticky bottom-0 bg-surface-1 p-4 border-t border-surface-3">
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
