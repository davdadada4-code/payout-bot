import { Telegraf, session } from "telegraf";
import type { Context } from "./context.js";
import type { SessionData } from "./sessions.js";
import { config, validate } from "./config.js";
import { registerMenuHandlers, supportMap } from "./handlers/menu.js";
import { registerPayoutHandlers, handlePayoutStep } from "./handlers/payout.js";
import { registerTeamHandlers, handleTeamStep } from "./handlers/team.js";
import { registerAdminHandlers, handleAdminConfirmStep } from "./handlers/admin.js";

validate();

const bot = new Telegraf<Context>(config.botToken);

// Session middleware
bot.use(
  session<SessionData, Context>({
    defaultSession: () => ({}),
  })
);

// Register all handlers
registerMenuHandlers(bot);
registerPayoutHandlers(bot);
registerTeamHandlers(bot);
registerAdminHandlers(bot);

// Wizard message dispatcher — runs after specific hears/actions
bot.on("message", async (ctx, next) => {
  const msg = ctx.message;
  const fromId = ctx.from?.id;

  // Admin reply to forwarded support message → relay back to user
  if (fromId === config.adminId && msg && "reply_to_message" in msg && msg.reply_to_message) {
    const replyToId = msg.reply_to_message.message_id;
    const targetUserId = supportMap.get(replyToId);
    if (targetUserId) {
      const replyText = "text" in msg ? msg.text : undefined;
      if (replyText) {
        await ctx.telegram.sendMessage(
          targetUserId,
          `💬 <b>Ответ администрации:</b>\n\n${replyText}`,
          { parse_mode: "HTML" }
        );
        await ctx.reply("✅ Ответ отправлен пользователю.");
      }
      return;
    }
  }

  // Admin confirm flow (amount entry after approval)
  if (await handleAdminConfirmStep(ctx)) return;
  // Payout wizard
  if (await handlePayoutStep(ctx)) return;
  // Team wizard
  if (await handleTeamStep(ctx)) return;

  // Support forwarding — forward any user message to admin
  if (fromId && fromId !== config.adminId) {
    const from = ctx.from!;
    const username = from.username ? `@${from.username}` : `${from.first_name ?? ""}`.trim();
    const header = `🆘 <b>Сообщение в поддержку</b>\n👤 ${username} (<code>${from.id}</code>):`;

    let forwarded: { message_id: number } | null = null;

    if ("text" in msg && msg.text) {
      forwarded = await ctx.telegram.sendMessage(
        config.adminId,
        `${header}\n\n${msg.text}`,
        { parse_mode: "HTML" }
      );
    } else if ("photo" in msg && msg.photo) {
      const fileId = msg.photo[msg.photo.length - 1]!.file_id;
      forwarded = await ctx.telegram.sendPhoto(config.adminId, fileId, {
        caption: `${header}${msg.caption ? `\n\n${msg.caption}` : ""}`,
        parse_mode: "HTML",
      });
    } else if ("document" in msg && msg.document) {
      forwarded = await ctx.telegram.sendDocument(config.adminId, msg.document.file_id, {
        caption: `${header}${msg.caption ? `\n\n${msg.caption}` : ""}`,
        parse_mode: "HTML",
      });
    } else if ("video" in msg && msg.video) {
      forwarded = await ctx.telegram.sendVideo(config.adminId, msg.video.file_id, {
        caption: `${header}${msg.caption ? `\n\n${msg.caption}` : ""}`,
        parse_mode: "HTML",
      });
    } else if ("voice" in msg && msg.voice) {
      forwarded = await ctx.telegram.sendVoice(config.adminId, msg.voice.file_id, {
        caption: header,
        parse_mode: "HTML",
      });
    } else if ("sticker" in msg && msg.sticker) {
      await ctx.telegram.sendMessage(config.adminId, header, { parse_mode: "HTML" });
      forwarded = await ctx.telegram.sendSticker(config.adminId, msg.sticker.file_id);
    }

    if (forwarded) {
      supportMap.set(forwarded.message_id, from.id);
      await ctx.reply(
        "✅ Сообщение отправлено администрации. Ожидайте ответа.",
        { ...{ reply_markup: { remove_keyboard: true } } }
      );
    }
    return;
  }

  return next();
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot
  .launch()
  .then(() => {
    console.log("✅ Bot started successfully");
  })
  .catch((err) => {
    console.error("❌ Failed to start bot:", err);
    process.exit(1);
  });
