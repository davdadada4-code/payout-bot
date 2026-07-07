import { Telegraf, session } from "telegraf";
import http from "http";
import https from "https";
import type { Context } from "./context.js";
import type { SessionData } from "./sessions.js";
import { config, validate } from "./config.js";
import { registerMenuHandlers, sendMainMenu } from "./handlers/menu.js";
import { registerPayoutHandlers, handlePayoutStep } from "./handlers/payout.js";
import { registerTeamHandlers, handleTeamStep } from "./handlers/team.js";
import { registerAdminHandlers } from "./handlers/admin.js";
import { clearWizard } from "./sessions.js";

validate();

const bot = new Telegraf<Context>(config.botToken);

bot.use(
  session<SessionData, Context>({ defaultSession: () => ({}) })
);

registerMenuHandlers(bot);
registerPayoutHandlers(bot);
registerTeamHandlers(bot);
registerAdminHandlers(bot);

// ── Global error handler: log and continue, never crash on bad updates ────────
bot.catch((err, ctx) => {
  const e = err as { message?: string; response?: { error_code?: number } };
  const code = e?.response?.error_code;
  // 400 = stale callback query / message not modified — safe to ignore
  // 403 = bot blocked by user — safe to ignore
  if (code === 400 || code === 403) {
    console.warn(`⚠️ Ignored Telegram error ${code}: ${e?.message}`);
    return;
  }
  console.error("Unhandled bot error:", err);
});

bot.on("message", async (ctx, next) => {
  if (ctx.chat?.type !== "private") return;
  if (await handlePayoutStep(ctx)) return;
  if (await handleTeamStep(ctx)) return;
  clearWizard(ctx.session);
  await sendMainMenu(ctx);
  return next();
});

// ─────────────────────────────────────────────────────────────────────────────
const PORT     = Number(process.env.PORT ?? 3000);
const SELF_URL = process.env.RENDER_EXTERNAL_URL; // auto-set by Render

/** Creates HTTP server with /health + optional extra handler for webhook path */
function makeServer(extra?: http.RequestListener): http.Server {
  return http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
      return;
    }
    if (extra) {
      extra(req, res);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false }));
    }
  });
}

async function main() {
  if (SELF_URL) {
    // ── WEBHOOK MODE (Render) ────────────────────────────────────────────────
    // Telegram pushes updates to us — no polling, no 409 conflict with local dev
    const webhookPath    = `/webhook/${config.botToken}`;
    const webhookHandler = await bot.createWebhook({ domain: SELF_URL, path: webhookPath });

    const server = makeServer(webhookHandler);
    server.listen(PORT, () => console.log(`🌐 Server on port ${PORT}`));

    // Self-ping every 4 min so Render free tier never sleeps
    const pingUrl    = `${SELF_URL}/health`;
    const httpClient = pingUrl.startsWith("https") ? https : http;
    const pingTimer  = setInterval(() => {
      httpClient.get(pingUrl, (res) => {
        console.log(`🔁 Self-ping → ${res.statusCode}`);
      }).on("error", (err) => {
        console.error("⚠️ Self-ping failed:", err.message);
      });
    }, 4 * 60 * 1000);

    console.log(`✅ Bot started in webhook mode`);
    console.log(`🔁 Self-ping active → ${pingUrl}`);

    const shutdown = (sig: string) => {
      clearInterval(pingTimer);
      bot.stop(sig);
      server.close();
    };
    process.once("SIGINT",  () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));

  } else {
    // ── POLLING MODE (local Replit dev) ──────────────────────────────────────
    const server = makeServer();
    server.listen(PORT, () => console.log(`🌐 Health server on port ${PORT}`));

    bot.launch();
    console.log("✅ Bot started in polling mode (local dev)");

    process.once("SIGINT",  () => { bot.stop("SIGINT");  server.close(); });
    process.once("SIGTERM", () => { bot.stop("SIGTERM"); server.close(); });
  }
}

main().catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
