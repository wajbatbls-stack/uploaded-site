FROM node:22-slim

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      libreoffice-core libreoffice-writer libreoffice-impress libreoffice-common \
      fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN npm install -g corepack@latest && corepack pnpm install && corepack pnpm run build

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
