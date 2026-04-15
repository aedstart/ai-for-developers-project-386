import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get all event types
router.get('/', async (req, res) => {
  try {
    const eventTypes = await prisma.eventType.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(eventTypes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

// Get single event type
router.get('/:id', async (req, res) => {
  try {
    const eventType = await prisma.eventType.findUnique({
      where: { id: req.params.id },
    });
    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }
    res.json(eventType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event type' });
  }
});

// Create event type
router.post('/', async (req, res) => {
  try {
    const { name, description, duration } = req.body;
    
    if (!name || !duration) {
      return res.status(400).json({ error: 'Name and duration are required' });
    }

    const eventType = await prisma.eventType.create({
      data: {
        name,
        description: description || '',
        duration: parseInt(duration),
      },
    });
    res.status(201).json(eventType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event type' });
  }
});

// Update event type
router.put('/:id', async (req, res) => {
  try {
    const { name, description, duration } = req.body;
    
    const eventType = await prisma.eventType.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        duration: duration ? parseInt(duration) : undefined,
      },
    });
    res.json(eventType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event type' });
  }
});

// Delete event type
router.delete('/:id', async (req, res) => {
  try {
    await prisma.eventType.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Event type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event type' });
  }
});

export default router;
