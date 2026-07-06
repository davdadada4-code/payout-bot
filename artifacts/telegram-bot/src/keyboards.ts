import { Markup } from "telegraf";

// ── Main menu (inline) ────────────────────────────────────────────────────────
export const mainMenuInline = Markup.inlineKeyboard([
  [Markup.button.callback("💰 Подать заявку на выплату", "menu:payout")],
  [
    Markup.button.callback("📊 Статистика", "menu:stats"),
    Markup.button.callback("👑 Топ воркеров", "menu:top"),
  ],
  [
    Markup.button.callback("🤝 Заявка в команду", "menu:team"),
    Markup.button.callback("📖 Правила", "menu:rules"),
  ],
  [Markup.button.callback("🆘 Поддержка", "menu:support")],
]);

// ── Cancel (used during wizard steps) ────────────────────────────────────────
export const cancelInline = Markup.inlineKeyboard([
  [Markup.button.callback("❌ Отмена", "cancel")],
]);

// ── Payment method ────────────────────────────────────────────────────────────
export const paymentMethodInline = Markup.inlineKeyboard([
  [Markup.button.callback("💎 TON Кошелёк", "payment:ton")],
  [Markup.button.callback("💳 Банковская карта", "payment:card")],
  [Markup.button.callback("❌ Отмена", "cancel")],
]);

// ── Admin payout decision ─────────────────────────────────────────────────────
export const adminPayoutInline = (requestId: string) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Подтвердить", `approve_payout:${requestId}`),
      Markup.button.callback("❌ Отклонить", `reject_payout:${requestId}`),
    ],
  ]);

// ── Admin team decision ───────────────────────────────────────────────────────
export const adminTeamInline = (requestId: string) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Принять", `approve_team:${requestId}`),
      Markup.button.callback("❌ Отклонить", `reject_team:${requestId}`),
    ],
  ]);
