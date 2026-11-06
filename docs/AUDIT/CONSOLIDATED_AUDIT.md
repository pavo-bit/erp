# Consolidated Audit

Generated at 2026-11-06T08:26:31.059Z

HEAD: d3a56cb88dea3c1a30ef3f4b41aa6f8ab0d008c5

Evidence entries: 47

## Flagged evidence (commit not an ancestor of HEAD)

- laneA.json: 9b9676839352e89694e9f783286f34eef179fa03 — npx vitest run --config vitest.rls.config.ts src/tests/db/tenant-wrapper.test.ts
- laneA.json: 9b9676839352e89694e9f783286f34eef179fa03 — ..\scripts\heavy.ps1 -Command npm -ArgumentList @('run', 'test:rls')
- laneA.json: 9b9676839352e89694e9f783286f34eef179fa03 — ..\scripts\heavy.ps1 -Command npm -ArgumentList @('run', 'test:api')
- laneA.json: 49a99e320f78c80d4db1c9f225725ca3ee2a9069 — powershell -Command ". ..\scripts\test-env.ps1; npm run test:rls"
- laneA.json: 49a99e320f78c80d4db1c9f225725ca3ee2a9069 — powershell -Command ". ..\scripts\test-env.ps1; npm run test:api"
- laneA.json: 49a99e320f78c80d4db1c9f225725ca3ee2a9069 — npx tsc --noEmit
- laneA.json: a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be — npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "postgresql://postgres:postgres@localhost:5433/ssvm_shadow?schema=public" --exit-code
- laneA.json: a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be — powershell -Command ". ..\scripts\test-env.ps1; npm run db:verify-tables"
- laneA.json: a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be — node scripts/generate-tenant-classification.cjs --check
- laneA.json: a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be — powershell -Command ". ..\scripts\test-env.ps1; npm run test:rls"
- laneA.json: a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be — powershell -Command ". ..\scripts\test-env.ps1; npm run test:api"
- laneA.json: a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be — npx tsc --noEmit

## Entries

- [A] git status --short --branch; git rev-parse remediation/80pct; git show -s --format='%H %s' 3c9e389; git worktree list; git branch --list 'lane/a-db-spine' (3c9e389c6458765854273712475511b512604a96) 
- [A] git status --short --branch; git log -3 --oneline; Test-Path ssvm-backend\node_modules; Test-Path ssvm-backend\node_modules\.bin\vitest.cmd (3c9e389c6458765854273712475511b512604a96) 
- [A] npm ci (3c9e389c6458765854273712475511b512604a96) 
- [A] git diff --check (3c9e389c6458765854273712475511b512604a96) 
- [A] $evidence = Get-Content docs\AUDIT\evidence\laneA.json -Raw | ConvertFrom-Json -ErrorAction Stop; if ($evidence.lane -ne 'A') { throw 'Unexpected evidence lane' }; git diff --check; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; Write-Output "evidence entries=$($evidence.entries.Count); JSON valid" (3c9e389c6458765854273712475511b512604a96) 
- [A] Python edit script for ssvm-backend/src/app.ts; attempted to insert createApp at // Initialize Prometheus Metrics after removing that marker (3c9e389c6458765854273712475511b512604a96) 
- [A] Python edit src/tests/auth.test.ts using path ssvm-backend/src/tests/auth.test.ts from ssvm-backend working directory (3c9e389c6458765854273712475511b512604a96) 
- [A] npx tsc --noEmit (3c9e389c6458765854273712475511b512604a96) 
- [A] node --import tsx --input-type=module -e <fresh process imports src/app.ts then compares process.getActiveResourcesInfo()> (3c9e389c6458765854273712475511b512604a96) 
- [A] node --import tsx --input-type=module -e <ESM dynamic import app.ts then call named createApp export> (3c9e389c6458765854273712475511b512604a96) 
- [A] node --import tsx --input-type=module -e <createRequire app.ts; dummy local-only env; call createApp; compare active resources immediately after setImmediate> (3c9e389c6458765854273712475511b512604a96) 
- [A] node --import tsx --input-type=module -e <createRequire app.ts; dummy local-only env without REDIS_URL; call createApp; wait 250ms; compare process.getActiveResourcesInfo counts> (3c9e389c6458765854273712475511b512604a96) 
- [A] npx vitest run --config .vitest.app-import.config.ts (temporary setupFiles=[]; include src/tests/unit/app-import.test.ts; config removed after run) (3c9e389c6458765854273712475511b512604a96) 
- [A] git diff --check (3c9e389c6458765854273712475511b512604a96) 
- [A] npx vitest run src/tests/unit/app-import.test.ts (3c9e389c6458765854273712475511b512604a96) 
- [A] npm run type-check (3c9e389c6458765854273712475511b512604a96) 
- [A] ..\scripts\heavy.ps1 -Command npm -ArgumentList @('run', 'test:rls') (3c9e389c6458765854273712475511b512604a96) 
- [A] ..\scripts\heavy.ps1 -Command npm -ArgumentList @('run', 'test:api') (3c9e389c6458765854273712475511b512604a96) 
- [A] npx vitest run --config vitest.rls.config.ts src/tests/db/tenant-wrapper.test.ts (9b9676839352e89694e9f783286f34eef179fa03) ⚠️ NOT ANCESTOR
- [A] ..\scripts\heavy.ps1 -Command npm -ArgumentList @('run', 'test:rls') (9b9676839352e89694e9f783286f34eef179fa03) ⚠️ NOT ANCESTOR
- [A] ..\scripts\heavy.ps1 -Command npm -ArgumentList @('run', 'test:api') (9b9676839352e89694e9f783286f34eef179fa03) ⚠️ NOT ANCESTOR
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:rls" (49a99e320f78c80d4db1c9f225725ca3ee2a9069) ⚠️ NOT ANCESTOR
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:api" (49a99e320f78c80d4db1c9f225725ca3ee2a9069) ⚠️ NOT ANCESTOR
- [A] npx tsc --noEmit (49a99e320f78c80d4db1c9f225725ca3ee2a9069) ⚠️ NOT ANCESTOR
- [A] npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "postgresql://postgres:postgres@localhost:5433/ssvm_shadow?schema=public" --exit-code (a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be) ⚠️ NOT ANCESTOR
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run db:verify-tables" (a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be) ⚠️ NOT ANCESTOR
- [A] node scripts/generate-tenant-classification.cjs --check (a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be) ⚠️ NOT ANCESTOR
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:rls" (a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be) ⚠️ NOT ANCESTOR
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:api" (a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be) ⚠️ NOT ANCESTOR
- [A] npx tsc --noEmit (a77ac40f3cfcb02cf12e0f0683a9926eb5a7c2be) ⚠️ NOT ANCESTOR
- [A] powershell -Command ". ..\scripts\test-env.ps1; npx vitest run src/tests/api/tenant-isolation.test.ts" (52c05e2) 
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:api" (52c05e2) 
- [A] npx tsc --noEmit (52c05e2) 
- [A] powershell -Command ". ..\scripts\test-env.ps1; npx vitest run --config vitest.rls.config.ts --pool=threads --sequence.shuffle --sequence.seed=42819" (22907d1) 
- [A] powershell -Command ". ..\scripts\test-env.ps1; npx vitest run --config vitest.rls.config.ts --pool=threads --sequence.shuffle --sequence.seed=93721" (22907d1) 
- [A] npm run build (22907d1) 
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:rls" (58cf096) 
- [A] powershell -Command ". ..\scripts\test-env.ps1; npx vitest run src/tests/architecture.test.ts" (58cf096) 
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:unit" (58cf096) 
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:api" (58cf096) 
- [A] npx tsc --noEmit (58cf096) 
- [A] gh run watch 41525180831; gh pr checks 3 (0da984a) 
- [A] node scripts/generate-tenant-classification.cjs --check (HEAD) 
- [A] npx tsx scripts/test-upgrade-flow.ts (HEAD) 
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:rls" (HEAD) 
- [A] powershell -Command ". ..\scripts\test-env.ps1; npm run test:ci" (HEAD) 
- [A] npm run build (HEAD) 
