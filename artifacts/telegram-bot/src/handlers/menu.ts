import { Telegraf } from "telegraf";
import type { Context } from "../context.js";
import { config } from "../config.js";
import { getTopWorkers } from "../storage.js";
import { mainMenu } from "../keyboards.js";

export function registerMenuHandlers(bot: Telegraf<Context>) {
  // /start
  bot.start(async (ctx) => {
    const name = ctx.from.first_name ?? "воркер";
    await ctx.reply(
      `👋 Привет, <b>${name}</b>!\n\nДобро пожаловать. Выберите действие:`,
      { parse_mode: "HTML", ...mainMenu }
    );
  });

  // /menu
  bot.command("menu", async (ctx) => {
    await ctx.reply("🏠 <b>Главное меню</b>\n\nВыберите действие:", {
      parse_mode: "HTML",
      ...mainMenu,
    });
  });

  // Статистика
  bot.hears("📊 Статистика", async (ctx) => {
    const top = getTopWorkers(100);
    if (top.length === 0) {
      await ctx.reply(
        "📊 <b>Статистика</b>\n\nПока нет данных о выплатах.",
        { parse_mode: "HTML", ...mainMenu }
      );
      return;
    }

    const total = top.reduce((s, w) => s + w.totalTon, 0);
    const userUsername = ctx.from.username ? `@${ctx.from.username}` : null;
    const myPos = userUsername
      ? top.findIndex((w) => w.username.toLowerCase() === userUsername.toLowerCase())
      : -1;

    let text = `📊 <b>Статистика команды</b>\n\n`;
    text += `👥 Всего воркеров: ${top.length}\n`;
    text += `💰 Суммарный заработок: ${total.toFixed(2)} TON\n\n`;

    if (myPos >= 0) {
      const me = top[myPos]!;
      text += `🔹 Ваша позиция: #${myPos + 1}\n`;
      text += `🔹 Ваш заработок: ${me.totalTon.toFixed(2)} TON (${me.payouts} выплат)\n\n`;
    }

    text += `👑 <b>Топ-5 воркеров:</b>\n`;
    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    top.slice(0, 5).forEach((w, i) => {
      text += `${medals[i] ?? `${i + 1}.`} ${w.username} — ${w.totalTon.toFixed(2)} TON\n`;
    });

    await ctx.reply(text, { parse_mode: "HTML", ...mainMenu });
  });

  // Топ воркеров
  bot.hears("👑 Топ воркеров", async (ctx) => {
    const top = getTopWorkers(100);
    if (top.length === 0) {
      await ctx.reply(
        "👑 <b>Топ воркеров</b>\n\nПока нет данных.",
        { parse_mode: "HTML", ...mainMenu }
      );
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    let text = `👑 <b>Топ-${Math.min(top.length, 100)} воркеров</b>\n\n`;
    top.slice(0, 100).forEach((w, i) => {
      const pos = medals[i] ?? `${i + 1}.`;
      text += `${pos} ${w.username} — <b>${w.totalTon.toFixed(2)} TON</b> (${w.payouts} выплат)\n`;
    });

    await ctx.reply(text, { parse_mode: "HTML", ...mainMenu });
  });

  // Правила
  bot.hears("📖 Правила", async (ctx) => {
    await ctx.reply(config.rulesText, { parse_mode: "HTML", ...mainMenu });
  });

  // Поддержка
  bot.hears("🆘 Поддержка", async (ctx) => {
    await ctx.reply(
      `🆘 <b>Поддержка</b>\n\nПо всем вопросам обращайтесь: ${config.supportLink}`,
      { parse_mode: "HTML", ...mainMenu }
    );
  });
}
