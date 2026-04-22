import { request } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

/**
 * Global teardown: cleans up all test data written to the database during e2e runs.
 *
 * Removes:
 *  - Bookings created by test users ('Иван Тестов', 'Конфликт Тест')
 *  - EventType rows whose name starts with 'E2E ' (created by owner.spec.ts)
 *  - AvailableDay rows for the next 30 days that were upserted by booking.spec.ts
 */
async function globalTeardown() {
  const ctx = await request.newContext({ baseURL: API_URL });

  // -------------------------------------------------------------------------
  // 1. Cancel test bookings
  // -------------------------------------------------------------------------
  const TEST_USER_NAMES = ['Иван Тестов', 'Конфликт Тест'];

  try {
    const bookingsResp = await ctx.get('/bookings');
    if (bookingsResp.ok()) {
      const bookings: Array<{ id: string; userName: string }> = await bookingsResp.json();
      for (const booking of bookings) {
        if (TEST_USER_NAMES.includes(booking.userName)) {
          await ctx.delete(`/bookings/${booking.id}`);
        }
      }
    }
  } catch (err) {
    console.warn('[teardown] Could not clean up test bookings:', err);
  }

  // -------------------------------------------------------------------------
  // 2. Delete test event types (names starting with 'E2E ')
  // -------------------------------------------------------------------------
  try {
    const eventTypesResp = await ctx.get('/event-types');
    if (eventTypesResp.ok()) {
      const eventTypes: Array<{ id: string; name: string }> = await eventTypesResp.json();
      for (const et of eventTypes) {
        if (et.name.startsWith('E2E ')) {
          await ctx.delete(`/event-types/${et.id}`);
        }
      }
    }
  } catch (err) {
    console.warn('[teardown] Could not clean up test event types:', err);
  }

  // -------------------------------------------------------------------------
  // 3. Remove AvailableDay records for the next 30 days (added by tests)
  // -------------------------------------------------------------------------
  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const daysResp = await ctx.get(
      `/available-days?startDate=${fmt(startDate)}&endDate=${fmt(endDate)}`
    );
    if (daysResp.ok()) {
      const days: Array<{ id: string; date: string }> = await daysResp.json();
      for (const day of days) {
        await ctx.delete(`/available-days/${day.id}`);
      }
    }
  } catch (err) {
    console.warn('[teardown] Could not clean up test available days:', err);
  }

  await ctx.dispose();
}

export default globalTeardown;
