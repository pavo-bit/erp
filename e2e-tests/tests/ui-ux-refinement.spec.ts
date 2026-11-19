import { test, expect, request as playwrightRequest, BrowserContext } from '@playwright/test';
import process from 'node:process';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ERP_ADMIN_URL = process.env.ERP_ADMIN_URL || 'http://localhost:3000';
const TEACHER_PORTAL_URL = process.env.TEACHER_PORTAL_URL || 'http://localhost:3002';
const PARENT_PORTAL_URL = process.env.PARENT_PORTAL_URL || 'http://localhost:3006';

interface CookieHeaderItem {
  name: string;
  value: string;
}

async function createAuthenticatedSession(email: string, portalUrl: string, browserContext?: BrowserContext) {
  const apiContext = await playwrightRequest.newContext();
  const loginRes = await apiContext.post(`${BACKEND_URL}/api/v1/auth/login`, {
    data: { email, password: 'Admin@123' },
  });
  expect(loginRes.status()).toBe(200);

  if (browserContext) {
    const headers = (loginRes.headersArray ? loginRes.headersArray() : []) as CookieHeaderItem[];
    const setCookies = headers.filter((h: CookieHeaderItem) => h.name.toLowerCase() === 'set-cookie');
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
  }

  return apiContext;
}

test.describe('School ERP UI/UX Refinement — Multi-Portal Workflows', () => {
  test.setTimeout(90000);

  // ═════════════════════════════════════════════════════════════════════
  // 1. ERP Admin Dashboard: Quick Actions Navigation
  // ═════════════════════════════════════════════════════════════════════
  test('Dashboard displays 4 institutional quick actions routing correctly', async ({ page, context }) => {
    await context.clearCookies();
    await createAuthenticatedSession('erpadmin@ssvm.edu', ERP_ADMIN_URL, context);

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
  // 2. Student Manual Entry Drawer: Add Another and Done Lifecycle
  // ═════════════════════════════════════════════════════════════════════
  test('Student Management drawer opens, validates, and supports Add Another / Done', async ({ page, context }) => {
    await context.clearCookies();
    await createAuthenticatedSession('erpadmin@ssvm.edu', ERP_ADMIN_URL, context);

    await page.goto(`${ERP_ADMIN_URL}/admin/students`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Click "Add Student" button to slide open the right-side drawer
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

    // Click "Save Student"
    await page.getByRole('button', { name: 'Save Student' }).click();

    // Verify Success Modal appears
    await expect(page.getByText('Student Added Successfully')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Add Another' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();

    // Click "Add Another" to register Student 2
    await page.getByRole('button', { name: 'Add Another' }).click();
    await page.waitForTimeout(500);

    // Form resets student-specific fields but preserves class defaults
    const firstNameVal = await page.locator('input[name="firstName"]').inputValue();
    expect(firstNameVal).toBe('');
    const classVal = await page.locator('input[name="className"]').inputValue();
    expect(classVal).toBe('10');

    // Fill Student 2
    const student2Name = `Diya E2E ${uniqueStamp}`;
    await page.locator('input[name="firstName"]').fill(student2Name);
    await page.getByRole('button', { name: 'Save Student' }).click();

    // Verify Success Modal appears again
    await expect(page.getByText('Student Added Successfully')).toBeVisible({ timeout: 15000 });

    // Click "Done"
    await page.getByRole('button', { name: 'Done' }).click();
    await page.waitForTimeout(1500);

    // Drawer is closed and student table is refreshed
    await expect(page.getByText('Register New Student')).not.toBeVisible();
  });

  // ═════════════════════════════════════════════════════════════════════
  // 3. Dedicated Staff Import & Teacher Drawer
  // ═════════════════════════════════════════════════════════════════════
  test('Staff import page provides official templates and routes to manual entry', async ({ page, context }) => {
    await context.clearCookies();
    await createAuthenticatedSession('erpadmin@ssvm.edu', ERP_ADMIN_URL, context);

    await page.goto(`${ERP_ADMIN_URL}/admin/teachers/import`, { timeout: 60000 });
    await page.waitForTimeout(2000);

    await expect(page.getByText('Bulk Staff & Faculty Import')).toBeVisible();
    await expect(page.getByText('Download .CSV')).toBeVisible();
    await expect(page.getByText('Download .XLSX')).toBeVisible();

    // Click manual alternative button
    await page.getByRole('link', { name: /Add Teacher Manually/i }).click();
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('/admin/teachers?action=create');
    // Drawer automatically opens via action=create parameter
    await expect(page.getByText('Add Faculty & Staff Member')).toBeVisible();
    await expect(page.getByText('Section 1 — Personal Details')).toBeVisible();
  });
});
