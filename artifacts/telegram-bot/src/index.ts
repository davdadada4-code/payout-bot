import { Telegraf, session } from "telegraf";
import http from "http";
import type { Context } from "./context.js";
import type { SessionData } from "./sessions.js";
import { config, validate } from "./config.js";
import { registerMenuHandlers, sendMainMenu, supportMap } from "./handlers/menu.js";
import { registerPayoutHandlers, handlePayoutStep } from "./handlers/payout.js";
import { registerTeamHandlers, handleTeamStep } from "./handlers/team.js";
import { registerAdminHandlers, handleAdminConfirmStep } from "./handlers/admin.js";
import { clearWizard } from "./sessions.js";

validate();

const bot = new Telegraf<Context>(config.botToken);

bot.use(
  session<SessionData, Context>({
    defaultSession: () => ({}),
  })
);

registerMenuHandlers(bot);
registerPayoutHandlers(bot);
registerTeamHandlers(bot);
registerAdminHandlers(bot);

// ── Message handler ────────────────────────────────────────────────────────────
bot.on("message", async (ctx, next) => {
  // Ignore ALL messages in groups/supergroups/channels — bot only works in DM
  const chatType = ctx.chat?.type;
  if (chatType !== "private") return;

  const msg = ctx.message;
  const fromId = ctx.from?.id;

  // ── Admin: relay reply back to user who wrote support ─────────────────────
  if (
    fromId === config.adminId &&
    msg &&
    "reply_to_message" in msg &&
    msg.reply_to_message
  ) {
    const targetUserId = supportMap.get(msg.reply_to_message.message_id);
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

  // ── Admin: enter payout amount after approval ─────────────────────────────
  if (await handleAdminConfirmStep(ctx)) return;

  // ── Payout wizard steps ───────────────────────────────────────────────────
  if (await handlePayoutStep(ctx)) return;

  // ── Team wizard steps ─────────────────────────────────────────────────────
  if (await handleTeamStep(ctx)) return;

  // ── Support: user typed message after clicking Поддержка button ───────────
  if (ctx.session.supportStep === "waiting_message" && fromId !== config.adminId) {
    ctx.session.supportStep = undefined;

    const from = ctx.from!;
    const username = from.username ? `@${from.username}` : from.first_name ?? `id${from.id}`;
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
    }

    await ctx.reply(
      "✅ Сообщение отправлено администрации. Ожидайте ответа.",
      { parse_mode: "HTML" }
    );
    await sendMainMenu(ctx);
    return;
  }

  // ── Fallback: show main menu ───────────────────────────────────────────────
  clearWizard(ctx.session);
  await sendMainMenu(ctx);
  return next();
});

// ── HTTP health server (keeps Render free tier alive) ─────────────────────────
const PORT = Number(process.env.PORT ?? 3000);
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
  }
});
server.listen(PORT, () => console.log(`🌐 Health server on port ${PORT}`));

process.once("SIGINT", () => { bot.stop("SIGINT"); server.close(); });
process.once("SIGTERM", () => { bot.stop("SIGTERM"); server.close(); });

bot.launch().then(() => {
  console.log("✅ Bot started");
}).catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
