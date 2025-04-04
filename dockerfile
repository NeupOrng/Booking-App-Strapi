FROM node:latest
# or another compatible Node version

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm run build

EXPOSE 1337

CMD ["pnpm", "run", "start"]