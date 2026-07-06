export const config = {
  botToken: process.env.BOT_TOKEN ?? "",
  adminId: Number(process.env.ADMIN_ID ?? "0"),
  botUsername: process.env.BOT_USERNAME ?? "YourBot",
  profitChatId: Number(process.env.PROFIT_CHAT_ID ?? "0"),
  profitThreadId: Number(process.env.PROFIT_THREAD_ID ?? "0"),

  rulesText: process.env.RULES_TEXT ?? `📖 <b>Правила команды</b>\n\nЗдесь будут правила. Задайте их через переменную окружения RULES_TEXT.`,

  workerPercent: 70,

  emoji: {
    // Старые
    bolt:   "5417994518261703280",  // ⚡️
    worker: "5420190552220018466",  // 💁🏻‍♀️
    bot:    "5420247537846101789",  // 🤖
    gift:   "5422635977749339064",  // 🎁
    card:   "5420281734375707356",  // 💳
    // Новые
    num1:   "5382322671679708881",  // 1️⃣
    num2:   "5381990043642502553",  // 2️⃣
    num3:   "5381879959335738545",  // 3️⃣
    num4:   "5382054253403577563",  // 4️⃣
    brief:  "5303209807879093100",  // 💼
    hand:   "5366230485783557962",  // 🤝
    doc:    "5251662946127336150",  // 📃
    ok:     "5420538380146483612",  // 👍
    money:  "5341730708131976244",  // 💵
    plane:  "5296432770392791386",  // ✈️
  },
} as const;

/** Inline custom emoji tag for HTML parse_mode */
export function e(id: keyof typeof config.emoji, fallback: string): string {
  return `<tg-emoji emoji-id="${config.emoji[id]}">${fallback}</tg-emoji>`;
}

export function validate() {
  if (!config.botToken) throw new Error("BOT_TOKEN is not set");
  if (!config.adminId) throw new Error("ADMIN_ID is not set");
}
