import { test, expect, request } from '@playwright/test';
import { UserPage } from '../pages/UserPage';
import { format, addDays } from 'date-fns';

/**
 * Integration tests: Main booking scenario
 *
 * Prerequisites (app must be running):
 *   - Frontend: http://localhost:3000
 *   - Backend:  http://localhost:3001
 *   - DB seeded with default event types and working hours (09:00–18:00)
 *   - Seed includes "Встреча 15 минут" and "Встреча 30 минут" event types
 */

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFutureDate(offsetDays: number): string {
  return format(addDays(new Date(), offsetDays), 'yyyy-MM-dd');
}

/**
 * Ensures the given date is marked as available via the backend API (upsert).
 */
async function ensureDayAvailable(dateStr: string) {
  const ctx = await request.newContext({ baseURL: API_URL });
  const resp = await ctx.post('/available-days', {
    data: { date: dateStr, isAvailable: true },
  });
  await ctx.dispose();
  return resp.ok();
}

/**
 * Select the first seed event type that is NOT a test artifact.
 * Looks for options containing "Встреча" (the seeded names).
 * Falls back to index 0 if seed data is not present.
 */
async function selectDefaultEventType(userPage: UserPage) {
  const select = userPage.page.locator('select').first();
  const options = await select.locator('option').all();
  for (const opt of options) {
    const text = await opt.textContent();
    if (text && text.includes('Встреча') && !text.includes('E2E')) {
      const value = await opt.getAttribute('value');
      if (value) {
        await select.selectOption({ value });
        // Wait for potential slot re-fetch after event type change
        await userPage.page.waitForTimeout(300);
        return;
      }
    }
  }
  // Fallback: use first option
  await select.selectOption({ index: 0 });
  await userPage.page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Suite 1: UI structure – no slot interaction needed
// ---------------------------------------------------------------------------

test.describe('Booking page – UI structure', () => {
  test.beforeEach(async () => {
    // Ensure at least two consecutive future days are available
    await ensureDayAvailable(getFutureDate(1));
    await ensureDayAvailable(getFutureDate(2));
  });

  test('should display the booking page heading and event type selector', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();

    await expect(page.locator('h2', { hasText: 'Бронирование встречи' })).toBeVisible();
    // The select element itself should be visible and have options
    await expect(userPage.eventTypeSelect).toBeVisible();
    const count = await page.locator('select option').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show event type description when a type is selected', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await expect(page.locator('.event-info')).toBeVisible();
  });

  test('should highlight available days on calendar', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    const availableDays = await userPage.getAvailableDays();
    expect(availableDays.length).toBeGreaterThan(0);
  });

  test('should not show slots panel before a day is selected', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await expect(page.locator('.slots-grid')).not.toBeVisible();
  });

  test('should navigate to next month using calendar arrow', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    const initialMonth = await userPage.calendarMonth.textContent();
    await userPage.nextMonthBtn.click();
    const nextMonth = await userPage.calendarMonth.textContent();
    expect(nextMonth).not.toBe(initialMonth);
  });

  test('should navigate back to current month after going forward', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    const initialMonth = await userPage.calendarMonth.textContent();
    await userPage.nextMonthBtn.click();
    await userPage.prevMonthBtn.click();
    const currentMonth = await userPage.calendarMonth.textContent();
    expect(currentMonth).toBe(initialMonth);
  });

  test('should show time slots panel after clicking an available day', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await userPage.clickFirstAvailableDay();
    await expect(page.locator('.slots-grid, .card .empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('should reset slot view when switching event type', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await userPage.clickFirstAvailableDay();

    await expect(page.locator('.slots-grid, .card .empty-state')).toBeVisible({ timeout: 10000 });

    // Switch to a different event type — date resets so slots panel disappears
    const options = await page.locator('select option').all();
    if (options.length > 1) {
      await userPage.selectEventType(1);
      await expect(page.locator('.slots-grid')).not.toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Slot interaction – modal tests
// ---------------------------------------------------------------------------

test.describe('Booking flow – slot interaction', () => {
  test.beforeEach(async () => {
    // Ensure several future days are available
    for (let i = 1; i <= 7; i++) {
      await ensureDayAvailable(getFutureDate(i));
    }
  });

  test('should open booking modal after clicking an available slot', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await userPage.clickFirstAvailableDay();

    const hasSlots = await userPage.waitForSlotsPanel();
    test.skip(!hasSlots, 'No available slots on this day – skipping');

    await userPage.clickFirstAvailableSlot();
    await expect(userPage.bookingModal).toBeVisible();
    await expect(page.locator('.modal h3', { hasText: 'Подтвердите бронирование' })).toBeVisible();
  });

  test('should display booking details in the confirmation modal', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await userPage.clickFirstAvailableDay();

    const hasSlots = await userPage.waitForSlotsPanel();
    test.skip(!hasSlots, 'No available slots on this day – skipping');

    await userPage.clickFirstAvailableSlot();
    await expect(userPage.bookingModal.locator('p', { hasText: 'Дата:' })).toBeVisible();
    await expect(userPage.bookingModal.locator('p', { hasText: 'Время:' })).toBeVisible();
    await expect(userPage.bookingModal.locator('p', { hasText: 'Длительность:' })).toBeVisible();
  });

  test('should disable submit button when name input is empty', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await userPage.clickFirstAvailableDay();

    const hasSlots = await userPage.waitForSlotsPanel();
    test.skip(!hasSlots, 'No available slots on this day – skipping');

    await userPage.clickFirstAvailableSlot();
    await expect(userPage.bookingModal).toBeVisible();
    await expect(userPage.submitBookingBtn).toBeDisabled();
  });

  test('should close booking modal on cancel button', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await userPage.clickFirstAvailableDay();

    const hasSlots = await userPage.waitForSlotsPanel();
    test.skip(!hasSlots, 'No available slots on this day – skipping');

    await userPage.clickFirstAvailableSlot();
    await expect(userPage.bookingModal).toBeVisible();

    await userPage.cancelBookingBtn.click();
    await expect(userPage.bookingModal).not.toBeVisible();
  });

  test('should close booking modal when clicking overlay', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await userPage.clickFirstAvailableDay();

    const hasSlots = await userPage.waitForSlotsPanel();
    test.skip(!hasSlots, 'No available slots on this day – skipping');

    await userPage.clickFirstAvailableSlot();
    await expect(userPage.bookingModal).toBeVisible();

    await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } });
    await expect(userPage.bookingModal).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Full booking flow (end-to-end)
// ---------------------------------------------------------------------------

test.describe('Full booking flow', () => {
  test.beforeEach(async () => {
    for (let i = 1; i <= 7; i++) {
      await ensureDayAvailable(getFutureDate(i));
    }
  });

  test('complete booking: select event type → day → slot → fill name → confirm', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await userPage.clickFirstAvailableDay();

    const hasSlots = await userPage.waitForSlotsPanel();
    test.skip(!hasSlots, 'No available slots – skipping full flow test');

    await userPage.clickFirstAvailableSlot();
    await userPage.fillBookingForm('Иван Тестов');
    await userPage.submitBooking();

    await userPage.waitForSuccess();
    await expect(userPage.successMessage).toContainText('Бронирование успешно создано');
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Conflict detection
// ---------------------------------------------------------------------------

test.describe('Booking conflict detection', () => {
  test.beforeEach(async () => {
    for (let i = 1; i <= 7; i++) {
      await ensureDayAvailable(getFutureDate(i));
    }
  });

  test('booked slot should become unavailable in the UI', async ({ page }) => {
    const userPage = new UserPage(page);
    await userPage.goto();
    await selectDefaultEventType(userPage);
    await userPage.clickFirstAvailableDay();

    const hasSlots = await userPage.waitForSlotsPanel();
    test.skip(!hasSlots, 'No available slots – skipping conflict test');

    await userPage.clickFirstAvailableSlot();
    await userPage.fillBookingForm('Конфликт Тест');
    await userPage.submitBooking();
    await userPage.waitForSuccess();

    // After booking, app reloads slots; the booked slot must be marked unavailable
    await expect(page.locator('.slot.unavailable').first()).toBeVisible({ timeout: 10000 });
  });
});
