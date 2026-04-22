import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Format a Date as UTC "wall clock" string: "YYYY-MM-DDTHH:MM:SS" (no timezone offset)
// We use UTC methods because we treat UTC timestamps as wall-clock time throughout the app.
function toWallClockDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() + '-' +
    pad(date.getUTCMonth() + 1) + '-' +
    pad(date.getUTCDate()) + 'T' +
    pad(date.getUTCHours()) + ':' +
    pad(date.getUTCMinutes()) + ':' +
    pad(date.getUTCSeconds())
  );
}

// Format a Date as UTC date string: "YYYY-MM-DD"
function toWallClockDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() + '-' +
    pad(date.getUTCMonth() + 1) + '-' +
    pad(date.getUTCDate())
  );
}

// Parse a "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS" string as UTC (treat the wall-clock time as UTC).
// This ensures 09:00 stays 09:00 regardless of server timezone.
function parseWallClockDateTime(str: string): Date {
  const normalized = str.includes('T') ? str.replace(/Z$/, '') + 'Z' : str + 'T00:00:00Z';
  return new Date(normalized);
}

// Get available slots for next 14 days
router.get('/slots', async (req, res) => {
  try {
    const { eventTypeId } = req.query;
    
    if (!eventTypeId) {
      return res.status(400).json({ error: 'Event type ID is required' });
    }

    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId as string },
    });

    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    const workingHours = await prisma.workingHours.findFirst();
    const startHour = workingHours?.startTime || '09:00';
    const endHour = workingHours?.endTime || '18:00';

    const [startH, startM] = startHour.split(':').map(Number);
    const [endH, endM] = endHour.split(':').map(Number);

    // Get available days for next 14 days (use UTC midnight — wall-clock = UTC convention)
    const nowUtcMs = Date.now();
    const todayUtc = new Date(nowUtcMs);
    // Zero out to UTC midnight
    const todayMidnightUTC = new Date(Date.UTC(
      todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()
    ));
    const today = todayMidnightUTC;

    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + 14);

    const availableDays = await prisma.availableDay.findMany({
      where: {
        date: {
          gte: today,
          lte: endDate,
        },
        isAvailable: true,
      },
    });

    // Get existing bookings for next 14 days
    const existingBookings = await prisma.booking.findMany({
      where: {
        status: 'active',
        startTime: {
          gte: today,
          lte: endDate,
        },
      },
    });

    // Generate available slots
    const slots: Array<{
      date: string;
      time: string;
      startTime: string;
      endTime: string;
      available: boolean;
    }> = [];

    for (const day of availableDays) {
      // day.date is a @db.Date — Prisma stores it as UTC midnight, use UTC methods to read it
      const dateStr = toWallClockDateString(day.date);
      const [yyyy, mm, dd] = dateStr.split('-').map(Number);

      // Build slot boundaries as UTC timestamps (wall-clock = UTC throughout the app)
      const dayStart = new Date(Date.UTC(yyyy, mm - 1, dd, startH, startM, 0));
      const dayEnd   = new Date(Date.UTC(yyyy, mm - 1, dd, endH,   endM,   0));

      let currentSlot = new Date(dayStart);

      while (currentSlot.getTime() + eventType.duration * 60000 <= dayEnd.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + eventType.duration * 60000);

        // Check if slot conflicts with existing booking
        // Bookings are stored as UTC timestamps (wall-clock = UTC)
        const hasConflict = existingBookings.some((booking: { startTime: Date; endTime: Date }) => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd   = new Date(booking.endTime);
          return (
            (currentSlot >= bookingStart && currentSlot < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (currentSlot <= bookingStart && slotEnd >= bookingEnd)
          );
        });

        // Check if slot is in the past — compare wall-clock: now as UTC wall-clock
        const nowUtc = new Date();
        const isInPast = currentSlot < nowUtc;

        const pad = (n: number) => String(n).padStart(2, '0');
        const timeStr = `${pad(currentSlot.getUTCHours())}:${pad(currentSlot.getUTCMinutes())}`;

        slots.push({
          date: dateStr,
          time: timeStr,
          startTime: toWallClockDateTimeString(currentSlot),
          endTime: toWallClockDateTimeString(slotEnd),
          available: !hasConflict && !isInPast,
        });

        currentSlot = slotEnd;
      }
    }

    res.json(slots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    
    let where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (upcoming === 'true') {
      where.startTime = {
        gte: new Date(),
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        eventType: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Create booking
router.post('/', async (req, res) => {
  try {
    const { eventTypeId, startTime, userName } = req.body;
    
    if (!eventTypeId || !startTime || !userName) {
      return res.status(400).json({ error: 'Event type ID, start time, and user name are required' });
    }

    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
    });

    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    // Parse as wall-clock UTC — "YYYY-MM-DDTHH:MM:SS" treated as UTC (no timezone shift)
    const startDateTime = parseWallClockDateTime(startTime);
    const endDateTime = new Date(startDateTime.getTime() + eventType.duration * 60000);

    // Check for conflicts
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        status: 'active',
        OR: [
          {
            startTime: {
              lte: startDateTime,
            },
            endTime: {
              gt: startDateTime,
            },
          },
          {
            startTime: {
              lt: endDateTime,
            },
            endTime: {
              gte: endDateTime,
            },
          },
          {
            startTime: {
              gte: startDateTime,
            },
            endTime: {
              lte: endDateTime,
            },
          },
        ],
      },
    });

    if (conflictingBooking) {
      return res.status(409).json({ error: 'Time slot is already booked' });
    }

    // Check if day is available — build UTC midnight of the wall-clock date
    const y = startDateTime.getUTCFullYear();
    const mo = startDateTime.getUTCMonth();
    const d = startDateTime.getUTCDate();
    const dayDate = new Date(Date.UTC(y, mo, d, 0, 0, 0));

    const availableDay = await prisma.availableDay.findUnique({
      where: { date: dayDate },
    });

    if (!availableDay || !availableDay.isAvailable) {
      return res.status(400).json({ error: 'This day is not available for booking' });
    }

    const booking = await prisma.booking.create({
      data: {
        eventTypeId,
        startTime: startDateTime,
        endTime: endDateTime,
        userName,
        status: 'active',
      },
      include: {
        eventType: true,
      },
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking
router.put('/:id', async (req, res) => {
  try {
    const { userName, status } = req.body;
    
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        userName,
        status,
      },
      include: {
        eventType: true,
      },
    });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Cancel booking
router.delete('/:id', async (req, res) => {
  try {
    await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;
