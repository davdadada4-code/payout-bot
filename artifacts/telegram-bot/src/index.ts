import { Telegraf, session } from "telegraf";
import type { Context } from "./context.js";
import type { SessionData } from "./sessions.js";
import { config, validate } from "./config.js";
import { registerMenuHandlers } from "./handlers/menu.js";
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
  // Admin confirm flow (amount entry after approval)
  if (await handleAdminConfirmStep(ctx)) return;
  // Payout wizard
  if (await handlePayoutStep(ctx)) return;
  // Team wizard
  if (await handleTeamStep(ctx)) return;
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
