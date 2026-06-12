#!/bin/bash
echo "Pushing database schema..."
npx prisma db push --accept-data-loss
echo "Seeding database..."
npx tsx prisma/seed.ts
echo "Starting backend server..."
node dist/index.js
