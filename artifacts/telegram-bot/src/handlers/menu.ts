import { Telegraf } from "telegraf";
import type { Context } from "../context.js";
import { config, e } from "../config.js";
import { getTopWorkers } from "../storage.js";
import { cancelInline, mainMenuInline } from "../keyboards.js";
import { clearWizard } from "../sessions.js";

export const supportMap = new Map<number, number>();

export async function sendMainMenu(ctx: Context, text?: string) {
  const heading = text ?? `${e("bolt","⚡️")} <b>Главное меню</b>`;
  await ctx.reply(heading, { parse_mode: "HTML", ...mainMenuInline });
}

export function registerMenuHandlers(bot: Telegraf<Context>) {
  // /start
  bot.start(async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const name = ctx.from.first_name ?? "воркер";
    await sendMainMenu(
      ctx,
      `${e("bolt","⚡️")} Привет, <b>${name}</b>!\n\n${e("plane","✈️")} Выберите действие:`
    );
  });

  // /menu
  bot.command("menu", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    await sendMainMenu(ctx);
  });

  // ── Cancel ─────────────────────────────────────────────────────────────
  bot.action("cancel", async (ctx) => {
    clearWizard(ctx.session);
    await ctx.answerCbQuery("Отменено");
    await ctx.editMessageText("❌ Действие отменено.", { reply_markup: { inline_keyboard: [] } });
    await sendMainMenu(ctx);
  });

  // ── Statistics ──────────────────────────────────────────────────────────
  bot.action("menu:stats", async (ctx) => {
    await ctx.answerCbQuery();
    const top = getTopWorkers(100);

    if (top.length === 0) {
      await ctx.editMessageText(
        `${e("brief","💼")} <b>Статистика</b>\n\nПока нет данных о выплатах.`,
        { parse_mode: "HTML", reply_markup: mainMenuInline.reply_markup }
      );
      return;
    }

    const total = top.reduce((s, w) => s + w.totalTon, 0);
    const username = ctx.from?.username ? `@${ctx.from.username}` : null;
    const myPos = username
      ? top.findIndex((w) => w.username.toLowerCase() === username.toLowerCase())
      : -1;

    const numEmojis = [
      e("num1","1️⃣"), e("num2","2️⃣"), e("num3","3️⃣"), e("num4","4️⃣"),
    ];

    let text = `${e("brief","💼")} <b>Статистика команды</b>\n\n`;
    text += `👥 Всего воркеров: <b>${top.length}</b>\n`;
    text += `${e("money","💵")} Суммарный заработок: <b>${total.toFixed(2)} TON</b>\n\n`;

    if (myPos >= 0) {
      const me = top[myPos]!;
      text += `${e("worker","💁🏻‍♀️")} Ваша позиция: <b>#${myPos + 1}</b>\n`;
      text += `${e("money","💵")} Ваш заработок: <b>${me.totalTon.toFixed(2)} TON</b> (${me.payouts} выплат)\n\n`;
    }

    text += `${e("bolt","⚡️")} <b>Топ-5 воркеров:</b>\n`;
    top.slice(0, 5).forEach((w, i) => {
      const pos = numEmojis[i] ?? `${i + 1}.`;
      text += `${pos} ${w.username} — <b>${w.totalTon.toFixed(2)} TON</b>\n`;
    });

    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: mainMenuInline.reply_markup,
    });
  });

  // ── Top workers ─────────────────────────────────────────────────────────
  bot.action("menu:top", async (ctx) => {
    await ctx.answerCbQuery();
    const top = getTopWorkers(100);

    if (top.length === 0) {
      await ctx.editMessageText(
        `${e("bolt","⚡️")} <b>Топ воркеров</b>\n\nПока нет данных.`,
        { parse_mode: "HTML", reply_markup: mainMenuInline.reply_markup }
      );
      return;
    }

    const numEmojis = [
      e("num1","1️⃣"), e("num2","2️⃣"), e("num3","3️⃣"), e("num4","4️⃣"),
    ];

    let text = `${e("bolt","⚡️")} <b>Топ-${Math.min(top.length, 100)} воркеров</b>\n\n`;
    top.slice(0, 100).forEach((w, i) => {
      const pos = numEmojis[i] ?? `${i + 1}.`;
      text += `${pos} ${w.username} — <b>${w.totalTon.toFixed(2)} TON</b> (${w.payouts} выплат)\n`;
    });

    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: mainMenuInline.reply_markup,
    });
  });

  // ── Rules ───────────────────────────────────────────────────────────────
  bot.action("menu:rules", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(config.rulesText, {
      parse_mode: "HTML",
      reply_markup: mainMenuInline.reply_markup,
    });
  });

  // ── Support wizard start ────────────────────────────────────────────────
  bot.action("menu:support", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.supportStep = "waiting_message";
    await ctx.editMessageText(
      `${e("doc","📃")} <b>Поддержка</b>\n\nНапишите ваш вопрос — администратор ответит вам в ближайшее время.`,
      { parse_mode: "HTML", reply_markup: cancelInline.reply_markup }
    );
  });

  // ── Support message forwarding ──────────────────────────────────────────
  bot.on("message", async (ctx, next) => {
    if (ctx.session.supportStep !== "waiting_message") return next();
    if (!("text" in ctx.message) || !ctx.message.text) {
      await ctx.reply(`${e("doc","📃")} Напишите вопрос текстом:`, cancelInline);
      return;
    }

    clearWizard(ctx.session);

    const from = ctx.from;
    const username = from.username ? `@${from.username}` : `id${from.id}`;
    const text = ctx.message.text;

    const forwarded = await ctx.telegram.sendMessage(
      config.adminId,
      `${e("doc","📃")} <b>Сообщение в поддержку</b>\n\n` +
        `${e("worker","💁🏻‍♀️")} От: ${username} (<code>${from.id}</code>)\n\n` +
        `${text}`,
      { parse_mode: "HTML" }
    );

    supportMap.set(forwarded.message_id, from.id);

    await ctx.reply(
      `${e("ok","👍")} <b>Сообщение отправлено!</b>\n\nОжидайте ответа администратора.`,
      { parse_mode: "HTML", ...mainMenuInline }
    );
  });
}
