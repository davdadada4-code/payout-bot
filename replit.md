# Payout Bot

Telegram-бот для команды воркеров: приём заявок на выплату, уведомления админа, профит-сообщения с премиум-стикерами, статистика топ-100 воркеров, заявки в команду.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## Telegram Bot

### Запуск
Workflow: **Telegram Bot** → `pnpm --filter @workspace/telegram-bot run dev`

### Обязательные переменные окружения
| Переменная | Описание |
|---|---|
| `BOT_TOKEN` | Токен от @BotFather |
| `ADMIN_ID` | Ваш Telegram user ID (число). Узнать: @userinfobot |

### Опциональные
| Переменная | Описание |
|---|---|
| `BOT_USERNAME` | Username бота без @ |
| `PROFIT_CHAT_ID` | ID чата для профит-сообщений (число со знаком −) |
| `PROFIT_THREAD_ID` | ID ветки/топика в этом чате (0 = без ветки) |
| `SUPPORT_LINK` | Ссылка на поддержку |
| `RULES_TEXT` | Текст правил (HTML: `<b>`, `<i>`, `<code>`) |

### Файл данных
Статистика сохраняется в `data/stats.json` (создаётся автоматически).

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
