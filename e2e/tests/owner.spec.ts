import { test, expect } from '@playwright/test';
import { OwnerPage } from '../pages/OwnerPage';

/**
 * Integration tests: Owner panel
 *
 * Covers:
 *  - Working hours: view and update
 *  - Event types: create, edit, delete
 *  - Available days: toggle via calendar
 *  - Bookings list: view and cancel
 */

test.describe('Owner panel – Working hours', () => {
  let ownerPage: OwnerPage;

  test.beforeEach(async ({ page }) => {
    ownerPage = new OwnerPage(page);
    await ownerPage.goto();
  });

  test('should display the owner panel with working hours', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Панель владельца' })).toBeVisible();
    await expect(ownerPage.workingHoursCard).toBeVisible();
    await expect(ownerPage.workingHoursCard.locator('p', { hasText: 'Начало:' })).toBeVisible();
    await expect(ownerPage.workingHoursCard.locator('p', { hasText: 'Окончание:' })).toBeVisible();
  });

  test('should open the working hours configuration modal', async ({ page }) => {
    await ownerPage.configureWorkingHoursBtn.click();
    await expect(ownerPage.workingHoursModal).toBeVisible();
    await expect(page.locator('.modal h3', { hasText: 'Настройка рабочих часов' })).toBeVisible();
  });

  test('should close working hours modal on cancel', async ({ page }) => {
    await ownerPage.configureWorkingHoursBtn.click();
    await expect(ownerPage.workingHoursModal).toBeVisible();

    await ownerPage.workingHoursModal.getByRole('button', { name: 'Отмена' }).click();
    await expect(ownerPage.workingHoursModal).not.toBeVisible();
  });

  test('should update working hours and show success message', async ({ page }) => {
    await ownerPage.updateWorkingHours('10:00', '17:00');

    await ownerPage.waitForSuccess();
    await expect(ownerPage.successMessage).toContainText('Рабочие часы обновлены');

    // Displayed values should reflect the update
    await expect(ownerPage.workingHoursCard).toContainText('10:00');
    await expect(ownerPage.workingHoursCard).toContainText('17:00');

    // Restore defaults to keep tests idempotent
    await ownerPage.updateWorkingHours('09:00', '18:00');
    await ownerPage.waitForSuccess();
  });
});

test.describe('Owner panel – Event types', () => {
  let ownerPage: OwnerPage;
  const TEST_EVENT_NAME = `E2E Тест ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    ownerPage = new OwnerPage(page);
    await ownerPage.goto();
  });

  test('should display existing event types', async ({ page }) => {
    const list = page.locator('.card').filter({ hasText: 'Типы событий' }).locator('.list-item');
    // Seed provides at least two event types
    await expect(list.first()).toBeVisible();
  });

  test('should open "create event type" modal', async ({ page }) => {
    await ownerPage.addEventTypeBtn.click();
    await expect(ownerPage.eventTypeModal).toBeVisible();
    await expect(page.locator('.modal h3', { hasText: 'Создать тип события' })).toBeVisible();
  });

  test('should close event type modal on cancel', async ({ page }) => {
    await ownerPage.addEventTypeBtn.click();
    await expect(ownerPage.eventTypeModal).toBeVisible();

    await ownerPage.eventTypeModal.getByRole('button', { name: 'Отмена' }).click();
    await expect(ownerPage.eventTypeModal).not.toBeVisible();
  });

  test('should keep Create button disabled when name is empty', async ({ page }) => {
    await ownerPage.addEventTypeBtn.click();
    await expect(ownerPage.eventTypeModal).toBeVisible();

    // Clear the name field (it is empty by default, but let's be explicit)
    await ownerPage.eventTypeNameInput.fill('');
    await expect(ownerPage.saveEventTypeBtn).toBeDisabled();
  });

  test('should create a new event type and show it in the list', async ({ page }) => {
    await ownerPage.createEventType(TEST_EVENT_NAME, 'Описание тестового типа', 45);

    await ownerPage.waitForSuccess();
    await expect(ownerPage.successMessage).toContainText('Тип события создан');

    const newItem = await ownerPage.getEventTypeByName(TEST_EVENT_NAME);
    await expect(newItem).toBeVisible();
    await expect(newItem).toContainText('45');
  });

  test('should edit an existing event type', async ({ page }) => {
    // First create a type to edit
    await ownerPage.createEventType(TEST_EVENT_NAME, 'Описание', 20);
    await ownerPage.waitForSuccess();

    const updatedName = `${TEST_EVENT_NAME} (обновлено)`;
    await ownerPage.editEventType(TEST_EVENT_NAME, updatedName);

    await ownerPage.waitForSuccess();
    await expect(ownerPage.successMessage).toContainText('Тип события обновлен');

    const updatedItem = await ownerPage.getEventTypeByName(updatedName);
    await expect(updatedItem).toBeVisible();
  });

  test('should delete an event type', async ({ page }) => {
    const deleteName = `E2E Delete ${Date.now()}`;
    await ownerPage.createEventType(deleteName, 'Временный', 10);
    await ownerPage.waitForSuccess();

    await ownerPage.deleteEventType(deleteName);
    await ownerPage.waitForSuccess();
    await expect(ownerPage.successMessage).toContainText('Тип события удален');

    // Item must be gone from the list
    const deletedItem = page.locator('.list-item').filter({ hasText: deleteName });
    await expect(deletedItem).not.toBeVisible();
  });
});

test.describe('Owner panel – Available days calendar', () => {
  let ownerPage: OwnerPage;

  test.beforeEach(async ({ page }) => {
    ownerPage = new OwnerPage(page);
    await ownerPage.goto();
  });

  test('should display availability calendar', async ({ page }) => {
    const availabilityCard = page.locator('.card').filter({ hasText: 'Доступные дни' });
    await expect(availabilityCard).toBeVisible();
    await expect(availabilityCard.locator('.calendar')).toBeVisible();
  });

  test('should navigate availability calendar to next month', async ({ page }) => {
    const calendarMonth = page.locator('.card')
      .filter({ hasText: 'Доступные дни' })
      .locator('.calendar-month');

    const before = await calendarMonth.textContent();
    await ownerPage.nextMonthBtn.click();
    const after = await calendarMonth.textContent();

    expect(after).not.toBe(before);
  });

  test('should toggle day availability and show success message', async ({ page }) => {
    // Click on day 15 of the current month (always exists in any month)
    await ownerPage.clickDayInAvailabilityCalendar(15);
    await ownerPage.waitForSuccess();

    const msg = await ownerPage.successMessage.textContent();
    expect(
      msg?.includes('отмечен как доступный') || msg?.includes('отмечен как недоступный')
    ).toBe(true);

    // Toggle back to leave data consistent
    await ownerPage.clickDayInAvailabilityCalendar(15);
    await ownerPage.waitForSuccess();
  });

  test('should show calendar day classes (available / unavailable)', async ({ page }) => {
    const availabilityCard = page.locator('.card').filter({ hasText: 'Доступные дни' });
    const allDays = availabilityCard.locator('.calendar-day');
    await expect(allDays.first()).toBeVisible();

    // At least one day must have a class 'available' or 'unavailable'
    const availableCount = await availabilityCard.locator('.calendar-day.available').count();
    const unavailableCount = await availabilityCard.locator('.calendar-day.unavailable').count();
    expect(availableCount + unavailableCount).toBeGreaterThan(0);
  });
});

test.describe('Owner panel – Bookings management', () => {
  let ownerPage: OwnerPage;

  test.beforeEach(async ({ page }) => {
    ownerPage = new OwnerPage(page);
    await ownerPage.goto();
  });

  test('should display upcoming bookings section', async ({ page }) => {
    await expect(ownerPage.bookingsList).toBeVisible();
    await expect(ownerPage.refreshBookingsBtn).toBeVisible();
  });

  test('should show empty state when there are no upcoming bookings', async ({ page }) => {
    const isEmpty = await ownerPage.bookingsList.locator('.empty-state').isVisible();
    // Acceptable state – either empty state OR at least one booking
    const hasBookings = await ownerPage.bookingsList.locator('.list-item').count();
    expect(isEmpty || hasBookings > 0).toBe(true);
  });

  test('should refresh bookings list on button click', async ({ page }) => {
    await ownerPage.refreshBookingsBtn.click();
    // After refresh the section must still be visible and stable
    await expect(ownerPage.bookingsList).toBeVisible();
  });
});
