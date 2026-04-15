import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import eventTypeRoutes from './routes/eventTypes';
import availableDayRoutes from './routes/availableDays';
import bookingRoutes from './routes/bookings';
import workingHoursRoutes from './routes/workingHours';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/event-types', eventTypeRoutes);
app.use('/api/available-days', availableDayRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/working-hours', workingHoursRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
