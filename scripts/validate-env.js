#!/usr/bin/env node
/**
 * scripts/validate-env.js
 * Multi-Profile Environment Validator for Multi-School SaaS School ERP
 *
 * Supported Profiles:
 *   - development
 *   - test
 *   - pilot
 *   - production
 *
 * Usage:
 *   node scripts/validate-env.js --profile=production
 *   node scripts/validate-env.js --profile=pilot --env-file=.env
 *   node scripts/validate-env.js --profile=development
 *   node scripts/validate-env.js --profile=test
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse CLI flags
const args = process.argv.slice(2);
let profileArg = null;
let envFileArg = null;

for (const arg of args) {
  if (arg.startsWith('--profile=')) {
    profileArg = arg.split('=')[1].trim().toLowerCase();
  } else if (arg.startsWith('--env-file=')) {
    envFileArg = arg.split('=')[1].trim();
  }
}

const PROFILE = profileArg || process.env.PROFILE || process.env.NODE_ENV || 'development';
const VALID_PROFILES = ['development', 'test', 'pilot', 'production'];

if (!VALID_PROFILES.includes(PROFILE)) {
  console.error(`\x1b[31m[ERROR] Invalid profile '${PROFILE}'. Supported profiles: ${VALID_PROFILES.join(', ')}\x1b[0m`);
  process.exit(1);
}

// Helper to parse .env file format into key-value map
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    // Handle escaped newlines for PEM keys
    val = val.replace(/\\n/g, '\n');
    env[key] = val;
  }
  return env;
}

// Load environment variables with precedence:
// 1. Explicit env file (if provided)
// 2. process.env
// 3. ssvm-backend/.env
// 4. root .env
let loadedEnv = {};
const resolvedPaths = [];

if (envFileArg) {
  const p = path.resolve(process.cwd(), envFileArg);
  if (fs.existsSync(p)) {
    Object.assign(loadedEnv, parseEnvFile(p));
    resolvedPaths.push(p);
  } else {
    console.warn(`\x1b[33m[WARN] Specified env file not found: ${p}\x1b[0m`);
  }
} else {
  const defaultLocations = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'ssvm-backend', '.env'),
    path.resolve(process.cwd(), 'ssvm-backend', `.env.${PROFILE}`),
  ];
  for (const loc of defaultLocations) {
    if (fs.existsSync(loc)) {
      Object.assign(loadedEnv, parseEnvFile(loc));
      resolvedPaths.push(loc);
    }
  }
}

// Overlay active process.env
for (const [k, v] of Object.entries(process.env)) {
  if (v !== undefined && v !== '') {
    loadedEnv[k] = v;
  }
}

// Diagnostic trackers
const passed = [];
const warnings = [];
const errors = [];

function check(label, fn) {
  try {
    const res = fn();
    if (res === true || res === undefined) {
      passed.push(label);
    } else if (typeof res === 'string') {
      warnings.push(`${label}: ${res}`);
    }
  } catch (err) {
    errors.push(`${label}: ${err.message}`);
  }
}

// Helper to mask secret strings safely
function maskSecret(val) {
  if (!val) return '<empty>';
  if (val.length <= 8) return '********';
  return `${val.substring(0, 3)}...${val.substring(val.length - 3)} (len: ${val.length})`;
}

// Shannon entropy check for secret randomness
function calculateEntropy(str) {
  const freq = {};
  for (let i = 0; i < str.length; i++) {
    freq[str[i]] = (freq[str[i]] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const PLACEHOLDER_PATTERNS = [
  'placeholder', 'changeme', 'change_me', 'default', 'secret', 'password',
  'example', 'dummy', 'your-secret', '123456',
];

function isPlaceholder(val) {
  if (!val) return true;
  const lower = val.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pat) => lower.includes(pat));
}

console.log('═'.repeat(75));
console.log(`  SSVM PLATFORM MULTI-PROFILE ENVIRONMENT VALIDATION`);
console.log(`  Active Profile : \x1b[36m${PROFILE.toUpperCase()}\x1b[0m`);
console.log(`  Loaded Configs : ${resolvedPaths.length ? resolvedPaths.join(', ') : 'process.env only'}`);
console.log(`  Node Version   : ${process.version}`);
console.log(`  Timestamp      : ${new Date().toISOString()}`);
console.log('═'.repeat(75));

// ─────────────────────────────────────────────────────────────
// 1. DATABASE & CONNECTION STRINGS
// ─────────────────────────────────────────────────────────────
console.log('\n[1/5] Validating Database & Connection Configurations...');

check('DATABASE_URL format and existence', () => {
  const val = loadedEnv.DATABASE_URL || (PROFILE === 'test' ? loadedEnv.DATABASE_URL_TEST : null);
  if (!val) throw new Error('DATABASE_URL is missing');
  if (!val.startsWith('postgres://') && !val.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URI');
  }
  if ((PROFILE === 'production' || PROFILE === 'pilot') && isPlaceholder(val)) {
    throw new Error('DATABASE_URL contains placeholder password or credentials in ' + PROFILE);
  }
  if (PROFILE === 'production' && (val.includes('localhost') || val.includes('127.0.0.1'))) {
    return 'DATABASE_URL points to localhost/127.0.0.1; ensure host networking is expected in production';
  }
});

check('Tenant-isolated DB connection pools (DATABASE_URL_AUTH / DATABASE_URL_TRUSTED)', () => {
  if (PROFILE === 'production' || PROFILE === 'pilot') {
    if (!loadedEnv.DATABASE_URL_AUTH) {
      throw new Error('DATABASE_URL_AUTH (dedicated auth role) is required in ' + PROFILE);
    }
    if (!loadedEnv.DATABASE_URL_TRUSTED) {
      throw new Error('DATABASE_URL_TRUSTED (trusted cross-tenant audit role) is required in ' + PROFILE);
    }
  } else {
    if (!loadedEnv.DATABASE_URL_AUTH || !loadedEnv.DATABASE_URL_TRUSTED) {
      return 'DATABASE_URL_AUTH or DATABASE_URL_TRUSTED not defined; backend will fallback to main connection';
    }
  }
});

// ─────────────────────────────────────────────────────────────
// 2. CRYPTOGRAPHIC KEYS & TOKEN SECRETS
// ─────────────────────────────────────────────────────────────
console.log('\n[2/5] Validating Cryptographic Keys, Secrets & Entropy...');

check('JWT / Asymmetric Token Signing Key Integrity', () => {
  const hasAsymmetric =
    (loadedEnv.ACCESS_TOKEN_PRIVATE_KEY && loadedEnv.ACCESS_TOKEN_PUBLIC_KEY) ||
    (loadedEnv.ACCESS_TOKEN_PUBLIC_KEY && loadedEnv.ACCESS_TOKEN_PUBLIC_KEY.includes('BEGIN PUBLIC KEY'));
  const jwtSecret = loadedEnv.JWT_SECRET || loadedEnv.ACCESS_TOKEN_SECRET;

  if (PROFILE === 'production') {
    if (!hasAsymmetric && !jwtSecret) {
      throw new Error('Neither valid Asymmetric RSA/EdDSA keys nor JWT_SECRET are provided');
    }
    if (jwtSecret) {
      if (isPlaceholder(jwtSecret)) {
        throw new Error('JWT_SECRET contains insecure placeholder pattern');
      }
      if (jwtSecret.length < 32) {
        throw new Error(`JWT_SECRET length (${jwtSecret.length}) is below required minimum of 32 characters`);
      }
      const entropy = calculateEntropy(jwtSecret);
      if (entropy < 3.0) {
        throw new Error(`JWT_SECRET entropy (${entropy.toFixed(2)}) is too low for production safety`);
      }
    }
  } else if (PROFILE === 'pilot') {
    if (!hasAsymmetric && !jwtSecret) {
      throw new Error('Either token keys or JWT_SECRET must be supplied for pilot deployment');
    }
    if (jwtSecret && isPlaceholder(jwtSecret)) {
      throw new Error('JWT_SECRET in pilot environment must not be a known default placeholder');
    }
  } else {
    if (!hasAsymmetric && !jwtSecret) {
      return 'No token secrets found; default test secrets will be used';
    }
  }
});

check('DPDP Compliance: FIELD_ENCRYPTION_KEY', () => {
  const key = loadedEnv.FIELD_ENCRYPTION_KEY;
  if (!key) {
    if (PROFILE === 'production' || PROFILE === 'pilot') {
      throw new Error('FIELD_ENCRYPTION_KEY is required for DPDP compliance (must be 64-character hex string)');
    }
    return 'FIELD_ENCRYPTION_KEY missing; DPDP column encryption disabled in local mode';
  }

  if (key.length !== 64) {
    throw new Error(`FIELD_ENCRYPTION_KEY must be exactly 64 hex characters (found ${key.length})`);
  }
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('FIELD_ENCRYPTION_KEY contains non-hexadecimal characters');
  }
  if ((PROFILE === 'production' || PROFILE === 'pilot') && isPlaceholder(key)) {
    throw new Error('FIELD_ENCRYPTION_KEY cannot be a predictable repeating placeholder');
  }
});

// ─────────────────────────────────────────────────────────────
// 3. NETWORK, CORS & SECURITY HEADERS
// ─────────────────────────────────────────────────────────────
console.log('\n[3/5] Validating Network, CORS & Origin Safeguards...');

check('FRONTEND_URL & CORS Origin Boundary', () => {
  const frontendUrl = loadedEnv.FRONTEND_URL || 'http://localhost:3000';
  if (PROFILE === 'production') {
    if (frontendUrl.includes('*')) {
      throw new Error('CORS wildcard (*) is forbidden in production environment');
    }
    if (!frontendUrl.startsWith('https://')) {
      return `FRONTEND_URL does not use HTTPS (${frontendUrl}); strictly verify TLS termination at ingress`;
    }
  } else if (PROFILE === 'pilot') {
    if (frontendUrl.includes('*')) {
      throw new Error('CORS wildcard (*) is forbidden in pilot environment');
    }
  }
});

check('Cookie Security & Domain Attributes', () => {
  if (PROFILE === 'production') {
    const secureCookie = loadedEnv.COOKIE_SECURE !== 'false' && loadedEnv.SECURE_COOKIE !== 'false';
    if (!secureCookie) {
      return 'COOKIE_SECURE is explicitly set to false; cookies will not require HTTPS';
    }
  }
});

// ─────────────────────────────────────────────────────────────
// 4. STORAGE, DATA DIRECTORIES & COMPLIANCE
// ─────────────────────────────────────────────────────────────
console.log('\n[4/5] Validating Storage, Retention & Directory Configurations...');

check('UPLOAD_DIR Path & Access', () => {
  const uploadDir = loadedEnv.UPLOAD_DIR || './uploads';
  if (PROFILE === 'production' || PROFILE === 'pilot') {
    if (uploadDir.startsWith('/tmp') || uploadDir === '/tmp') {
      throw new Error('UPLOAD_DIR must not point to volatile /tmp directory in production/pilot');
    }
  }
});

check('Backup Retention Policy (BACKUP_RETENTION_DAYS)', () => {
  const days = parseInt(loadedEnv.BACKUP_RETENTION_DAYS || '30', 10);
  if (isNaN(days) || days < 7) {
    if (PROFILE === 'production') {
      throw new Error('BACKUP_RETENTION_DAYS must be configured for at least 7 days in production');
    }
    return 'BACKUP_RETENTION_DAYS is less than 7 days';
  }
});

// ─────────────────────────────────────────────────────────────
// 5. CACHE, QUEUES & INCIDENT SUBSYSTEMS
// ─────────────────────────────────────────────────────────────
console.log('\n[5/5] Validating Cache, BullMQ Queues & Observability...');

check('REDIS_URL & BullMQ Infrastructure', () => {
  const redisUrl = loadedEnv.REDIS_URL;
  if (PROFILE === 'production' || PROFILE === 'pilot') {
    if (!redisUrl) {
      throw new Error('REDIS_URL is required in ' + PROFILE + ' for BullMQ workers and SHFI cache');
    }
    if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      throw new Error('REDIS_URL must use redis:// or rediss:// protocol');
    }
  } else {
    if (!redisUrl) {
      return 'REDIS_URL not configured; memory-fallback mode will be used';
    }
  }
});

check('Third-party Payment Gateway Safeguards (Razorpay)', () => {
  const keyId = loadedEnv.RAZORPAY_KEY_ID;
  const keySecret = loadedEnv.RAZORPAY_KEY_SECRET;

  if (PROFILE === 'production') {
    if (keyId && keyId.startsWith('rzp_test_')) {
      throw new Error('RAZORPAY_KEY_ID uses test key prefix (rzp_test_) in production profile');
    }
  } else if (PROFILE === 'development' || PROFILE === 'test') {
    if (keyId && keyId.startsWith('rzp_live_')) {
      return 'RAZORPAY_KEY_ID uses live prefix in non-production environment; use caution';
    }
  }
});

// ─────────────────────────────────────────────────────────────
// SUMMARY & REPORT GENERATION
// ─────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(75));
console.log(`VALIDATION RESULT FOR PROFILE: \x1b[1m${PROFILE.toUpperCase()}\x1b[0m`);
console.log(`  Passed Checks : \x1b[32m${passed.length}\x1b[0m`);
console.log(`  Warnings      : \x1b[33m${warnings.length}\x1b[0m`);
console.log(`  Errors        : \x1b[31m${errors.length}\x1b[0m`);
console.log('─'.repeat(75));

if (warnings.length > 0) {
  console.log('\n\x1b[33mWARNINGS:\x1b[0m');
  for (const w of warnings) {
    console.log(`  ⚠ ${w}`);
  }
}

if (errors.length > 0) {
  console.log('\n\x1b[31mERRORS (FAIL-CLOSED):\x1b[0m');
  for (const e of errors) {
    console.log(`  ✖ ${e}`);
  }
  console.log('\n\x1b[31m[FAILED] Environment validation failed for profile ' + PROFILE + '.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\n\x1b[32m[PASSED] Environment configuration is healthy and valid for profile ' + PROFILE + '.\x1b[0m\n');
  process.exit(0);
}

