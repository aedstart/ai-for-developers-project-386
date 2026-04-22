import { Page, Locator, expect } from '@playwright/test';

export class UserPage {
  readonly page: Page;

  // Navigation
  readonly userTabBtn: Locator;

  // Event type selection
  readonly eventTypeSelect: Locator;

  // Calendar navigation
  readonly prevMonthBtn: Locator;
  readonly nextMonthBtn: Locator;
  readonly calendarMonth: Locator;

  // Booking form (modal)
  readonly bookingModal: Locator;
  readonly userNameInput: Locator;
  readonly submitBookingBtn: Locator;
  readonly cancelBookingBtn: Locator;

  // Messages
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.userTabBtn = page.getByRole('button', { name: 'Пользователь' });

    this.eventTypeSelect = page.locator('select').first();

    this.prevMonthBtn = page.locator('.calendar-nav .btn').first();
    this.nextMonthBtn = page.locator('.calendar-nav .btn').last();
    this.calendarMonth = page.locator('.calendar-month').first();

    this.bookingModal = page.locator('.modal');
    this.userNameInput = page.locator('.modal input[type="text"]');
    this.submitBookingBtn = page.locator('.modal button[type="submit"]');
    this.cancelBookingBtn = page.locator('.modal .btn-secondary');

    this.errorMessage = page.locator('.error');
    this.successMessage = page.locator('.success');
  }

  async goto() {
    await this.page.goto('/');
    await this.userTabBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectEventType(nameOrIndex: string | number) {
    if (typeof nameOrIndex === 'number') {
      await this.eventTypeSelect.selectOption({ index: nameOrIndex });
    } else {
      await this.eventTypeSelect.selectOption({ label: new RegExp(nameOrIndex) });
    }
  }

  async getAvailableDays(): Promise<Locator[]> {
    // Only future available days are clickable (past days are ignored by the app)
    await this.page.waitForSelector('.calendar-day.available:not(.past)', { timeout: 10000 });
    return this.page.locator('.calendar-day.available:not(.past)').all();
  }

  async clickFirstAvailableDay() {
    const days = await this.getAvailableDays();
    if (days.length === 0) {
      throw new Error('No future available days found in calendar');
    }
    await days[0].click();
  }

  async waitForSlotsPanel(): Promise<boolean> {
    // Wait until React finishes loading slots: loading div gone AND either
    // slots-grid or empty-state is present. Uses waitForFunction to avoid
    // matching stale DOM nodes from a previous render cycle.
    await this.page.waitForFunction(() => {
      const loading = document.querySelector('.loading');
      const grid = document.querySelector('.slots-grid');
      const emptyInCard = document.querySelector('.card .empty-state');
      return !loading && (grid !== null || emptyInCard !== null);
    }, undefined, { timeout: 12000 }).catch(() => null);

    // One extra tick for React state to settle
    await this.page.waitForTimeout(150);

    const availableCount = await this.page.locator('.slot:not(.unavailable)').count();
    return availableCount > 0;
  }

  async getAvailableSlots(): Promise<Locator[]> {
    await this.waitForSlotsPanel();
    return this.page.locator('.slot:not(.unavailable)').all();
  }

  async clickFirstAvailableSlot() {
    const hasSlots = await this.waitForSlotsPanel();
    if (!hasSlots) {
      throw new Error('No available slots found');
    }
    await this.page.locator('.slot:not(.unavailable)').first().click();
  }

  async fillBookingForm(userName: string) {
    await expect(this.bookingModal).toBeVisible();
    await this.userNameInput.fill(userName);
  }

  async submitBooking() {
    await this.submitBookingBtn.click();
  }

  async waitForSuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
  }

  async waitForError() {
    await expect(this.errorMessage).toBeVisible({ timeout: 10000 });
  }

  async isSlotSelected(slotLocator: Locator): Promise<boolean> {
    return slotLocator.evaluate(el => el.classList.contains('selected'));
  }
}
