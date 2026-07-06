FROM node:22-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy only the bot package (no other artifacts needed)
COPY artifacts/telegram-bot/package.json ./artifacts/telegram-bot/
RUN pnpm install --frozen-lockfile --filter @workspace/telegram-bot

# Copy source
COPY artifacts/telegram-bot ./artifacts/telegram-bot

# Build (compile TS)
RUN cd artifacts/telegram-bot && npx tsc

# Run
WORKDIR /app/artifacts/telegram-bot
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
