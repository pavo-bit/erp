/**
 * Contract Test: API Hook URL Prefix Validation
 * 
 * Ensures every URL string in api-hooks.ts starts with /api/v1/
 * (the now-universal backend prefix), preventing the class of bug
 * where a hook accidentally skips the prefix during migrations.
 * 
 * Run: npx vitest run src/__tests__/api-hooks-contract.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('API Hooks Contract Test', () => {
  const hooksFilePath = path.resolve(__dirname, '../../src/lib/api-hooks.ts');
  const hooksContent = fs.readFileSync(hooksFilePath, 'utf-8');

  it('every URL string in api-hooks.ts should start with /api/v1/', () => {
    // Match all URL strings: both "/api/..." and `/api/...` (template literals)
    const urlPattern = /["'`]\/api\/[^"'`\s]+["'`]/g;
    const matches = hooksContent.match(urlPattern) || [];

    const violations: string[] = [];

    for (const match of matches) {
      // Strip quotes/backticks to get the raw URL
      const url = match.replace(/^["'`]|["'`]$/g, '');
      
      // Allow /api/v1/ and /api/v2/ prefixed URLs
      if (!url.startsWith('/api/v1/') && !url.startsWith('/api/v2/')) {
        violations.push(url);
      }
    }

    expect(
      violations,
      `Found ${violations.length} URL(s) missing the /api/v1/ prefix:\n${violations.map(v => `  - ${v}`).join('\n')}\n\nAll API hook URLs must start with /api/v1/ to match the backend's universal route namespace.`
    ).toEqual([]);
  });

  it('should have at least 10 hooks defined (sanity check)', () => {
    const hookPattern = /export function use\w+/g;
    const hooks = hooksContent.match(hookPattern) || [];
    expect(hooks.length).toBeGreaterThanOrEqual(10);
  });

  it('no apiCall() or fetch() invocation in the codebase should use unprefixed /api/ paths', () => {
    // Scan all .ts/.tsx files under src/ for unprefixed /api/ calls
    const srcDir = path.resolve(__dirname, '../../src');
    const violations: { file: string; line: number; content: string }[] = [];

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '__tests__') continue;
          scanDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            // Match "/api/xxx or `/api/xxx where xxx does NOT start with v1/ or v2/
            // Skip comments
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
            const unprefixedPattern = /["'`]\/api\/(?!v[12]\/)[a-z]/;
            if (unprefixedPattern.test(line)) {
              violations.push({
                file: path.relative(srcDir, fullPath),
                line: idx + 1,
                content: line.trim(),
              });
            }
          });
        }
      }
    }

    scanDir(srcDir);

    expect(
      violations,
      `Found ${violations.length} unprefixed /api/ URL(s) in the codebase:\n${violations.map(v => `  ${v.file}:${v.line} → ${v.content}`).join('\n')}\n\nAll API calls must use the /api/v1/ prefix.`
    ).toEqual([]);
  });
});
