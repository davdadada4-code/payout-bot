export const config = {
  botToken: process.env.BOT_TOKEN ?? "",
  adminId: Number(process.env.ADMIN_ID ?? "0"),
  botUsername: process.env.BOT_USERNAME ?? "YourBot",
  // Чат, куда бот будет слать профит-сообщения
  profitChatId: Number(process.env.PROFIT_CHAT_ID ?? "0"),
  // ID ветки (топика) в чате. 0 = без ветки
  profitThreadId: Number(process.env.PROFIT_THREAD_ID ?? "0"),

  // Текст правил и ссылка поддержки
  rulesText: process.env.RULES_TEXT ?? `📖 <b>Правила команды</b>\n\nЗдесь будут правила. Задайте их через переменную окружения RULES_TEXT.`,
  supportLink: process.env.SUPPORT_LINK ?? "https://t.me/username",

  // Доля воркера, %
  workerPercent: 70,

  // Премиум-стикеры (custom emoji)
  emoji: {
    bolt:   "5417994518261703280",
    worker: "5420190552220018466",
    bot:    "5420247537846101789",
    gift:   "5422635977749339064",
    card:   "5420281734375707356",
  },
} as const;

export function validate() {
  if (!config.botToken) throw new Error("BOT_TOKEN is not set");
  if (!config.adminId) throw new Error("ADMIN_ID is not set");
}
