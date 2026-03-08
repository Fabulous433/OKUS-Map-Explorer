FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/shared ./shared
COPY --from=build /app/server ./server
COPY --from=build /app/script ./script
COPY --from=build /app/docs/PATDA_MST_KECAMATAN.json ./docs/PATDA_MST_KECAMATAN.json
COPY --from=build /app/docs/PATDA_MST_KELURAHAN.json ./docs/PATDA_MST_KELURAHAN.json

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
