import { test, expect, request as playwrightRequest, BrowserContext } from '@playwright/test';
import process from 'node:process';
import { E2E_PASSWORD, E2E_USERS } from '../fixtures/seed';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
const ERP_ADMIN_URL = process.env.ERP_ADMIN_URL || 'http://localhost:3000';
const SUPER_ADMIN_URL = process.env.SUPER_ADMIN_URL || 'http://localhost:3001';
const TEACHER_PORTAL_URL = process.env.TEACHER_PORTAL_URL || 'http://localhost:3002';
const STUDENT_PORTAL_URL = process.env.STUDENT_PORTAL_URL || 'http://localhost:3003';
const PARENT_PORTAL_URL = process.env.PARENT_PORTAL_URL || 'http://localhost:3006';
const PAYMENT_PORTAL_URL = process.env.PAYMENT_PORTAL_URL || 'http://localhost:3007';
const SAAS_FRONTEND_URL = process.env.SAAS_FRONTEND_URL || 'http://localhost:3008';

interface CookieHeaderItem {
  name: string;
  value: string;
}

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
  expect(loginRes.status()).toBe(200);

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

test.describe('School ERP UI/UX Refinement — Seven-Portal Standardization', () => {
  test.setTimeout(90000);

  // ═════════════════════════════════════════════════════════════════════
  // 1. ERP Admin: Dashboard Quick Actions & Navigation
  // ═════════════════════════════════════════════════════════════════════
  test('ERP Admin: Dashboard displays 4 institutional quick actions routing correctly', async ({ page, context }) => {
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.erpAdmin.email, ERP_ADMIN_URL, context);

    await page.goto(`${ERP_ADMIN_URL}/admin`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Verify Overview KPI Cards
    await expect(page.getByText('Enrolled Students')).toBeVisible();
    await expect(page.getByText('Teaching Faculty')).toBeVisible();
    await expect(page.getByText(/Today's Attendance/i)).toBeVisible();
    await expect(page.getByText('Fee Collections')).toBeVisible();

    // Verify 4 Core Quick Actions
    await expect(page.getByText('Add Student')).toBeVisible();
    await expect(page.getByText('Import Students')).toBeVisible();
    await expect(page.getByText('Add Teacher')).toBeVisible();
    await expect(page.getByText('Import Staff')).toBeVisible();

    // Clicking "Import Students" navigates directly to the dedicated import page
    await page.getByRole('link', { name: /Import Students/i }).click();
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('/admin/students/import');
    await expect(page.getByText('Bulk Student Import')).toBeVisible();
    await expect(page.getByText('Step 1 — Download Official Template')).toBeVisible();
  });

  // ═════════════════════════════════════════════════════════════════════
  // 2. ERP Admin: Student Manual Entry Drawer Lifecycle
  // ═════════════════════════════════════════════════════════════════════
  test('ERP Admin: Student drawer opens, validates, and supports Add Another / Done', async ({ page, context }) => {
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.erpAdmin.email, ERP_ADMIN_URL, context);

    await page.goto(`${ERP_ADMIN_URL}/admin/students`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    const addStudentBtn = page.getByRole('button', { name: 'Add Student' });
    await expect(addStudentBtn).toBeVisible();
    await addStudentBtn.click();

    // Verify Drawer Header
    await expect(page.getByText('Register New Student')).toBeVisible();
    await expect(page.getByText('Section 1 — Personal Details')).toBeVisible();
    await expect(page.getByText('Section 2 — Admission Details')).toBeVisible();
    await expect(page.getByText('Section 3 — Guardian Details')).toBeVisible();

    // Fill Student 1
    const uniqueStamp = Date.now().toString().slice(-4);
    const student1Name = `Aarav E2E ${uniqueStamp}`;
    await page.locator('input[name="firstName"]').fill(student1Name);
    await page.locator('input[name="className"]').fill('10');
    await page.locator('input[name="section"]').fill('A');
    await page.locator('input[name="guardianPhone"]').fill('9876543210');

    await page.getByRole('button', { name: 'Save Student' }).click();

    // Verify Success Modal appears
    await expect(page.getByText('Student Added Successfully')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Add Another' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();

    // Click "Add Another" to register Student 2
    await page.getByRole('button', { name: 'Add Another' }).click();
    await page.waitForTimeout(500);

    const firstNameVal = await page.locator('input[name="firstName"]').inputValue();
    expect(firstNameVal).toBe('');

    // Fill Student 2
    const student2Name = `Diya E2E ${uniqueStamp}`;
    await page.locator('input[name="firstName"]').fill(student2Name);
    await page.getByRole('button', { name: 'Save Student' }).click();

    await expect(page.getByText('Student Added Successfully')).toBeVisible({ timeout: 15000 });

    // Click "Done"
    await page.getByRole('button', { name: 'Done' }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Register New Student')).not.toBeVisible();
  });

  // ═════════════════════════════════════════════════════════════════════
  // 3. Super Admin: Platform Oversight & Governance Navigation
  // ═════════════════════════════════════════════════════════════════════
  test('Super Admin: Multi-school network, health, and governance navigation', async ({ page, context }) => {
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.superAdmin.email, SUPER_ADMIN_URL, context);

    await page.goto(`${SUPER_ADMIN_URL}/dashboard`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Verify Platform Command Center
    await expect(page.getByText('Global Operations')).toBeVisible();
    await expect(page.getByText('Active Tenants')).toBeVisible();

    // Navigate to School Network
    await page.goto(`${SUPER_ADMIN_URL}/dashboard/schools`, { timeout: 60000 });
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading', { name: 'School Network' })).toBeVisible();
    await expect(page.getByPlaceholder('Search tenants...')).toBeVisible();

    // Navigate to Data Governance
    await page.goto(`${SUPER_ADMIN_URL}/dashboard/governance`, { timeout: 60000 });
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading', { name: 'Enterprise Data Governance' })).toBeVisible();
  });

  // ═════════════════════════════════════════════════════════════════════
  // 4. Teacher Portal: Daily Schedule & Roll Call Matrix
  // ═════════════════════════════════════════════════════════════════════
  test('Teacher Portal: Teaching dashboard and daily attendance matrix', async ({ page, context }) => {
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.teacher.email, TEACHER_PORTAL_URL, context);

    await page.goto(`${TEACHER_PORTAL_URL}/portal`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Verify Teacher Dashboard
    await expect(page.getByText('SSVM Portal', { exact: true })).toBeVisible();
    await expect(page.getByText(/Mark Daily Attendance/i)).toBeVisible();

    // Navigate to Daily Attendance Matrix
    await page.goto(`${TEACHER_PORTAL_URL}/portal/attendance`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    await expect(page.getByText('Daily Roll Call & Attendance')).toBeVisible();
    await expect(page.getByText('Submit Roll Call')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark All Present' })).toBeVisible();

    // Mark all present and submit roll call
    await page.getByRole('button', { name: 'Mark All Present' }).click();
    await page.getByRole('button', { name: 'Submit Roll Call' }).click();
    await expect(page.getByText('Attendance Submitted Successfully')).toBeVisible({ timeout: 10000 });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 5. Student Portal: Academic Records & Weekly Schedule
  // ═════════════════════════════════════════════════════════════════════
  test('Student Portal: Academic dashboard, timetable, and notice board', async ({ page, context }) => {
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.student.email, STUDENT_PORTAL_URL, context);

    await page.goto(`${STUDENT_PORTAL_URL}/dashboard`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Verify Dashboard Cards
    await expect(page.getByRole('main').getByText('Attendance')).toBeVisible();
    await expect(page.getByText('Pending Assignments')).toBeVisible();

    // Verify Timetable Page
    await page.goto(`${STUDENT_PORTAL_URL}/timetable`, { timeout: 60000 });
    await page.waitForTimeout(2000);
    await expect(page.getByText('My Timetable')).toBeVisible();

    // Verify Notice Board Page
    await page.goto(`${STUDENT_PORTAL_URL}/notices`, { timeout: 60000 });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Notice Board')).toBeVisible();
  });

  // ═════════════════════════════════════════════════════════════════════
  // 6. Parent Portal: Multi-Child Switcher & Fee Ledger
  // ═════════════════════════════════════════════════════════════════════
  test('Parent Portal: Multi-child active selector and fee overview', async ({ page, context }) => {
    await context.clearCookies();
    await createAuthenticatedSession(E2E_USERS.parent.email, PARENT_PORTAL_URL, context);

    await page.goto(`${PARENT_PORTAL_URL}/dashboard`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Verify Active Child selector exists in header
    await expect(page.getByText(/Active Child|Parent Portal|Viewing Details For/i)).toBeVisible();

    // Navigate to Fees & Invoices
    await page.goto(`${PARENT_PORTAL_URL}/fees`, { timeout: 60000 });
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Fee|Invoice/i)).toBeVisible();
  });

  // ═════════════════════════════════════════════════════════════════════
  // 7. Payment Portal & SaaS Frontend
  // ═════════════════════════════════════════════════════════════════════
  test('Payment Portal checkout & SaaS landing registration modal', async ({ page, context }) => {
    // 7A: SaaS Frontend Landing & Onboarding Modal
    await page.goto(SAAS_FRONTEND_URL, { timeout: 60000 });
    await page.waitForTimeout(2000);

    await expect(page.getByText('Enterprise-Grade Education Platform')).toBeVisible();
    const requestAccessBtn = page.getByRole('button', { name: /Request Access/i });
    await expect(requestAccessBtn).toBeVisible();
    await requestAccessBtn.click();

    await expect(page.getByText('Join the elite network of institutions')).toBeVisible();
    await expect(page.getByText('Institution Name')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 7B: Payment Portal Checkout
    await page.goto(`${PAYMENT_PORTAL_URL}/checkout`, { timeout: 60000 });
    await page.waitForTimeout(2000);
    // Unauthenticated checkout redirects to login
    expect(page.url()).toContain('/login');
    await expect(page.getByRole('button', { name: /Verify & Continue/i })).toBeVisible();
  });
});
