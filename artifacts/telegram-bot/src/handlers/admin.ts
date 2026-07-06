import { Telegraf } from "telegraf";
import type { Context } from "../context.js";
import { config, e } from "../config.js";
import { mainMenuInline } from "../keyboards.js";
import { sendMainMenu } from "./menu.js";
import { payoutRequests } from "./payout.js";
import { teamRequests } from "./team.js";
import { recordPayout } from "../storage.js";

export function registerAdminHandlers(bot: Telegraf<Context>) {
  // ── Payout: Approve ─────────────────────────────────────────────────────
  bot.action(/^approve_payout:(.+)$/, async (ctx) => {
    if (ctx.from?.id !== config.adminId) { await ctx.answerCbQuery("⛔ Нет доступа"); return; }

    const requestId = ctx.match[1];
    const req = payoutRequests.get(requestId);
    if (!req) { await ctx.answerCbQuery("❌ Заявка не найдена"); return; }

    await ctx.answerCbQuery("✅ Подтверждено");

    await ctx.editMessageCaption(
      (ctx.callbackQuery.message && "caption" in ctx.callbackQuery.message
        ? ctx.callbackQuery.message.caption ?? ""
        : "") + `\n\n${e("ok","👍")} <b>Подтверждено</b>`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
    );

    if (ctx.session.confirmStep === "amount") {
      await ctx.telegram.sendMessage(
        config.adminId,
        `⚠️ Предыдущий ввод суммы (заявка <code>${ctx.session.confirmRequestId}</code>) отменён — началась новая.`,
        { parse_mode: "HTML" }
      );
    }

    ctx.session.confirmStep = "amount";
    ctx.session.confirmRequestId = requestId;
    ctx.session.confirmWorkerUsername = req.workerUsername;

    await ctx.telegram.sendMessage(
      config.adminId,
      `${e("money","💵")} Введите сумму выплаты <b>в TON</b> для воркера ${req.workerUsername}:\n\n` +
        `<i>Или отправьте «❌ Отмена» чтобы прервать.</i>`,
      { parse_mode: "HTML" }
    );

    await ctx.telegram.sendMessage(
      req.userId,
      `${e("ok","👍")} <b>Ваша заявка на выплату подтверждена!</b>\n\n` +
        `${e("money","💵")} Средства будут переведены в ближайшее время.`,
      { parse_mode: "HTML" }
    );
  });

  // ── Payout: Reject ──────────────────────────────────────────────────────
  bot.action(/^reject_payout:(.+)$/, async (ctx) => {
    if (ctx.from?.id !== config.adminId) { await ctx.answerCbQuery("⛔ Нет доступа"); return; }

    const requestId = ctx.match[1];
    const req = payoutRequests.get(requestId);
    if (!req) { await ctx.answerCbQuery("❌ Заявка не найдена"); return; }

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
      `❌ <b>Ваша заявка на выплату была отклонена.</b>\n\n` +
        `${e("doc","📃")} Если есть вопросы — обратитесь в поддержку.`,
      { parse_mode: "HTML" }
    );
  });

  // ── Team: Approve ───────────────────────────────────────────────────────
  bot.action(/^approve_team:(.+)$/, async (ctx) => {
    if (ctx.from?.id !== config.adminId) { await ctx.answerCbQuery("⛔ Нет доступа"); return; }

    const requestId = ctx.match[1];
    const req = teamRequests.get(requestId);
    if (!req) { await ctx.answerCbQuery("❌ Заявка не найдена"); return; }

    await ctx.answerCbQuery("✅ Принято");

    await ctx.editMessageText(
      (ctx.callbackQuery.message && "text" in ctx.callbackQuery.message
        ? ctx.callbackQuery.message.text ?? ""
        : "") + `\n\n${e("ok","👍")} <b>Принято</b>`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
    );

    teamRequests.delete(requestId);

    await ctx.telegram.sendMessage(
      req.userId,
      `${e("hand","🤝")} <b>Добро пожаловать в команду!</b>\n\n` +
        `${e("ok","👍")} Ваша заявка была одобрена.\n` +
        `${e("bolt","⚡️")} Скоро с вами свяжутся для дальнейших инструкций.`,
      { parse_mode: "HTML" }
    );
  });

  // ── Team: Reject ────────────────────────────────────────────────────────
  bot.action(/^reject_team:(.+)$/, async (ctx) => {
    if (ctx.from?.id !== config.adminId) { await ctx.answerCbQuery("⛔ Нет доступа"); return; }

    const requestId = ctx.match[1];
    const req = teamRequests.get(requestId);
    if (!req) { await ctx.answerCbQuery("❌ Заявка не найдена"); return; }

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
      `❌ <b>К сожалению, ваша заявка в команду отклонена.</b>\n\n` +
        `${e("doc","📃")} Попробуйте позже или обратитесь в поддержку.`,
      { parse_mode: "HTML" }
    );
  });

  // ── Admin text handler: amount input + support replies ──────────────────
  bot.on("message", async (ctx, next) => {
    if (ctx.from?.id !== config.adminId) return next();
    if (!("text" in ctx.message) || !ctx.message.text) return next();

    const text = ctx.message.text.trim();

    // Support reply (admin replies to forwarded support message)
    const replyTo = ctx.message.reply_to_message?.message_id;
    if (replyTo) {
      const { supportMap } = await import("./menu.js");
      const targetUserId = supportMap.get(replyTo);
      if (targetUserId) {
        await ctx.telegram.sendMessage(
          targetUserId,
          `${e("doc","📃")} <b>Ответ поддержки:</b>\n\n${text}`,
          { parse_mode: "HTML" }
        );
        await ctx.reply(`${e("ok","👍")} Ответ отправлен.`, { parse_mode: "HTML" });
        return;
      }
    }

    // Amount input for payout approval
    if (ctx.session.confirmStep !== "amount") return next();

    if (text === "❌ Отмена" || text.toLowerCase() === "отмена") {
      ctx.session.confirmStep = undefined;
      ctx.session.confirmRequestId = undefined;
      ctx.session.confirmWorkerUsername = undefined;
      await ctx.reply("❌ Ввод суммы отменён.");
      return;
    }

    const amount = parseFloat(text.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(`${e("money","💵")} Введите корректную сумму в TON (например: 12.5)`, { parse_mode: "HTML" });
      return;
    }

    const requestId = ctx.session.confirmRequestId!;
    const req = payoutRequests.get(requestId);

    ctx.session.confirmStep = undefined;
    ctx.session.confirmRequestId = undefined;
    ctx.session.confirmWorkerUsername = undefined;

    if (!req) {
      await ctx.reply("❌ Заявка не найдена — возможно, уже удалена.");
      return;
    }

    const workerShare = Math.round(amount * config.workerPercent) / 100;

    // Record payout in stats
    recordPayout(req.workerUsername, workerShare);
    payoutRequests.delete(requestId);

    // ── Profit message ──────────────────────────────────────────────────
    const eBolt   = e("bolt",   "⚡️");
    const eWorker = e("worker", "💁🏻‍♀️");
    const eGift   = e("gift",   "🎁");
    const eCard   = e("card",   "💳");
    const eMoney  = e("money",  "💵");
    const eOk     = e("ok",     "👍");
    const eDoc    = e("doc",    "📃");

    const profitText =
      `${eBolt} <b>Профит</b> ${eBolt}\n\n` +
      `${eWorker} Воркер: ${req.workerUsername}\n` +
      `${eDoc} NFT: 1 шт.\n` +
      `${eMoney} Сумма: <b>${amount.toFixed(2)} TON</b>\n` +
      `${eCard} Доля воркера (${config.workerPercent}%): <b>${workerShare.toFixed(2)} TON</b>\n` +
      `${eGift} Выплата: ${req.workerUsername}\n\n` +
      `${eOk}`;

    if (config.profitChatId) {
      const sendOptions: Parameters<typeof ctx.telegram.sendMessage>[2] = {
        parse_mode: "HTML",
      };
      if (config.profitThreadId) {
        (sendOptions as Record<string, unknown>).message_thread_id = config.profitThreadId;
      }
      await ctx.telegram.sendMessage(config.profitChatId, profitText, sendOptions);
    }

    await ctx.reply(
      `${e("ok","👍")} Выплата <b>${workerShare.toFixed(2)} TON</b> для ${req.workerUsername} записана.`,
      { parse_mode: "HTML" }
    );

    await ctx.telegram.sendMessage(
      req.userId,
      `${e("money","💵")} <b>Выплата произведена!</b>\n\n` +
        `${e("card","💳")} Сумма: <b>${workerShare.toFixed(2)} TON</b>\n` +
        `${e("ok","👍")} Спасибо за работу!`,
      { parse_mode: "HTML" }
    );
  });
}
