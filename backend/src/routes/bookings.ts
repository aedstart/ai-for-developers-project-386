import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

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

    // Get available days for next 14 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

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
      const dayStart = new Date(day.date);
      dayStart.setHours(startH, startM, 0, 0);

      const dayEnd = new Date(day.date);
      dayEnd.setHours(endH, endM, 0, 0);

      let currentSlot = new Date(dayStart);

      while (currentSlot.getTime() + eventType.duration * 60000 <= dayEnd.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + eventType.duration * 60000);
        
        // Check if slot conflicts with existing booking
        const hasConflict = existingBookings.some(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          return (
            (currentSlot >= bookingStart && currentSlot < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (currentSlot <= bookingStart && slotEnd >= bookingEnd)
          );
        });

        // Check if slot is in the past
        const now = new Date();
        const isInPast = currentSlot < now;

        slots.push({
          date: day.date.toISOString().split('T')[0],
          time: currentSlot.toTimeString().slice(0, 5),
          startTime: currentSlot.toISOString(),
          endTime: slotEnd.toISOString(),
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

    const startDateTime = new Date(startTime);
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

    // Check if day is available
    const dayDate = new Date(startDateTime);
    dayDate.setHours(0, 0, 0, 0);

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
