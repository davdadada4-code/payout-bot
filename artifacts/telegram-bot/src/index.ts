import { Telegraf, session } from "telegraf";
import http from "http";
import type { Context } from "./context.js";
import type { SessionData } from "./sessions.js";
import { config, validate } from "./config.js";
import { registerMenuHandlers } from "./handlers/menu.js";
import { registerPayoutHandlers, handlePayoutStep } from "./handlers/payout.js";
import { registerTeamHandlers, handleTeamStep } from "./handlers/team.js";
import { registerAdminHandlers } from "./handlers/admin.js";
import { clearWizard } from "./sessions.js";

validate();

const bot = new Telegraf<Context>(config.botToken);

bot.use(
  session<SessionData, Context>({
    defaultSession: () => ({}),
  })
);

// Register all handlers (each module adds its own bot.action / bot.on listeners)
registerMenuHandlers(bot);   // support wizard, cancel, stats, top, rules
registerPayoutHandlers(bot); // payout wizard button actions
registerTeamHandlers(bot);   // team wizard button actions
registerAdminHandlers(bot);  // admin amount input, support reply, approve/reject

// ── Shared message handler: group filter + wizard text steps + fallback ───────
bot.on("message", async (ctx, next) => {
  // Bot only responds in DMs
  if (ctx.chat?.type !== "private") return;

  // Payout wizard text/photo steps
  if (await handlePayoutStep(ctx)) return;

  // Team wizard text steps
  if (await handleTeamStep(ctx)) return;

  // Fallback: show main menu for any unhandled text
  clearWizard(ctx.session);
  await import("./handlers/menu.js").then(({ sendMainMenu }) => sendMainMenu(ctx));
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

process.once("SIGINT",  () => { bot.stop("SIGINT");  server.close(); });
process.once("SIGTERM", () => { bot.stop("SIGTERM"); server.close(); });

bot.launch().then(() => {
  console.log("✅ Bot started");
}).catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
