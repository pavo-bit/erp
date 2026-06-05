# ═══════════════════════════════════════════════════════════════
# SSVM Frontend — Dockerfile
# Self-contained Next.js container with isolated virtual environment
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Dependencies (isolated layer — cached) ───────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package manifests for maximum Docker layer caching
COPY package.json package-lock.json* ./

# Create isolated node_modules environment
RUN npm ci --ignore-scripts

# ── Stage 2: Build the Next.js application ────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Pull cached dependencies from isolated deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy entire frontend source
COPY . .

# Build-time argument: backend API URL (injected by docker-compose)
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build configuration
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compile Next.js into standalone output
RUN npm run build

# ── Stage 3: Production Runtime (clean, minimal image) ────────
FROM node:20-alpine AS production

LABEL maintainer="SSVM College Square"
LABEL description="Frontend Container — Next.js 16 Standalone"

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create isolated non-root user environment
RUN addgroup -g 1001 -S frontendgroup && \
    adduser  -u 1001 -S frontenduser -G frontendgroup

# Runtime environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy only the standalone build output (no source code, no node_modules)
COPY --from=builder --chown=frontenduser:frontendgroup /app/public          ./public
COPY --from=builder --chown=frontenduser:frontendgroup /app/.next/standalone ./
COPY --from=builder --chown=frontenduser:frontendgroup /app/.next/static     ./.next/static

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Run as non-root user (isolated environment)
USER frontenduser

# Start the standalone Next.js server
CMD ["node", "server.js"]
