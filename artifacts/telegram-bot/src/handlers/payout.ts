import { Telegraf } from "telegraf";
import type { Context } from "../context.js";
import { config } from "../config.js";
import { adminPayoutInline, cancelInline, mainMenuInline, paymentMethodInline } from "../keyboards.js";
import { clearWizard } from "../sessions.js";
import { sendMainMenu } from "./menu.js";
import { randomUUID } from "crypto";

export const payoutRequests = new Map<
  string,
  {
    userId: number;
    workerUsername: string;
    mammothUsername: string;
    screenshotFileId: string;
    paymentMethod: "ton" | "card";
    paymentDetails: string;
    date: string;
  }
>();

export function registerPayoutHandlers(bot: Telegraf<Context>) {
  // Start payout wizard
  bot.action("menu:payout", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.payoutStep = "worker_username";
    ctx.session.payoutDraft = {};
    await ctx.editMessageText(
      "📤 <b>Создание заявки на выплату</b>\n\n" +
        "Для обработки выплаты необходимо заполнить небольшую форму.\n\n" +
        "<b>Шаг 1 из 5</b>\n" +
        "👤 Введите @username воркера:",
      { parse_mode: "HTML", reply_markup: cancelInline.reply_markup }
    );
  });

  // Payment method selection via inline buttons
  bot.action("payment:ton", async (ctx) => {
    if (ctx.session.payoutStep !== "payment_method") {
      await ctx.answerCbQuery();
      return;
    }
    await ctx.answerCbQuery("💎 TON выбран");
    ctx.session.payoutDraft = { ...ctx.session.payoutDraft, paymentMethod: "ton" };
    ctx.session.payoutStep = "payment_details";
    await ctx.editMessageText(
      "<b>Шаг 5 из 5</b>\n💎 Введите адрес вашего <b>TON-кошелька</b>:",
      { parse_mode: "HTML", reply_markup: cancelInline.reply_markup }
    );
  });

  bot.action("payment:card", async (ctx) => {
    if (ctx.session.payoutStep !== "payment_method") {
      await ctx.answerCbQuery();
      return;
    }
    await ctx.answerCbQuery("💳 Карта выбрана");
    ctx.session.payoutDraft = { ...ctx.session.payoutDraft, paymentMethod: "card" };
    ctx.session.payoutStep = "payment_details";
    await ctx.editMessageText(
      "<b>Шаг 5 из 5</b>\n💳 Введите номер вашей <b>банковской карты</b>:",
      { parse_mode: "HTML", reply_markup: cancelInline.reply_markup }
    );
  });
}

// Called from main message handler for wizard text/photo steps
export async function handlePayoutStep(ctx: Context): Promise<boolean> {
  const step = ctx.session.payoutStep;
  if (!step) return false;

  const msg = ctx.message;
  if (!msg) return false;

  const draft = ctx.session.payoutDraft ?? {};

  if (step === "worker_username") {
    const text = "text" in msg ? msg.text?.trim() : undefined;
    if (!text) {
      await ctx.reply("👤 Введите @username воркера (текстом):", cancelInline);
      return true;
    }
    const username = text.startsWith("@") ? text : `@${text}`;
    ctx.session.payoutDraft = { ...draft, workerUsername: username };
    ctx.session.payoutStep = "mammoth_username";
    await ctx.reply(
      "<b>Шаг 2 из 5</b>\n🎯 Введите @username мамонта:",
      { parse_mode: "HTML", ...cancelInline }
    );
    return true;
  }

  if (step === "mammoth_username") {
    const text = "text" in msg ? msg.text?.trim() : undefined;
    if (!text) {
      await ctx.reply("🎯 Введите @username мамонта (текстом):", cancelInline);
      return true;
    }
    const username = text.startsWith("@") ? text : `@${text}`;
    ctx.session.payoutDraft = { ...draft, mammothUsername: username };
    ctx.session.payoutStep = "screenshot";
    await ctx.reply(
      "<b>Шаг 3 из 5</b>\n📸 Отправьте скриншот профита:",
      { parse_mode: "HTML", ...cancelInline }
    );
    return true;
  }

  if (step === "screenshot") {
    let fileId: string | undefined;
    if ("photo" in msg && msg.photo && msg.photo.length > 0) {
      fileId = msg.photo[msg.photo.length - 1]!.file_id;
    } else if ("document" in msg && msg.document) {
      fileId = msg.document.file_id;
    }
    if (!fileId) {
      await ctx.reply("📸 Пожалуйста, отправьте скриншот (фото):", cancelInline);
      return true;
    }
    ctx.session.payoutDraft = { ...draft, screenshotFileId: fileId };
    ctx.session.payoutStep = "payment_method";
    await ctx.reply(
      "<b>Шаг 4 из 5</b>\n💳 Выберите способ получения выплаты:",
      { parse_mode: "HTML", ...paymentMethodInline }
    );
    return true;
  }

  if (step === "payment_details") {
    const text = "text" in msg ? msg.text?.trim() : undefined;
    if (!text) {
      await ctx.reply("Введите реквизиты (текстом):", cancelInline);
      return true;
    }
    ctx.session.payoutDraft = { ...draft, paymentDetails: text };
    await submitPayoutRequest(ctx);
    return true;
  }

  return false;
}

async function submitPayoutRequest(ctx: Context) {
  const draft = ctx.session.payoutDraft;
  if (
    !draft?.workerUsername ||
    !draft?.mammothUsername ||
    !draft?.screenshotFileId ||
    !draft?.paymentMethod ||
    !draft?.paymentDetails
  ) {
    clearWizard(ctx.session);
    await ctx.reply("⚠️ Что-то пошло не так. Попробуйте заново.");
    await sendMainMenu(ctx);
    return;
  }

  const id = randomUUID();
  const dateStr = new Date().toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });

  payoutRequests.set(id, {
    userId: ctx.from!.id,
    workerUsername: draft.workerUsername,
    mammothUsername: draft.mammothUsername,
    screenshotFileId: draft.screenshotFileId,
    paymentMethod: draft.paymentMethod,
    paymentDetails: draft.paymentDetails,
    date: dateStr,
  });

  clearWizard(ctx.session);

  await ctx.reply(
    "✅ <b>Заявка успешно отправлена.</b>\n\n⏳ Ожидайте проверки администрации.",
    { parse_mode: "HTML", ...mainMenuInline }
  );

  const req = payoutRequests.get(id)!;
  const methodLabel = req.paymentMethod === "ton" ? "💎 TON-кошелёк" : "💳 Банковская карта";

  await ctx.telegram.sendPhoto(config.adminId, req.screenshotFileId, {
    caption:
      `📥 <b>Новая заявка на выплату</b>\n\n` +
      `👤 Воркер: ${req.workerUsername}\n` +
      `🎯 Мамонт: ${req.mammothUsername}\n\n` +
      `💰 Реквизиты (${methodLabel}):\n<code>${req.paymentDetails}</code>\n\n` +
      `📅 Дата: ${req.date}`,
    parse_mode: "HTML",
    reply_markup: adminPayoutInline(id).reply_markup,
  });
}
