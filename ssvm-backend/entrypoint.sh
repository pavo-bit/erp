#!/bin/bash

# Extract Redis host/port/password if possible, or assume localhost if not fully parsed.
# A simpler approach: Just try locking with a small node script since we already have ioredis.
# Writing a quick inline node script for the lock:

cat << 'EOF' > /tmp/migrate-lock.js
const Redis = require('ioredis');
const { execSync } = require('child_process');

async function run() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  
  console.log("Attempting to acquire migration lock...");
  
  // Try up to 60 times (10 minutes)
  for (let i = 0; i < 60; i++) {
    const lock = await redis.set("db_migration_lock", "locked", "NX", "EX", 60);
    if (lock === "OK") {
      console.log("Lock acquired. Running migrations...");
      try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      } catch (e) {
        console.error("Migration failed:", e.message);
      }
      await redis.del("db_migration_lock");
      break;
    } else {
      console.log("Another instance is running migrations. Waiting 10s...");
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  
  redis.disconnect();
}

run().catch(console.error);
EOF

node /tmp/migrate-lock.js

echo "Starting CMD..."
exec "$@"
