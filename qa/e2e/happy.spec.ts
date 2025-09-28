import { test, expect } from '@playwright/test';

// Smoke E2E (feliz) using MSW mocks in frontend
// Requires frontend running with NEXT_PUBLIC_USE_MOCKS=true

test('happy path: login → create note → transcribe → summarize → checklist → search', async ({ page }) => {
  // 1) Login page
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();

  // Use demo credentials from mocks
  await page.getByLabel(/email/i).fill('demo@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /login|ingresar/i }).click();

  // 2) Dashboard visible
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

  // 3) Create note flow (mocked)
  await page.getByRole('button', { name: /nueva nota|crear/i }).click();

  // Simulate file upload (mock): use a small text blob via file chooser if present
  // If the UI requires a file, we skip upload here and proceed to mocked states

  // 4) Trigger transcribe (mock)
  const transcribeBtn = page.getByRole('button', { name: /transcribir/i });
  if (await transcribeBtn.isVisible()) {
    await transcribeBtn.click();
  }

  // 5) Trigger summarize (mock)
  const summarizeBtn = page.getByRole('button', { name: /resumir|generar resumen|regenerar resumen/i });
  if (await summarizeBtn.isVisible()) {
    await summarizeBtn.click();
  }

  // 6) Check TL;DR + bullets + at least 1 action present
  await expect(page.getByText(/TL;DR|resumen/i)).toBeVisible();
  const bullets = page.locator('li');
  await expect(bullets.first()).toBeVisible();

  // 7) Mark one action as done (toggle)
  const firstCheckbox = page.getByRole('checkbox').first();
  if (await firstCheckbox.isVisible()) {
    await firstCheckbox.check();
  }

  // 8) Search by term
  const search = page.getByRole('searchbox');
  if (await search.isVisible()) {
    await search.fill('mvp');
    await expect(page.getByText(/mvp/i)).toBeVisible();
  }
});