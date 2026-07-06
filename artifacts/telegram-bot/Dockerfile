FROM node:22-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy only the bot's own files — no monorepo context needed
COPY artifacts/telegram-bot/package.json ./package.json
COPY artifacts/telegram-bot/tsconfig.json ./tsconfig.json
COPY artifacts/telegram-bot/src ./src

# Install deps standalone (no workspace)
RUN pnpm install --no-frozen-lockfile

ENV NODE_ENV=production
EXPOSE 3000

# Run directly with tsx — no compile step needed
CMD ["node_modules/.bin/tsx", "src/index.ts"]
