FROM node:22-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Context = artifacts/telegram-bot — all paths are relative to it
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

# Install deps standalone (no monorepo)
RUN pnpm install --no-frozen-lockfile

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node_modules/.bin/tsx", "src/index.ts"]
