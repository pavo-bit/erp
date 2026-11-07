#!/usr/bin/env node
/**
 * scripts/run-parallel-checks.js
 * High-Performance Parallel Check & Test Execution Coordinator
 * Optimized for AMD Ryzen 7 8845HS (8 Cores / 16 Threads, 16 GB RAM)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configurable concurrency budget (target 4-6 on Ryzen 7, preserving 3-4 GB RAM)
const defaultConcurrency = Math.min(6, Math.max(2, Math.floor(os.cpus().length / 3)));
const args = process.argv.slice(2);
let concurrency = defaultConcurrency;
const concurrencyArg = args.find(a => a.startsWith('--concurrency='));
if (concurrencyArg) {
  concurrency = parseInt(concurrencyArg.split('=')[1], 10) || defaultConcurrency;
} else if (process.env.CONCURRENCY) {
  concurrency = parseInt(process.env.CONCURRENCY, 10) || defaultConcurrency;
}

const rootDir = path.resolve(__dirname, '..');
const logDir = path.join(rootDir, '.logs', 'parallel-checks');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Hardware profile
const totalRamGB = (os.totalmem() / (1024 ** 3)).toFixed(2);
const startFreeRamGB = (os.freemem() / (1024 ** 3)).toFixed(2);

console.log('========================================================================');
console.log('   SSVM ERP HIGH-PERFORMANCE PARALLEL EXECUTION COORDINATOR');
console.log('========================================================================');
console.log(`CPU Architecture:    ${os.cpus()[0]?.model || 'AMD Ryzen 7'} (${os.cpus().length} logical cores)`);
console.log(`System Memory:       ${totalRamGB} GB total, ${startFreeRamGB} GB free at launch`);
console.log(`Active Concurrency:  ${concurrency} simultaneous workers`);
console.log(`Log Directory:       ${logDir}`);
console.log('------------------------------------------------------------------------\n');

// Common test environment variables
const testEnv = {
  ...process.env,
  DATABASE_URL: 'postgresql://ssvm_app:app_pw@localhost:5433/ssvm_test?schema=public',
  DATABASE_URL_TEST: 'postgresql://ssvm_app:app_pw@localhost:5433/ssvm_test?schema=public',
  DATABASE_URL_TEST_FIXTURE: 'postgresql://ssvm_fixture:fixture_pw@localhost:5433/ssvm_test?schema=public',
  DATABASE_URL_AUTH: 'postgresql://ssvm_auth:authpassword@localhost:5433/ssvm_test?schema=public',
  DATABASE_URL_TRUSTED: 'postgresql://ssvm_trusted:trustedpassword@localhost:5433/ssvm_test?schema=public',
  DATABASE_URL_ADMIN: 'postgresql://postgres:postgres@localhost:5433/postgres',
  DIRECT_URL: 'postgresql://postgres:postgres@localhost:5433/ssvm_test?schema=public',
  REDIS_URL_TEST: 'redis://localhost:6379/1',
  REDIS_URL: 'redis://localhost:6379/1',
  JWT_SECRET: 'test-jwt-secret-key-ssvm-college-square-test-environment-32chars',
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --preserve-symlinks --preserve-symlinks-main`.trim(),
};

// Task definitions
const tasks = [
  // 1. Backend Type Check
  {
    id: 'backend-typecheck',
    name: 'Backend Type-Check (tsc)',
    category: 'TYPECHECK',
    cwd: path.join(rootDir, 'ssvm-backend'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsc', '--noEmit'],
    mandatory: true,
  },
  // 2. Tenant Classification & RLS Coverage Check
  {
    id: 'tenant-classification',
    name: 'Tenant Classification Check',
    category: 'RLS_SECURITY',
    cwd: path.join(rootDir, 'ssvm-backend'),
    command: process.platform === 'win32' ? 'node.exe' : 'node',
    args: ['scripts/generate-tenant-classification.cjs', '--check'],
    mandatory: true,
  },
  // 3. Frontend Portal Type Checks
  {
    id: 'erp-admin-typecheck',
    name: 'ERP Admin Type-Check',
    category: 'TYPECHECK',
    cwd: path.join(rootDir, 'erp-admin'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsc', '--noEmit'],
    mandatory: true,
  },
  {
    id: 'super-admin-typecheck',
    name: 'Super Admin Type-Check',
    category: 'TYPECHECK',
    cwd: path.join(rootDir, 'super-admin'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsc', '--noEmit'],
    mandatory: true,
  },
  {
    id: 'parent-portal-typecheck',
    name: 'Parent Portal Type-Check',
    category: 'TYPECHECK',
    cwd: path.join(rootDir, 'parent-portal'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsc', '--noEmit'],
    mandatory: true,
  },
  {
    id: 'student-portal-typecheck',
    name: 'Student Portal Type-Check',
    category: 'TYPECHECK',
    cwd: path.join(rootDir, 'student-portal'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsc', '--noEmit'],
    mandatory: true,
  },
  {
    id: 'teacher-portal-typecheck',
    name: 'Teacher Portal Type-Check',
    category: 'TYPECHECK',
    cwd: path.join(rootDir, 'teacher-portal'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsc', '--noEmit'],
    mandatory: true,
  },
  {
    id: 'payment-portal-typecheck',
    name: 'Payment Portal Type-Check',
    category: 'TYPECHECK',
    cwd: path.join(rootDir, 'payment-portal'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsc', '--noEmit'],
    mandatory: true,
  },
  {
    id: 'saas-frontend-typecheck',
    name: 'SaaS Frontend Type-Check',
    category: 'TYPECHECK',
    cwd: path.join(rootDir, 'saas-frontend'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['tsc', '--noEmit'],
    mandatory: true,
  },
  // 4. Backend Unit Suites (Gradebook, Money, RBAC, Circuit Breaker, etc.)
  {
    id: 'backend-unit-tests',
    name: 'Backend Unit Tests (87 tests)',
    category: 'UNIT_TESTS',
    cwd: path.join(rootDir, 'ssvm-backend'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['vitest', 'run', 'src/tests/unit/'],
    env: { ...testEnv, VITEST_POOL_ID: 'unit' },
    mandatory: true,
  },
  // 5. Phase 3 Academic Integration Tests (Timetable, Report Card, Promotion)
  {
    id: 'academic-integration-tests',
    name: 'Academic Integration Tests (21 tests)',
    category: 'INTEGRATION',
    cwd: path.join(rootDir, 'ssvm-backend'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: [
      'vitest',
      'run',
      'src/tests/api/academic-timetable-collision.test.ts',
      'src/tests/api/academic-report-card.test.ts',
      'src/tests/api/academic-promotion.test.ts',
    ],
    env: { ...testEnv, VITEST_POOL_ID: 'acad' },
    mandatory: true,
  },
  // 6. Phase 2 Financial Tests (Refunds & Invariants)
  {
    id: 'finance-refund-tests',
    name: 'Finance Refund & Reversal Tests (7 tests)',
    category: 'INTEGRATION',
    cwd: path.join(rootDir, 'ssvm-backend'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['vitest', 'run', 'src/tests/api/payments-refund.test.ts'],
    env: { ...testEnv, VITEST_POOL_ID: 'fin' },
    mandatory: true,
  },
  // 7. Phase 2 Addendum Cash Collection & Offline Payments (17 tests)
  {
    id: 'cash-collection-tests',
    name: 'Cash Collection & Offline Payments (17 tests)',
    category: 'INTEGRATION',
    cwd: path.join(rootDir, 'ssvm-backend'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['vitest', 'run', 'src/tests/api/cash-collection.test.ts'],
    env: { ...testEnv, VITEST_POOL_ID: 'cash' },
    mandatory: true,
  },
  // 8. Business Modules Completion Tests (Phases 2, 3, 4, 5, 6)
  {
    id: 'business-modules-tests',
    name: 'Business Modules Completion Tests (Phases 2, 3, 4, 5, 6)',
    category: 'INTEGRATION',
    cwd: path.join(rootDir, 'ssvm-backend'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['vitest', 'run', 'src/tests/api/business-modules-completion.test.ts'],
    env: { ...testEnv, VITEST_POOL_ID: 'biz' },
    mandatory: true,
  },
  // 9. Phase 7 SHFI Incident Management & Health Tests
  {
    id: 'shfi-center-tests',
    name: 'SHFI Incident & Health Centre Tests (Phase 7)',
    category: 'INTEGRATION',
    cwd: path.join(rootDir, 'ssvm-backend'),
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['vitest', 'run', 'src/tests/api/shfi-center.test.ts'],
    env: { ...testEnv, VITEST_POOL_ID: 'shfi' },
    mandatory: true,
  },
  // 10. Phase 8 Disaster Recovery & Isolated Restore Verification
  {
    id: 'dr-restore-verification',
    name: 'DR Isolated Restore & RTO/RPO Verification (Phase 8)',
    category: 'INTEGRATION',
    cwd: rootDir,
    command: 'node',
    args: ['scripts/dr-test.js'],
    env: { ...testEnv },
    mandatory: true,
  },
];

const results = [];
let activeWorkers = 0;
let activeDbWorkers = 0;
let queueIndex = 0;
const startTime = Date.now();

function isDbTask(task) {
  return task.category === 'INTEGRATION' || task.category === 'UNIT_TESTS';
}

function runNext(resolve) {
  if (queueIndex >= tasks.length && activeWorkers === 0) {
    resolve();
    return;
  }

  while (activeWorkers < concurrency && queueIndex < tasks.length) {
    const nextTask = tasks[queueIndex];
    if (isDbTask(nextTask) && activeDbWorkers > 0) {
      break;
    }

    const task = tasks[queueIndex++];
    activeWorkers++;
    if (isDbTask(task)) {
      activeDbWorkers++;
    }

    const logFile = path.join(logDir, `${task.id}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'w' });

    console.log(`[START] [${task.category.padEnd(12)}] ${task.name}`);
    const taskStart = Date.now();

    const child = spawn(task.command, task.args, {
      cwd: task.cwd,
      env: task.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);

    child.on('close', (code) => {
      activeWorkers--;
      if (isDbTask(task)) {
        activeDbWorkers--;
      }
      const durationMs = Date.now() - taskStart;
      const durationSec = (durationMs / 1000).toFixed(2);
      const passed = code === 0;

      const statusTag = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
      console.log(`[DONE ] [${statusTag}] ${task.name} (${durationSec}s, code: ${code})`);

      results.push({
        id: task.id,
        name: task.name,
        category: task.category,
        durationSec,
        exitCode: code,
        passed,
        mandatory: task.mandatory,
        logFile,
      });

      runNext(resolve);
    });

    child.on('error', (err) => {
      activeWorkers--;
      if (isDbTask(task)) {
        activeDbWorkers--;
      }
      const durationSec = ((Date.now() - taskStart) / 1000).toFixed(2);
      console.error(`[ERROR] ${task.name}: ${err.message}`);
      results.push({
        id: task.id,
        name: task.name,
        category: task.category,
        durationSec,
        exitCode: 1,
        passed: false,
        mandatory: task.mandatory,
        logFile,
      });
      runNext(resolve);
    });
  }
}

new Promise((resolve) => runNext(resolve)).then(() => {
  const totalElapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const endFreeRamGB = (os.freemem() / (1024 ** 3)).toFixed(2);

  console.log('\n========================================================================');
  console.log('                    PARALLEL EXECUTION CONSOLIDATED SUMMARY');
  console.log('========================================================================');
  console.log('Category      | Task Name                          | Status | Time (s) | Exit');
  console.log('--------------+------------------------------------+--------+----------+-----');

  let allMandatoryPassed = true;

  for (const r of results) {
    const cat = r.category.padEnd(13);
    const name = r.name.padEnd(34);
    const stat = r.passed ? ' PASS ' : ' FAIL ';
    const time = `${r.durationSec}s`.padStart(8);
    const exit = String(r.exitCode).padStart(4);
    console.log(`${cat} | ${name} | ${stat} | ${time} | ${exit}`);

    if (r.mandatory && !r.passed) {
      allMandatoryPassed = false;
    }
  }

  console.log('------------------------------------------------------------------------');
  console.log(`Total Elapsed Time:  ${totalElapsedSec}s`);
  console.log(`Memory Usage:        ${startFreeRamGB} GB free at start -> ${endFreeRamGB} GB free at end`);
  console.log(`All Tasks Complete:  ${results.filter(r => r.passed).length} / ${results.length} passed`);
  console.log('========================================================================\n');

  if (!allMandatoryPassed) {
    console.error('FAILED: One or more mandatory checks failed. Review individual logs in:');
    console.error(logDir);
    process.exit(1);
  } else {
    console.log('SUCCESS: All parallel checks passed cleanly.');
    process.exit(0);
  }
});

