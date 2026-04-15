/**
 * Lume Bot Gateway
 *
 * Unified gateway for multi-platform bot integrations.
 * Each platform (Feishu, Telegram, DingTalk) has its own adapter,
 * but they share the same Agent logic and skill system.
 *
 * Architecture:
 *   Platform Adapter → Gateway Router → Agent Core → Response Formatter
 *
 * Security:
 * - Sensitive operations route to the Lume desktop app for approval
 * - Secrets are never exposed in chat messages
 * - Slash commands map directly to skills
 */

import { FeishuAdapter } from "../adapters/feishu";
import { TelegramAdapter } from "../adapters/telegram";
import { DingTalkAdapter } from "../adapters/dingtalk";

export interface BotMessage {
  platform: "feishu" | "telegram" | "dingtalk";
  userId: string;
  chatId: string;
  text: string;
  isSlashCommand: boolean;
  command?: string;
  args?: string;
}

export interface BotResponse {
  text: string;
  requiresApproval?: boolean;
  approvalAction?: string;
}

export class BotGateway {
  private adapters: Map<string, FeishuAdapter | TelegramAdapter | DingTalkAdapter>;

  constructor() {
    this.adapters = new Map();
  }

  registerAdapter(
    platform: string,
    adapter: FeishuAdapter | TelegramAdapter | DingTalkAdapter
  ) {
    this.adapters.set(platform, adapter);
  }

  async handleMessage(msg: BotMessage): Promise<BotResponse> {
    // Slash command → skill mapping
    if (msg.isSlashCommand && msg.command) {
      return this.handleSlashCommand(msg);
    }

    // Regular message → agent chat
    return this.handleChat(msg);
  }

  private async handleSlashCommand(msg: BotMessage): Promise<BotResponse> {
    // TODO: Route to skill system
    return {
      text: `Skill \`${msg.command}\` triggered with args: ${msg.args || "(none)"}`,
    };
  }

  private async handleChat(msg: BotMessage): Promise<BotResponse> {
    // TODO: Route to agent core
    return {
      text: `[Lume] Received: ${msg.text.slice(0, 100)}...`,
    };
  }

  async startAll() {
    for (const [name, adapter] of this.adapters) {
      console.log(`Starting ${name} adapter...`);
      await adapter.start();
    }
  }
}

// Entry point
const gateway = new BotGateway();

const feishuToken = process.env.LUME_FEISHU_TOKEN;
const telegramToken = process.env.LUME_TELEGRAM_TOKEN;
const dingtalkToken = process.env.LUME_DINGTALK_TOKEN;

if (feishuToken) {
  gateway.registerAdapter(
    "feishu",
    new FeishuAdapter(feishuToken, (msg) => gateway.handleMessage(msg))
  );
}
if (telegramToken) {
  gateway.registerAdapter(
    "telegram",
    new TelegramAdapter(telegramToken, (msg) => gateway.handleMessage(msg))
  );
}
if (dingtalkToken) {
  gateway.registerAdapter(
    "dingtalk",
    new DingTalkAdapter(dingtalkToken, (msg) => gateway.handleMessage(msg))
  );
}

gateway.startAll().catch(console.error);
