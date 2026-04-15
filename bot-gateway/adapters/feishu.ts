/**
 * Feishu (Lark) Bot Adapter
 *
 * Handles incoming messages from Feishu, maps slash commands to skills,
 * and sends responses back. Supports:
 * - Text messages
 * - Slash commands (/skill_name)
 * - Interactive card actions for sensitive operation approvals
 */

import type { BotMessage, BotResponse } from "../src/index";

export class FeishuAdapter {
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
    // TODO: Set up Feishu event subscription webhook
    console.log("[Feishu] Adapter initialized (webhook mode)");
  }

  async handleEvent(event: Record<string, unknown>) {
    const msgType = event.type as string;

    if (msgType === "message") {
      const text = (event.text as string) || "";
      const isSlash = text.startsWith("/");

      const botMsg: BotMessage = {
        platform: "feishu",
        userId: event.user_id as string,
        chatId: event.chat_id as string,
        text,
        isSlashCommand: isSlash,
        command: isSlash ? text.split(" ")[0].slice(1) : undefined,
        args: isSlash ? text.split(" ").slice(1).join(" ") : undefined,
      };

      const response = await this.handler(botMsg);
      await this.sendMessage(botMsg.chatId, response);
    }
  }

  private async sendMessage(chatId: string, response: BotResponse) {
    if (response.requiresApproval) {
      await this.sendApprovalCard(chatId, response);
      return;
    }

    // Send text message via Feishu API
    await fetch("https://open.feishu.cn/open-apis/im/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receive_id: chatId,
        msg_type: "text",
        content: JSON.stringify({ text: response.text }),
      }),
    });
  }

  private async sendApprovalCard(chatId: string, response: BotResponse) {
    // Interactive card for sensitive operations
    const card = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: "Lume: Action Approval Required" },
        template: "orange",
      },
      elements: [
        {
          tag: "div",
          text: { tag: "lark_md", content: response.text },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: { tag: "plain_text", content: "Approve" },
              type: "primary",
              value: { action: response.approvalAction, approved: true },
            },
            {
              tag: "button",
              text: { tag: "plain_text", content: "Reject" },
              type: "danger",
              value: { action: response.approvalAction, approved: false },
            },
          ],
        },
      ],
    };

    await fetch("https://open.feishu.cn/open-apis/im/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receive_id: chatId,
        msg_type: "interactive",
        content: JSON.stringify(card),
      }),
    });
  }
}
