/**
 * DingTalk Bot Adapter
 *
 * Webhook-based DingTalk bot integration.
 * Supports outgoing webhooks and slash commands.
 */

import type { BotMessage, BotResponse } from "../src/index";

export class DingTalkAdapter {
  private token: string;
  private handler: (msg: BotMessage) => Promise<BotResponse>;

  constructor(
    token: string,
    handler: (msg: BotMessage) => Promise<BotResponse>
  ) {
    this.token = token;
    this.handler = handler;
  }

  async start() {
    // TODO: Set up DingTalk webhook server
    console.log("[DingTalk] Adapter initialized (webhook mode)");
  }

  async handleWebhook(body: Record<string, unknown>) {
    const text = ((body.text as Record<string, string>)?.content || "").trim();
    const isSlash = text.startsWith("/");

    const botMsg: BotMessage = {
      platform: "dingtalk",
      userId: body.senderStaffId as string || body.senderId as string || "",
      chatId: body.conversationId as string || "",
      text,
      isSlashCommand: isSlash,
      command: isSlash ? text.split(" ")[0].slice(1) : undefined,
      args: isSlash ? text.split(" ").slice(1).join(" ") : undefined,
    };

    const response = await this.handler(botMsg);
    await this.sendResponse(body.sessionWebhook as string, response);
  }

  private async sendResponse(webhook: string, response: BotResponse) {
    if (!webhook) return;

    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: {
          title: "Lume",
          text: response.text,
        },
      }),
    });
  }
}
