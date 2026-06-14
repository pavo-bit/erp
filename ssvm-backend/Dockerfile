FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --prefer-offline --no-audit

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npx tsc || true

FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache bash curl redis
RUN npm install -g tsx prisma pm2

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev --prefer-offline --no-audit

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./

COPY entrypoint.sh ./
RUN apk add --no-cache dos2unix && dos2unix entrypoint.sh && chmod +x entrypoint.sh

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:5000/api/health || exit 1

EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npx", "pm2-runtime", "ecosystem.config.js", "--env", "production"]
