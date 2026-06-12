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

RUN apk add --no-cache bash
RUN npm install -g tsx prisma

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev --prefer-offline --no-audit

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

COPY entrypoint.sh ./
# convert CRLF to LF in case of Windows
RUN apk add --no-cache dos2unix && dos2unix entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 5000

CMD ["./entrypoint.sh"]
