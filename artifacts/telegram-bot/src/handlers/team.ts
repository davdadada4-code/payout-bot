import { Telegraf } from "telegraf";
import type { Context } from "../context.js";
import { config, e } from "../config.js";
import { adminTeamInline, cancelInline, mainMenuInline } from "../keyboards.js";
import { clearWizard } from "../sessions.js";
import { sendMainMenu } from "./menu.js";
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
  bot.action("menu:team", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.teamStep = "experience";
    ctx.session.teamDraft = {};
    await ctx.editMessageText(
      `${e("hand","🤝")} <b>Заявка в команду</b>\n\n` +
        `${e("brief","💼")} Расскажите немного о себе.\n\n` +
        `<b>Шаг 1 из 3</b>\n` +
        `${e("brief","💼")} Какой у вас опыт в данной сфере?`,
      { parse_mode: "HTML", reply_markup: cancelInline.reply_markup }
    );
  });
}

export async function handleTeamStep(ctx: Context): Promise<boolean> {
  const step = ctx.session.teamStep;
  if (!step) return false;

  const msg = ctx.message;
  if (!msg || !("text" in msg) || !msg.text) return false;

  const text = msg.text.trim();
  const draft = ctx.session.teamDraft ?? {};

  if (step === "experience") {
    ctx.session.teamDraft = { ...draft, experience: text };
    ctx.session.teamStep = "source";
    await ctx.reply(
      `<b>Шаг 2 из 3</b>\n${e("num2","2️⃣")} Откуда вы узнали о нас?`,
      { parse_mode: "HTML", ...cancelInline }
    );
    return true;
  }

  if (step === "source") {
    ctx.session.teamDraft = { ...draft, source: text };
    ctx.session.teamStep = "time";
    await ctx.reply(
      `<b>Шаг 3 из 3</b>\n${e("plane","✈️")} Сколько часов в день готовы уделять работе?`,
      { parse_mode: "HTML", ...cancelInline }
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
    clearWizard(ctx.session);
    await ctx.reply("⚠️ Что-то пошло не так. Попробуйте заново.");
    await sendMainMenu(ctx);
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

  clearWizard(ctx.session);

  await ctx.reply(
    `${e("ok","👍")} <b>Заявка в команду отправлена!</b>\n\n` +
      `${e("plane","✈️")} Ожидайте ответа администрации.`,
    { parse_mode: "HTML", ...mainMenuInline }
  );

  const req = teamRequests.get(id)!;
  await ctx.telegram.sendMessage(
    config.adminId,
    `${e("hand","🤝")} <b>Новая заявка в команду</b>\n\n` +
      `${e("worker","💁🏻‍♀️")} От: ${req.username}\n` +
      `🆔 ID: <code>${req.userId}</code>\n\n` +
      `${e("brief","💼")} Опыт:\n${req.experience}\n\n` +
      `🔍 Откуда узнал:\n${req.source}\n\n` +
      `${e("plane","✈️")} Время в день:\n${req.time}`,
    { parse_mode: "HTML", reply_markup: adminTeamInline(id).reply_markup }
  );
}
