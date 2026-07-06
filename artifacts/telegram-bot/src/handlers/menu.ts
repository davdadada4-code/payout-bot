import { Telegraf } from "telegraf";
import type { Context } from "../context.js";
import { config } from "../config.js";
import { getTopWorkers } from "../storage.js";
import { cancelInline, mainMenuInline } from "../keyboards.js";
import { clearWizard } from "../sessions.js";

// Maps forwarded message_id (admin chat) → original user_id for support replies
export const supportMap = new Map<number, number>();

// ── Shared helper ─────────────────────────────────────────────────────────────
export async function sendMainMenu(ctx: Context, text = "🏠 <b>Главное меню</b>") {
  await ctx.reply(text, { parse_mode: "HTML", ...mainMenuInline });
}

export function registerMenuHandlers(bot: Telegraf<Context>) {
  // /start
  bot.start(async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const name = ctx.from.first_name ?? "воркер";
    await sendMainMenu(ctx, `👋 Привет, <b>${name}</b>!\n\nВыберите действие:`);
  });

  // /menu
  bot.command("menu", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    await sendMainMenu(ctx);
  });

  // ── Cancel ────────────────────────────────────────────────────────────────
  bot.action("cancel", async (ctx) => {
    clearWizard(ctx.session);
    await ctx.answerCbQuery("Отменено");
    await ctx.editMessageText("❌ Действие отменено.", { reply_markup: { inline_keyboard: [] } });
    await sendMainMenu(ctx);
  });

  // ── Statistics ────────────────────────────────────────────────────────────
  bot.action("menu:stats", async (ctx) => {
    await ctx.answerCbQuery();
    const top = getTopWorkers(100);

    if (top.length === 0) {
      await ctx.editMessageText("📊 <b>Статистика</b>\n\nПока нет данных о выплатах.", {
        parse_mode: "HTML",
        reply_markup: mainMenuInline.reply_markup,
      });
      return;
    }

    const total = top.reduce((s, w) => s + w.totalTon, 0);
    const username = ctx.from?.username ? `@${ctx.from.username}` : null;
    const myPos = username
      ? top.findIndex((w) => w.username.toLowerCase() === username.toLowerCase())
      : -1;

    let text = `📊 <b>Статистика команды</b>\n\n`;
    text += `👥 Всего воркеров: ${top.length}\n`;
    text += `💰 Суммарный заработок: ${total.toFixed(2)} TON\n\n`;

    if (myPos >= 0) {
      const me = top[myPos]!;
      text += `🔹 Ваша позиция: #${myPos + 1}\n`;
      text += `🔹 Ваш заработок: ${me.totalTon.toFixed(2)} TON (${me.payouts} выплат)\n\n`;
    }

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    text += `👑 <b>Топ-5 воркеров:</b>\n`;
    top.slice(0, 5).forEach((w, i) => {
      text += `${medals[i] ?? `${i + 1}.`} ${w.username} — ${w.totalTon.toFixed(2)} TON\n`;
    });

    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: mainMenuInline.reply_markup,
    });
  });

  // ── Top workers ───────────────────────────────────────────────────────────
  bot.action("menu:top", async (ctx) => {
    await ctx.answerCbQuery();
    const top = getTopWorkers(100);

    if (top.length === 0) {
      await ctx.editMessageText("👑 <b>Топ воркеров</b>\n\nПока нет данных.", {
        parse_mode: "HTML",
        reply_markup: mainMenuInline.reply_markup,
      });
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    let text = `👑 <b>Топ-${Math.min(top.length, 100)} воркеров</b>\n\n`;
    top.slice(0, 100).forEach((w, i) => {
      const pos = medals[i] ?? `${i + 1}.`;
      text += `${pos} ${w.username} — <b>${w.totalTon.toFixed(2)} TON</b> (${w.payouts} выплат)\n`;
    });

    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: mainMenuInline.reply_markup,
    });
  });

  // ── Rules ─────────────────────────────────────────────────────────────────
  bot.action("menu:rules", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(config.rulesText, {
      parse_mode: "HTML",
      reply_markup: mainMenuInline.reply_markup,
    });
  });

  // ── Support ───────────────────────────────────────────────────────────────
  bot.action("menu:support", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.supportStep = "waiting_message";
    await ctx.editMessageText(
      "🆘 <b>Поддержка</b>\n\nНапишите ваш вопрос или опишите проблему — сообщение придёт администрации:",
      { parse_mode: "HTML", reply_markup: cancelInline.reply_markup }
    );
  });
}
