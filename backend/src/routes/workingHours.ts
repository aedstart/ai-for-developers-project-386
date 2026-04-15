import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get working hours
router.get('/', async (req, res) => {
  try {
    const workingHours = await prisma.workingHours.findFirst();
    res.json(workingHours || { startTime: '09:00', endTime: '18:00' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch working hours' });
  }
});

// Update working hours
router.put('/', async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Start and end time are required' });
    }

    const existing = await prisma.workingHours.findFirst();
    
    let workingHours;
    if (existing) {
      workingHours = await prisma.workingHours.update({
        where: { id: existing.id },
        data: { startTime, endTime },
      });
    } else {
      workingHours = await prisma.workingHours.create({
        data: { startTime, endTime },
      });
    }
    
    res.json(workingHours);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update working hours' });
  }
});

export default router;
