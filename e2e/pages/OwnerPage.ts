import { Page, Locator, expect } from '@playwright/test';

export class OwnerPage {
  readonly page: Page;

  // Navigation
  readonly ownerTabBtn: Locator;

  // Working hours
  readonly workingHoursCard: Locator;
  readonly configureWorkingHoursBtn: Locator;
  readonly workingHoursModal: Locator;
  readonly startTimeInput: Locator;
  readonly endTimeInput: Locator;
  readonly saveWorkingHoursBtn: Locator;

  // Event types
  readonly addEventTypeBtn: Locator;
  readonly eventTypeModal: Locator;
  readonly eventTypeNameInput: Locator;
  readonly eventTypeDescInput: Locator;
  readonly eventTypeDurationInput: Locator;
  readonly saveEventTypeBtn: Locator;

  // Available days calendar
  readonly prevMonthBtn: Locator;
  readonly nextMonthBtn: Locator;

  // Bookings list
  readonly bookingsList: Locator;
  readonly refreshBookingsBtn: Locator;

  // Messages
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.ownerTabBtn = page.getByRole('button', { name: 'Владелец' });

    this.workingHoursCard = page.locator('.card').filter({ hasText: 'Рабочие часы' }).first();
    this.configureWorkingHoursBtn = this.workingHoursCard.getByRole('button', { name: 'Настроить' });
    this.workingHoursModal = page.locator('.modal').filter({ hasText: 'Настройка рабочих часов' });
    this.startTimeInput = this.workingHoursModal.locator('input').first();
    this.endTimeInput = this.workingHoursModal.locator('input').last();
    this.saveWorkingHoursBtn = this.workingHoursModal.getByRole('button', { name: 'Сохранить' });

    this.addEventTypeBtn = page.locator('.card').filter({ hasText: 'Типы событий' }).getByRole('button', { name: 'Добавить' });
    this.eventTypeModal = page.locator('.modal').filter({ hasText: /Создать тип события|Редактировать тип события/ });
    this.eventTypeNameInput = this.eventTypeModal.locator('input[type="text"]');
    this.eventTypeDescInput = this.eventTypeModal.locator('textarea');
    this.eventTypeDurationInput = this.eventTypeModal.locator('input[type="number"]');
    this.saveEventTypeBtn = this.eventTypeModal.getByRole('button', { name: /Создать|Обновить/ });

    this.prevMonthBtn = page.locator('.card').filter({ hasText: 'Доступные дни' }).locator('.calendar-nav .btn').first();
    this.nextMonthBtn = page.locator('.card').filter({ hasText: 'Доступные дни' }).locator('.calendar-nav .btn').last();

    this.bookingsList = page.locator('.card').filter({ hasText: 'Предстоящие встречи' });
    this.refreshBookingsBtn = this.bookingsList.getByRole('button', { name: 'Обновить' });

    this.errorMessage = page.locator('.error');
    this.successMessage = page.locator('.success');
  }

  async goto() {
    await this.page.goto('/');
    await this.ownerTabBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async updateWorkingHours(startTime: string, endTime: string) {
    await this.configureWorkingHoursBtn.click();
    await expect(this.workingHoursModal).toBeVisible();

    await this.startTimeInput.fill(startTime);
    await this.endTimeInput.fill(endTime);
    await this.saveWorkingHoursBtn.click();
  }

  async createEventType(name: string, description: string, duration: number) {
    await this.addEventTypeBtn.click();
    await expect(this.eventTypeModal).toBeVisible();

    await this.eventTypeNameInput.fill(name);
    await this.eventTypeDescInput.fill(description);
    await this.eventTypeDurationInput.fill(String(duration));
    await this.saveEventTypeBtn.click();
  }

  async clickDayInAvailabilityCalendar(dayNumber: number) {
    const availabilityCard = this.page.locator('.card').filter({ hasText: 'Доступные дни' });
    const day = availabilityCard.locator('.calendar-day').filter({ hasText: String(dayNumber) }).first();
    await day.click();
  }

  async getEventTypeByName(name: string): Promise<Locator> {
    return this.page.locator('.list-item').filter({ hasText: name }).first();
  }

  async deleteEventType(name: string) {
    const item = await this.getEventTypeByName(name);
    this.page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await item.getByRole('button', { name: 'Удалить' }).click();
  }

  async editEventType(name: string, newName: string) {
    const item = await this.getEventTypeByName(name);
    await item.getByRole('button', { name: 'Редактировать' }).click();
    await expect(this.eventTypeModal).toBeVisible();

    await this.eventTypeNameInput.clear();
    await this.eventTypeNameInput.fill(newName);
    await this.saveEventTypeBtn.click();
  }

  async cancelBooking(userName: string) {
    const bookingItem = this.bookingsList.locator('.list-item').filter({ hasText: userName }).first();
    this.page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await bookingItem.getByRole('button', { name: 'Отменить' }).click();
  }

  async waitForSuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
  }
}
