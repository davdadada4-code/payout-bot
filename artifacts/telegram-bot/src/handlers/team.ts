import { Telegraf } from "telegraf";
import type { Context } from "../context.js";
import { config } from "../config.js";
import { adminTeamInline, cancelKeyboard, mainMenu } from "../keyboards.js";
import { randomUUID } from "crypto";

export const teamRequests = new Map<
  string,
  {
    userId: number;
    username: string;
    experience: string;
    source: string;
    time: string;
  }
>();

export function registerTeamHandlers(bot: Telegraf<Context>) {
  bot.hears("🤝 Заявка в команду", async (ctx) => {
    ctx.session.teamStep = "experience";
    ctx.session.teamDraft = {};
    await ctx.reply(
      "🤝 <b>Заявка в команду</b>\n\n<b>Вопрос 1 из 3</b>\n\n💼 Есть ли у вас опыт в данной сфере? Если да — расскажите подробнее:",
      { parse_mode: "HTML", ...cancelKeyboard }
    );
  });
}

export async function handleTeamStep(ctx: Context): Promise<boolean> {
  const step = ctx.session.teamStep;
  if (!step) return false;

  const msg = ctx.message;
  if (!msg) return false;
  const text = "text" in msg ? msg.text?.trim() : undefined;
  if (!text) return false;

  const draft = ctx.session.teamDraft ?? {};

  if (step === "experience") {
    ctx.session.teamDraft = { ...draft, experience: text };
    ctx.session.teamStep = "source";
    await ctx.reply(
      "<b>Вопрос 2 из 3</b>\n\n🔍 Откуда вы узнали о нас?",
      { parse_mode: "HTML", ...cancelKeyboard }
    );
    return true;
  }

  if (step === "source") {
    ctx.session.teamDraft = { ...draft, source: text };
    ctx.session.teamStep = "time";
    await ctx.reply(
      "<b>Вопрос 3 из 3</b>\n\n⏰ Сколько времени в день готовы уделять работе?",
      { parse_mode: "HTML", ...cancelKeyboard }
    );
    return true;
  }

  if (step === "time") {
    ctx.session.teamDraft = { ...draft, time: text };
    await submitTeamRequest(ctx);
    return true;
  }

  return false;
}

async function submitTeamRequest(ctx: Context) {
  const draft = ctx.session.teamDraft;
  if (!draft?.experience || !draft?.source || !draft?.time) {
    await ctx.reply("⚠️ Что-то пошло не так. Попробуйте заново.", { ...mainMenu });
    ctx.session.teamStep = undefined;
    ctx.session.teamDraft = undefined;
    return;
  }

  const id = randomUUID();
  const from = ctx.from!;
  const username = from.username ? `@${from.username}` : `id${from.id}`;

  teamRequests.set(id, {
    userId: from.id,
    username,
    experience: draft.experience,
    source: draft.source,
    time: draft.time,
  });

  ctx.session.teamStep = undefined;
  ctx.session.teamDraft = undefined;

  await ctx.reply(
    "✅ <b>Заявка в команду отправлена!</b>\n\n⏳ Ожидайте ответа администрации.",
    { parse_mode: "HTML", ...mainMenu }
  );

  const req = teamRequests.get(id)!;
  await ctx.telegram.sendMessage(
    config.adminId,
    `📋 <b>Новая заявка в команду</b>\n\n` +
      `👤 От: ${req.username}\n` +
      `🆔 ID: <code>${req.userId}</code>\n\n` +
      `💼 Опыт:\n${req.experience}\n\n` +
      `🔍 Откуда узнал:\n${req.source}\n\n` +
      `⏰ Время в день:\n${req.time}`,
    {
      parse_mode: "HTML",
      reply_markup: adminTeamInline(id).reply_markup,
    }
  );
}
