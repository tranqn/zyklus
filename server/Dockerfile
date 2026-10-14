# Zyklus API: Node 26 runs the TypeScript sources directly (type stripping), SQLite is node:sqlite.
FROM node:26-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10.34.5
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:26-alpine
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "src/index.ts"]
