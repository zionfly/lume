/**
 * Telegram Bot Adapter
 *
 * Long-polling based Telegram bot integration.
 * Slash commands map to Lume skills.
 */

import type { BotMessage, BotResponse } from "../src/index";

export class TelegramAdapter {
  private token: string;
  private handler: (msg: BotMessage) => Promise<BotResponse>;
  private offset = 0;
  private running = false;

  constructor(
    token: string,
    handler: (msg: BotMessage) => Promise<BotResponse>
  ) {
    this.token = token;
    this.handler = handler;
  }

  async start() {
    this.running = true;
    console.log("[Telegram] Adapter started (long polling)");
    this.poll();
  }

  stop() {
    this.running = false;
  }

  private async poll() {
    while (this.running) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.offset}&timeout=30`
        );
        const data = (await res.json()) as {
          ok: boolean;
          result: Array<{
            update_id: number;
            message?: {
              text?: string;
              from?: { id: number };
              chat?: { id: number };
            };
          }>;
        };

        if (data.ok && data.result.length > 0) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            if (update.message?.text) {
              await this.handleUpdate(update.message);
            }
          }
        }
      } catch (err) {
        console.error("[Telegram] Poll error:", err);
        await Bun.sleep(5000);
      }
    }
  }

  private async handleUpdate(message: {
    text?: string;
    from?: { id: number };
    chat?: { id: number };
  }) {
    const text = message.text || "";
    const isSlash = text.startsWith("/");

    const botMsg: BotMessage = {
      platform: "telegram",
      userId: String(message.from?.id || ""),
      chatId: String(message.chat?.id || ""),
      text,
      isSlashCommand: isSlash,
      command: isSlash ? text.split(" ")[0].slice(1).split("@")[0] : undefined,
      args: isSlash ? text.split(" ").slice(1).join(" ") : undefined,
    };

    const response = await this.handler(botMsg);
    await this.sendMessage(botMsg.chatId, response.text);
  }

  private async sendMessage(chatId: string, text: string) {
    await fetch(
      `https://api.telegram.org/bot${this.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
      }
    );
  }
}
