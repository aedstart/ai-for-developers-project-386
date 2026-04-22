import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Parse "YYYY-MM-DD" as UTC midnight (wall-clock = UTC convention)
function parseDateUTC(str: string): Date {
  return new Date(str + 'T00:00:00Z');
}

// Get all available days
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let where = {};
    if (startDate && endDate) {
      where = {
        date: {
          gte: parseDateUTC(startDate as string),
          lte: parseDateUTC(endDate as string),
        },
      };
    }

    const availableDays = await prisma.availableDay.findMany({
      where,
      orderBy: { date: 'asc' },
    });
    res.json(availableDays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available days' });
  }
});

// Toggle day availability
router.post('/', async (req, res) => {
  try {
    const { date, isAvailable } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Parse as UTC midnight (wall-clock = UTC convention, no local TZ shift)
    const dateObj = parseDateUTC(date);

    // Upsert available day
    const availableDay = await prisma.availableDay.upsert({
      where: { date: dateObj },
      update: { isAvailable: isAvailable ?? true },
      create: {
        date: dateObj,
        isAvailable: isAvailable ?? true,
      },
    });
    
    res.status(201).json(availableDay);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set available day' });
  }
});

// Delete available day
router.delete('/:id', async (req, res) => {
  try {
    await prisma.availableDay.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Available day removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete available day' });
  }
});

export default router;
