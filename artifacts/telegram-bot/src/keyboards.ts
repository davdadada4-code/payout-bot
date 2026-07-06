import { Markup } from "telegraf";

export const mainMenu = Markup.keyboard([
  ["💰 Подать заявку на выплату"],
  ["📊 Статистика", "👑 Топ воркеров"],
  ["🤝 Заявка в команду", "📖 Правила"],
  ["🆘 Поддержка"],
])
  .resize()
  .persistent();

export const paymentMethodKeyboard = Markup.keyboard([
  ["💎 TON Кошелек"],
  ["💳 Банковская карта"],
  ["❌ Отмена"],
])
  .resize()
  .oneTime();

export const cancelKeyboard = Markup.keyboard([["❌ Отмена"]]).resize().oneTime();

export const adminPayoutInline = (requestId: string) =>
  Markup.inlineKeyboard([
    Markup.button.callback("✅ Подтвердить", `approve_payout:${requestId}`),
    Markup.button.callback("❌ Отклонить", `reject_payout:${requestId}`),
  ]);

export const adminTeamInline = (requestId: string) =>
  Markup.inlineKeyboard([
    Markup.button.callback("✅ Принять", `approve_team:${requestId}`),
    Markup.button.callback("❌ Отклонить", `reject_team:${requestId}`),
  ]);
