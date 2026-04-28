import type { User } from "@prisma/client";
import { config } from "../config";

type TelegramConfig = {
  token: string;
  chatId: string;
};

function getTelegramConfig(): TelegramConfig | null {
  const { botToken, approvalChatId } = config.telegram;
  if (!botToken || !approvalChatId) return null;
  return { token: botToken, chatId: approvalChatId };
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function notifySignupForApproval(user: User): Promise<void> {
  const tg = getTelegramConfig();
  if (!tg) return;

  const approveUrl = user.approvalToken
    ? `${config.appUrl}/api/auth/approve?token=${encodeURIComponent(user.approvalToken)}`
    : null;

  const details = user.approvalDetails?.trim();
  const lines = [
    "<b>New PostishAI signup needs approval</b>",
    "",
    `<b>Name:</b> ${escapeHtml(user.name || "Not provided")}`,
    `<b>Email:</b> ${escapeHtml(user.email)}`,
  ];

  if (details) {
    lines.push("", "<b>Usage details:</b>", escapeHtml(details));
  }

  await sendTelegramMessage(tg, lines.join("\n"), approveUrl).catch((error) => {
    console.error("Telegram approval notification failed", error);
  });
}

export async function notifyApprovalDetails(user: User): Promise<void> {
  const tg = getTelegramConfig();
  if (!tg) return;

  const approveUrl = user.approvalToken
    ? `${config.appUrl}/api/auth/approve?token=${encodeURIComponent(user.approvalToken)}`
    : null;

  const lines = [
    "<b>PostishAI approval details updated</b>",
    "",
    `<b>Name:</b> ${escapeHtml(user.name || "Not provided")}`,
    `<b>Email:</b> ${escapeHtml(user.email)}`,
    "",
    "<b>Usage details:</b>",
    escapeHtml(user.approvalDetails?.trim() || "Not provided"),
  ];

  await sendTelegramMessage(tg, lines.join("\n"), approveUrl).catch((error) => {
    console.error("Telegram approval details notification failed", error);
  });
}

async function sendTelegramMessage(
  tg: TelegramConfig,
  text: string,
  approveUrl: string | null,
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${tg.token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: tg.chatId,
      text,
      parse_mode: "HTML",
      reply_markup: approveUrl
        ? {
            inline_keyboard: [[{ text: "Approve user", url: approveUrl }]],
          }
        : undefined,
    }),
  });

  if (!response.ok) {
    console.error("Telegram approval notification failed", await response.text());
  }
}
