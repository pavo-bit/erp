import { test, expect, request as playwrightRequest, BrowserContext } from '@playwright/test';
import process from 'node:process';
import crypto from 'node:crypto';
import { SCHOOL_A_ID, SCHOOL_B_ID, E2E_PASSWORD, E2E_USERS } from '../fixtures/seed';

function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (let i = 0; i < base32.length; i++) {
    const idx = alphabet.indexOf(base32[i].toUpperCase());
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateTOTP(secret: string, timeStep = 30): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
const ERP_ADMIN_URL = process.env.ERP_ADMIN_URL || 'http://localhost:3000';
const SUPER_ADMIN_URL = process.env.SUPER_ADMIN_URL || 'http://localhost:3001';

interface CookieHeaderItem {
  name: string;
  value: string;
}

interface ModuleStatusItem {
  code?: string;
  isEnabled?: boolean;
  enabled?: boolean;
  module?: {
    code: string;
  };
}

interface AuditLogRecord {
  id?: string;
  action: string;
  entityId: string;
  schoolId: string;
}

/**
 * Helper to log in a dedicated APIRequestContext and inject its cookies into a browser context
 */
async function createAuthenticatedSession(email: string, portalUrl: string, browserContext?: BrowserContext) {
  let portal = 'erp-admin';
  if (portalUrl.includes('3001') || portalUrl.includes('super-admin')) {
    portal = 'super-admin';
  } else if (portalUrl.includes('3002') || portalUrl.includes('teacher')) {
    portal = 'teacher-portal';
  } else if (portalUrl.includes('3003') || portalUrl.includes('student')) {
    portal = 'student-portal';
  } else if (portalUrl.includes('3006') || portalUrl.includes('parent')) {
    portal = 'parent-portal';
  } else if (portalUrl.includes('3007') || portalUrl.includes('payment')) {
    portal = 'payment-portal';
  } else if (portalUrl.includes('3008') || portalUrl.includes('saas')) {
    portal = 'saas-frontend';
  }

  const apiContext = await playwrightRequest.newContext();
  const loginRes = await apiContext.post(`${BACKEND_URL}/api/v1/auth/login`, {
    data: { email, password: E2E_PASSWORD, portal },
  });
  expect(loginRes.status(), await loginRes.text()).toBe(200);

  // Fetch /me to obtain active CSRF token and refresh cookies
  const meRes = await apiContext.get(`${BACKEND_URL}/api/v1/auth/me`);
  const csrfToken = meRes.headers()['x-csrf-token'] || loginRes.headers()['x-csrf-token'] || '';

  const headers = (loginRes.headersArray ? loginRes.headersArray() : []) as CookieHeaderItem[];
  const setCookies = headers.filter((h: CookieHeaderItem) => h.name.toLowerCase() === 'set-cookie');
  const accessCookie = setCookies.find(
    (h: CookieHeaderItem) =>
      h.value.startsWith('access_token=') ||
      h.value.startsWith('platform_access_token=') ||
      h.value.startsWith('school_access_token=')
  );
  const accessToken = accessCookie ? accessCookie.value.split(';')[0].split('=')[1] : '';

  if (browserContext) {
    const cookiesToSet = setCookies.map((h: CookieHeaderItem) => {
      const parts = h.value.split(';');
      const [name, ...valParts] = parts[0].trim().split('=');
      const value = valParts.join('=');
      return {
        name,
        value,
        url: portalUrl,
      };
    });
    if (cookiesToSet.length > 0) {
      await browserContext.addCookies(cookiesToSet);
    }
    // The application reads its CSRF token from browser sessionStorage.
    // Seed it from the token returned by the authenticated API session; do not bypass CSRF.
    if (csrfToken) {
      await browserContext.addInitScript((token: string) => {
        window.sessionStorage.setItem("csrfToken", token);
      }, csrfToken);
    }
  }

  // Construct authenticated request context configured with CSRF token and Bearer token
  const authHeaders: Record<string, string> = {};
  if (csrfToken) {
    authHeaders['x-csrf-token'] = csrfToken;
  }
  if (accessToken) {
    authHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const authenticatedContext = await playwrightRequest.newContext({
    storageState: await apiContext.storageState(),
    extraHTTPHeaders: authHeaders,
  });

  return authenticatedContext;
}

test.describe('Block BM — Security, Module Governance & Audited Support Sessions', () => {
  test.setTimeout(90000);

  // ═════════════════════════════════════════════════════════════════════
  // F1b: Cross-portal cookie isolation — audience-specific cookies must not
  //      authenticate against the other audience's API surface.
  //
  //      Browser-level checks on a shared localhost origin cannot prove this:
  //      cookies are host-scoped, not port-scoped, so every portal on
  //      localhost receives every cookie. Production isolates portals by
  //      domain. We therefore assert the audience contract directly.
  // ═════════════════════════════════════════════════════════════════════
  test('F1b: Cross-portal cookie isolation', async ({ page, context }) => {
    // 1. Browser context test: log in as super admin, then open erp-admin
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.superAdmin.email, SUPER_ADMIN_URL, context);
    await page.goto(`${ERP_ADMIN_URL}/admin`, { timeout: 60000 });
    await page.waitForTimeout(2000);
    const erpShowsLogin =
      page.url().includes('/login') ||
      page.url() === `${ERP_ADMIN_URL}/` ||
      (await page.getByText(/sign in|log in|login/i).count()) > 0;
    expect(erpShowsLogin).toBeTruthy();

    // 2. Reverse: log in as school ERP admin, then open super-admin
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.erpAdmin.email, ERP_ADMIN_URL, context);
    await page.goto(`${SUPER_ADMIN_URL}/dashboard`, { timeout: 60000 });
    await page.waitForTimeout(2000);
    const superShowsLogin =
      page.url().includes('/login') ||
      page.url() === `${SUPER_ADMIN_URL}/` ||
      (await page.getByText(/sign in|log in|login/i).count()) > 0;
    expect(superShowsLogin).toBeTruthy();

    // 3. Platform login issues a platform-audience cookie, never a school one
    const platformContext = await createAuthenticatedSession(
      E2E_USERS.superAdmin.email,
      SUPER_ADMIN_URL
    );
    const platformState = await platformContext.storageState();
    const platformCookieNames = platformState.cookies.map((cookie) => cookie.name);
    expect(platformCookieNames).toContain('platform_access_token');
    expect(platformCookieNames).not.toContain('school_access_token');

    // 4. School login issues a school-audience cookie, never a platform one
    const schoolContext = await createAuthenticatedSession(E2E_USERS.erpAdmin.email, ERP_ADMIN_URL);
    const schoolState = await schoolContext.storageState();
    const schoolCookieNames = schoolState.cookies.map((cookie) => cookie.name);
    expect(schoolCookieNames).toContain('school_access_token');
    expect(schoolCookieNames).not.toContain('platform_access_token');

    // 5. A platform-audience cookie alone must not authenticate school APIs
    const platformOnlyState = {
      cookies: platformState.cookies.filter((cookie) => cookie.name === 'platform_access_token'),
      origins: [],
    };
    const platformOnly = await playwrightRequest.newContext({ storageState: platformOnlyState });
    const schoolApiAsPlatform = await platformOnly.get(`${BACKEND_URL}/api/v1/students`);
    expect(schoolApiAsPlatform.status()).toBe(403);
    expect((await schoolApiAsPlatform.json()).error).toBe('WRONG_PORTAL');

    // 6. A school-audience cookie alone must not authenticate platform APIs
    const schoolOnlyState = {
      cookies: schoolState.cookies.filter((cookie) => cookie.name === 'school_access_token'),
      origins: [],
    };
    const schoolOnly = await playwrightRequest.newContext({ storageState: schoolOnlyState });
    const platformApiAsSchool = await schoolOnly.get(
      `${BACKEND_URL}/api/v1/platform/schools/health-usage`
    );
    expect(platformApiAsSchool.status()).toBe(403);
    expect((await platformApiAsSchool.json()).error).toBe('WRONG_PORTAL');
  });

  // ═════════════════════════════════════════════════════════════════════
  // F6: School ERP Admin cannot open Grafana or platform URLs
  // ═════════════════════════════════════════════════════════════════════
  test('F6: School ERP Admin cannot open Grafana or platform URLs', async ({ page, context }) => {
    // 1. Authenticate ERP Admin with isolated API context + browser cookies
    const erpApi = await createAuthenticatedSession(E2E_USERS.erpAdmin.email, ERP_ADMIN_URL, context);

    // 2. Strict API Gateway Guard: Platform Grafana Reverse Proxy -> 403 Forbidden
    const grafanaRes = await erpApi.get(`${BACKEND_URL}/api/v1/platform/grafana/dashboard`);
    expect(grafanaRes.status()).toBe(403);
    const grafanaBody = await grafanaRes.json();
    expect(grafanaBody.success).toBe(false);
    expect(grafanaBody.error).toMatch(/Forbidden|WRONG_PORTAL/);

    // 3. Strict API Gateway Guard: Platform Health/Usage -> 403 Forbidden
    const healthRes = await erpApi.get(`${BACKEND_URL}/api/v1/platform/schools/health-usage`);
    expect(healthRes.status()).toBe(403);

    // 4. Strict API Gateway Guard: Support Sessions Request -> 403 Forbidden
    const supportReqRes = await erpApi.post(`${BACKEND_URL}/api/v1/platform/support-sessions/request`, {
      data: {
        schoolId: SCHOOL_A_ID,
        reason: 'Unauthorized attempt',
        durationMinutes: 15,
        mfaToken: '000000',
      },
    });
    expect(supportReqRes.status()).toBe(403);

    // 5. Browser UI Test on ERP Admin Portal: Analytics Page
    await page.goto(`${ERP_ADMIN_URL}/admin/analytics`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Verify native charts exist
    await expect(page.getByText('Student Enrolment Trend')).toBeVisible();
    await expect(page.getByText('Attendance Rate Progression')).toBeVisible();
    await expect(page.getByText('Fee Collected vs Due')).toBeVisible();
    await expect(page.getByText(/Defaulters Overview/i)).toBeVisible();

    // Verify NO Grafana iframe exists anywhere on the page
    const grafanaIframes = await page.locator('iframe[src*="grafana"], iframe[src*="3004"]').count();
    expect(grafanaIframes).toBe(0);

    // 6. Direct Browser Navigation to Super Admin Platform Dashboard is Denied
    await page.goto(`${SUPER_ADMIN_URL}/dashboard`, { timeout: 60000 });
    await page.waitForTimeout(2000);
    const isLoginOrDenied =
      page.url().includes('/login') ||
      (await page.getByText(/unauthorized|forbidden|sign in/i).count()) > 0;
    expect(isLoginOrDenied).toBeTruthy();
  });

  // ═════════════════════════════════════════════════════════════════════
  // F7: Super Admin enables then disables Hostel for School A,
  // ERP Admin sidebar reflects it, School B unchanged
  // ═════════════════════════════════════════════════════════════════════
  test('F7: Super Admin enables then disables Hostel for School A, ERP Admin sidebar reflects it, School B unchanged', async ({ page, context }) => {
    // 1. Authenticate Super Admin with dedicated isolated API context
    const superApi = await createAuthenticatedSession(E2E_USERS.superAdmin.email, SUPER_ADMIN_URL);

    // 2. Initial Setup: Ensure Hostel is disabled for both School A and School B
    await superApi.patch(`${BACKEND_URL}/api/v1/schools/${SCHOOL_A_ID}/modules/HOSTEL`, {
      data: { enabled: false },
    });
    await superApi.patch(`${BACKEND_URL}/api/v1/schools/${SCHOOL_B_ID}/modules/HOSTEL`, {
      data: { enabled: false },
    });

    // 3. Authenticate School A ERP Admin in browser context
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.erpAdmin.email, ERP_ADMIN_URL, context);

    await page.goto(`${ERP_ADMIN_URL}/admin`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Verify Hostel Management link is NOT present initially
    const initialHostelCount = await page.locator('a[href="/admin/hostel"]').count();
    expect(initialHostelCount).toBe(0);

    // 4. Super Admin ENABLES Hostel for School A
    const enableRes = await superApi.patch(`${BACKEND_URL}/api/v1/schools/${SCHOOL_A_ID}/modules/HOSTEL`, {
      data: { enabled: true },
    });
    expect(enableRes.status()).toBe(200);

    // 5. School A ERP Admin page reloads: Hostel Management is now rendered
    await page.reload();
    await page.waitForTimeout(2500);

    // The Campus Operations group only renders when at least one of its
    // module-gated children is entitled; expand it to reach Hostel Management.
    const campusGroup = page.getByRole('button', { name: /Campus Operations/i });
    await expect(campusGroup).toBeVisible({ timeout: 15000 });
    await campusGroup.click();
    await expect(page.locator('a[href="/admin/hostel"]')).toBeVisible({ timeout: 10000 });

    // 6. Verify School B is UNCHANGED: Hostel remains disabled
    const schoolBModulesRes = await superApi.get(`${BACKEND_URL}/api/v1/schools/${SCHOOL_B_ID}/modules`);
    expect(schoolBModulesRes.status()).toBe(200);
    const schoolBModules = await schoolBModulesRes.json();
    const hostelOnB = (schoolBModules.data?.modules || []).find(
      (m: ModuleStatusItem) => (m.module?.code || m.code) === 'HOSTEL'
    );
    expect(hostelOnB?.isEnabled).toBe(false);

    // 7. Super Admin DISABLES Hostel for School A
    const disableRes = await superApi.patch(`${BACKEND_URL}/api/v1/schools/${SCHOOL_A_ID}/modules/HOSTEL`, {
      data: { enabled: false },
    });
    expect(disableRes.status()).toBe(200);

    // 8. School A ERP Admin page reloads: Hostel Management is GONE
    await page.reload();
    await page.waitForTimeout(2500);
    if (await campusGroup.isVisible()) {
      await campusGroup.click().catch(() => { });
      await page.waitForTimeout(500);
    }
    await expect(page.locator('a[href="/admin/hostel"]')).toHaveCount(0);
  });

  // ═════════════════════════════════════════════════════════════════════
  // F8: Support session start, banner visible in ERP Admin,
  // revoke, banner gone, audit entry exists
  // ═════════════════════════════════════════════════════════════════════
  test('F8: Support session start, banner visible in ERP Admin, revoke, banner gone, audit entry exists', async ({ page, context }) => {
    // 1. Authenticate Super Admin with dedicated isolated API context
    const superApi = await createAuthenticatedSession(E2E_USERS.superAdmin.email, SUPER_ADMIN_URL);

    // 2. Authenticate School A ERP Admin in browser context
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.erpAdmin.email, ERP_ADMIN_URL, context);

    await page.goto(`${ERP_ADMIN_URL}/admin`, { timeout: 60000 });
    await page.waitForTimeout(1500);

    // Initially NO support banner visible
    await expect(page.getByText('READ-ONLY PLATFORM ACCESS')).not.toBeVisible();

    // 3. Super Admin starts a support session for School A with a genuine TOTP code
    let totpSecret = 'JBSWY3DPEHPK3PXP';
    const setupRes = await superApi.post(`${BACKEND_URL}/api/v1/2fa/setup`);
    if (setupRes.status() === 200) {
      const setupData = await setupRes.json();
      if (setupData?.data?.secret) {
        totpSecret = setupData.data.secret;
        const initialCode = generateTOTP(totpSecret);
        await superApi.post(`${BACKEND_URL}/api/v1/2fa/verify-setup`, {
          data: { token: initialCode },
        });
      }
    }

    const realTotpCode = generateTOTP(totpSecret);
    const sessionReason = `E2E Diagnostic Audit ${Date.now()}`;
    const startSessionRes = await superApi.post(`${BACKEND_URL}/api/v1/platform/support-sessions/request`, {
      data: {
        schoolId: SCHOOL_A_ID,
        reason: sessionReason,
        durationMinutes: 15,
        mfaCode: realTotpCode,
        mfaToken: realTotpCode,
      },
    });
    expect(startSessionRes.status()).toBe(201);
    const sessionData = await startSessionRes.json();
    expect(sessionData.success).toBe(true);
    const sessionId = sessionData.data.sessionId;
    expect(sessionId).toBeTruthy();

    // 4. ERP Admin sees the Support Session Banner
    await page.reload();
    await page.waitForTimeout(2000);

    await expect(page.getByText('READ-ONLY PLATFORM ACCESS')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(sessionReason)).toBeVisible();
    await expect(page.getByText(E2E_USERS.superAdmin.email)).toBeVisible();

    // 5. Super Admin revokes the support session
    const revokeRes = await superApi.post(`${BACKEND_URL}/api/v1/platform/support-sessions/${sessionId}/revoke`);
    expect(revokeRes.status()).toBe(200);
    const revokeData = await revokeRes.json();
    expect(revokeData.success).toBe(true);
    expect(revokeData.data.session.status).toBe('REVOKED');

    // 6. ERP Admin page refreshes: Banner is GONE
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(page.getByText('READ-ONLY PLATFORM ACCESS')).not.toBeVisible();

    // 7. Audit log verification: Super Admin queries security audit logs
    let auditRes = await superApi.get(`${BACKEND_URL}/api/v1/admin/audit`);
    if (auditRes.status() !== 200) {
      auditRes = await superApi.get(`${BACKEND_URL}/api/v1/saas/security/audit-logs`);
    }
    expect(auditRes.status()).toBe(200);
    const auditData = await auditRes.json();
    expect(auditData.success).toBe(true);
    const logs = (auditData.data || []) as AuditLogRecord[];

    const initiatedAudit = logs.find(
      (l: AuditLogRecord) => l.action === 'SUPPORT_SESSION_INITIATED' && l.entityId === sessionId
    );
    expect(initiatedAudit).toBeTruthy();
    expect(initiatedAudit?.schoolId).toBe(SCHOOL_A_ID);

    const revokedAudit = logs.find(
      (l: AuditLogRecord) => l.action === 'SUPPORT_SESSION_REVOKED' && l.entityId === sessionId
    );
    expect(revokedAudit).toBeTruthy();
    expect(revokedAudit?.schoolId).toBe(SCHOOL_A_ID);
  });
});
