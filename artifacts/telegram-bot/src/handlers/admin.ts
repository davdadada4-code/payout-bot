import { Telegraf } from "telegraf";
import type { Context } from "../context.js";
import { config } from "../config.js";
import { mainMenu } from "../keyboards.js";
import { payoutRequests } from "./payout.js";
import { teamRequests } from "./team.js";
import { recordPayout } from "../storage.js";

function customEmoji(id: string, fallback: string): string {
  return `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
}


export function registerAdminHandlers(bot: Telegraf<Context>) {
  // ── Payout: Approve ──────────────────────────────────────────────────────
  bot.action(/^approve_payout:(.+)$/, async (ctx) => {
    if (ctx.from?.id !== config.adminId) {
      await ctx.answerCbQuery("⛔ Нет доступа");
      return;
    }

    const requestId = ctx.match[1];
    const req = payoutRequests.get(requestId);
    if (!req) {
      await ctx.answerCbQuery("❌ Заявка не найдена");
      return;
    }

    await ctx.answerCbQuery("✅ Подтверждено");

    // Remove inline buttons + mark approved
    await ctx.editMessageCaption(
      (ctx.callbackQuery.message && "caption" in ctx.callbackQuery.message
        ? ctx.callbackQuery.message.caption ?? ""
        : "") + "\n\n✅ <b>Подтверждено</b>",
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
    );

    // If admin is already mid-confirm for another request — warn and abort old one
    if (ctx.session.confirmStep === "amount") {
      const oldId = ctx.session.confirmRequestId;
      await ctx.telegram.sendMessage(
        config.adminId,
        `⚠️ Предыдущий ввод суммы (заявка <code>${oldId}</code>) отменён — началась новая.`,
        { parse_mode: "HTML" }
      );
    }

    // Start confirm flow: ask for amount (request-scoped)
    ctx.session.confirmStep = "amount";
    ctx.session.confirmRequestId = requestId;
    ctx.session.confirmWorkerUsername = req.workerUsername;

    await ctx.telegram.sendMessage(
      config.adminId,
      `💰 Введите сумму выплаты <b>в TON</b> для воркера ${req.workerUsername}:\n\n<i>Или отправьте «❌ Отмена» чтобы прервать.</i>`,
      { parse_mode: "HTML" }
    );

    // Notify worker
    await ctx.telegram.sendMessage(
      req.userId,
      "✅ <b>Ваша заявка на выплату подтверждена!</b>\n\n💸 Средства будут переведены в ближайшее время.",
      { parse_mode: "HTML" }
    );
  });

  // ── Payout: Reject ───────────────────────────────────────────────────────
  bot.action(/^reject_payout:(.+)$/, async (ctx) => {
    if (ctx.from?.id !== config.adminId) {
      await ctx.answerCbQuery("⛔ Нет доступа");
      return;
    }

    const requestId = ctx.match[1];
    const req = payoutRequests.get(requestId);
    if (!req) {
      await ctx.answerCbQuery("❌ Заявка не найдена");
      return;
    }

    await ctx.answerCbQuery("❌ Отклонено");

    await ctx.editMessageCaption(
      (ctx.callbackQuery.message && "caption" in ctx.callbackQuery.message
        ? ctx.callbackQuery.message.caption ?? ""
        : "") + "\n\n❌ <b>Отклонено</b>",
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
    );

    payoutRequests.delete(requestId);

    await ctx.telegram.sendMessage(
      req.userId,
      "❌ <b>Ваша заявка на выплату была отклонена.</b>\n\nЕсли у вас есть вопросы — обратитесь в поддержку.",
      { parse_mode: "HTML" }
    );
  });

  // ── Team: Approve ────────────────────────────────────────────────────────
  bot.action(/^approve_team:(.+)$/, async (ctx) => {
    if (ctx.from?.id !== config.adminId) {
      await ctx.answerCbQuery("⛔ Нет доступа");
      return;
    }

    const requestId = ctx.match[1];
    const req = teamRequests.get(requestId);
    if (!req) {
      await ctx.answerCbQuery("❌ Заявка не найдена");
      return;
    }

    await ctx.answerCbQuery("✅ Принято");
    await ctx.editMessageText(
      (ctx.callbackQuery.message && "text" in ctx.callbackQuery.message
        ? ctx.callbackQuery.message.text ?? ""
        : "") + "\n\n✅ <b>Принято в команду</b>",
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
    );

    teamRequests.delete(requestId);

    await ctx.telegram.sendMessage(
      req.userId,
      "🎉 <b>Поздравляем! Ваша заявка в команду одобрена.</b>\n\nС вами свяжутся в ближайшее время.",
      { parse_mode: "HTML" }
    );
  });

  // ── Team: Reject ─────────────────────────────────────────────────────────
  bot.action(/^reject_team:(.+)$/, async (ctx) => {
    if (ctx.from?.id !== config.adminId) {
      await ctx.answerCbQuery("⛔ Нет доступа");
      return;
    }

    const requestId = ctx.match[1];
    const req = teamRequests.get(requestId);
    if (!req) {
      await ctx.answerCbQuery("❌ Заявка не найдена");
      return;
    }

    await ctx.answerCbQuery("❌ Отклонено");
    await ctx.editMessageText(
      (ctx.callbackQuery.message && "text" in ctx.callbackQuery.message
        ? ctx.callbackQuery.message.text ?? ""
        : "") + "\n\n❌ <b>Отклонено</b>",
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
    );

    teamRequests.delete(requestId);

    await ctx.telegram.sendMessage(
      req.userId,
      "❌ <b>К сожалению, ваша заявка в команду отклонена.</b>\n\nПопробуйте снова позже.",
      { parse_mode: "HTML" }
    );
  });
}

// Handle admin confirm flow (amount input after approval)
export async function handleAdminConfirmStep(ctx: Context): Promise<boolean> {
  if (ctx.from?.id !== config.adminId) return false;
  const step = ctx.session.confirmStep;
  if (!step || step === "done") return false;

  const msg = ctx.message;
  if (!msg || !("text" in msg)) return false;
  const text = msg.text?.trim();
  if (!text) return false;

  if (step === "amount") {
    const amount = parseFloat(text.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("⚠️ Введите корректную сумму в TON (например: <code>3.9</code>):", {
        parse_mode: "HTML",
      });
      return true;
    }

    ctx.session.confirmAmount = amount;
    ctx.session.confirmStep = "done";

    const requestId = ctx.session.confirmRequestId!;
    const workerUsername = ctx.session.confirmWorkerUsername!;
    const req = payoutRequests.get(requestId);

    const workerPercent = config.workerPercent;
    const workerShare = (amount * workerPercent) / 100;

    // Build profit message with custom emoji
    const e = config.emoji;
    const bolt   = customEmoji(e.bolt,   "⚡️");
    const worker = customEmoji(e.worker, "💁🏻‍♀️");
    const botEmo = customEmoji(e.bot,    "🤖");
    const gift   = customEmoji(e.gift,   "🎁");
    const card   = customEmoji(e.card,   "💳");

    const profitText =
      `${bolt} <b>Новый профит!</b>\n\n` +
      `${worker} Воркер: ${workerUsername}\n` +
      `${gift} Снято NFT: 1 шт.\n\n` +
      `${card} Сумма: ${amount} TON\n` +
      `├ Процент выплаты: ${workerPercent}%\n` +
      `└ Доля воркера: ${workerShare.toFixed(2)} TON`;

    // Send to profit chat
    if (config.profitChatId) {
      const sendOptions: Parameters<typeof ctx.telegram.sendMessage>[2] = {
        parse_mode: "HTML",
      };
      if (config.profitThreadId) {
        (sendOptions as Record<string, unknown>).message_thread_id = config.profitThreadId;
      }
      await ctx.telegram.sendMessage(config.profitChatId, profitText, sendOptions);
    }

    // Record stats
    recordPayout(workerUsername, workerShare);

    // Cleanup
    ctx.session.confirmStep = undefined;
    ctx.session.confirmRequestId = undefined;
    ctx.session.confirmWorkerUsername = undefined;
    ctx.session.confirmAmount = undefined;
    if (req) payoutRequests.delete(requestId);

    await ctx.reply(
      `✅ Готово! Профит-сообщение отправлено в чат.\n\n` +
        `└ Воркер: ${workerUsername}\n` +
        `└ Сумма: ${amount} TON → доля ${workerShare.toFixed(2)} TON (${workerPercent}%)`,
      { ...mainMenu }
    );

    return true;
  }

  return false;
}
