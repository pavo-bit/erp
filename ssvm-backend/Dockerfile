# Stage 1: Build Environment
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL (required by Prisma on Alpine)
RUN apk add --no-cache openssl

# Copy package configurations
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for tsc)
RUN npm install

# Copy application source code
COPY . .

# Generate Prisma Client and Compile TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma execution
RUN apk add --no-cache openssl

# Set Production Environment
ENV NODE_ENV=production

# Copy built assets and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Create uploads directory structure and non-root user for security
RUN mkdir -p /app/uploads/gallery /app/uploads/documents /app/uploads/temp /app/backups
RUN addgroup -S ssvmgroup && adduser -S ssvmuser -G ssvmgroup
RUN chown -R ssvmuser:ssvmgroup /app
USER ssvmuser

# Expose backend API port
EXPOSE 5000

# Start command
CMD ["npm", "start"]
