import { useState, useEffect } from "react";
import {
  PROVIDERS,
  TIER_LABELS,
  getProviderById,
  type ProviderInfo,
} from "../lib/providers";

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
  model: "claude-sonnet-4-20250514",
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
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("lume_settings");
    if (stored) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
  }, []);

  const handleSave = () => {
    localStorage.setItem("lume_settings", JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (partial: Partial<SettingsConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  const selectedProvider = getProviderById(config.provider);

  const filteredProviders = searchQuery
    ? PROVIDERS.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.models.some((m) =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : PROVIDERS;

  const groupedProviders = Object.entries(TIER_LABELS).map(([tier, label]) => ({
    tier,
    label,
    providers: filteredProviders.filter((p) => p.tier === tier),
  }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-1 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
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
              {/* Search */}
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search providers or models..."
                className="w-full bg-surface-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 placeholder:text-gray-600"
              />

              {/* Provider groups */}
              {groupedProviders.map(
                (group) =>
                  group.providers.length > 0 && (
                    <section key={group.tier}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {group.label}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {group.providers.map((p) => (
                          <ProviderCard
                            key={p.id}
                            provider={p}
                            selected={config.provider === p.id}
                            onClick={() => {
                              update({
                                provider: p.id,
                                model: p.models[0]?.id || "",
                              });
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  )
              )}

              {/* Selected provider details */}
              {selectedProvider && (
                <section className="bg-surface-2 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: selectedProvider.color }}
                    >
                      {selectedProvider.icon}
                    </div>
                    <span className="font-medium text-sm">
                      {selectedProvider.name}
                    </span>
                    <a
                      href={selectedProvider.signupUrl}
                      target="_blank"
                      rel="noopener"
                      className="ml-auto text-xs text-lume-400 hover:underline"
                    >
                      Get API Key
                    </a>
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => update({ apiKey: e.target.value })}
                      placeholder={selectedProvider.apiKeyPlaceholder}
                      className="w-full bg-surface-3 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 font-mono"
                    />
                  </div>

                  {/* Model selector */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Model
                    </label>
                    <div className="space-y-1">
                      {selectedProvider.models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => update({ model: m.id })}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            config.model === m.id
                              ? "bg-lume-400/15 ring-1 ring-lume-400/30 text-lume-300"
                              : "bg-surface-3 hover:bg-surface-4 text-gray-300"
                          }`}
                        >
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {m.tier}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom base URL for custom provider */}
                  {selectedProvider.id === "custom" && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Base URL
                      </label>
                      <input
                        value={config.customBaseUrl}
                        onChange={(e) =>
                          update({ customBaseUrl: e.target.value })
                        }
                        placeholder="http://localhost:11434/v1"
                        className="w-full bg-surface-3 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-lume-400/50 font-mono"
                      />
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {tab === "bots" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Connect Lume to messaging platforms. Skills become slash commands
                automatically.
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
              {/* Action Preview */}
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

              {/* Current config summary */}
              <div className="bg-surface-2 rounded-xl p-4">
                <h4 className="text-sm font-medium mb-2">Current Config</h4>
                <div className="space-y-1 text-xs font-mono text-gray-400">
                  <div>
                    provider: {config.provider}
                  </div>
                  <div>model: {config.model}</div>
                  <div>
                    api_key: {config.apiKey ? "***configured***" : "(not set)"}
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

function ProviderCard({
  provider,
  selected,
  onClick,
}: {
  provider: ProviderInfo;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 ${
        selected
          ? "bg-lume-400/10 ring-1 ring-lume-400/30"
          : "bg-surface-2 hover:bg-surface-3"
      }`}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
        style={{ backgroundColor: provider.color }}
      >
        {provider.icon}
      </div>
      <div className="min-w-0">
        <div className="font-medium truncate">{provider.name}</div>
        <div className="text-[10px] text-gray-500">
          {provider.models.length} model{provider.models.length > 1 ? "s" : ""}
        </div>
      </div>
    </button>
  );
}
