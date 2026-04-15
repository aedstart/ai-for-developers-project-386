import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface EventType {
  id: string;
  name: string;
  description: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableDay {
  id: string;
  date: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkingHours {
  id: string;
  startTime: string;
  endTime: string;
  updatedAt: string;
}

export interface Slot {
  date: string;
  time: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface Booking {
  id: string;
  eventTypeId: string;
  eventType: EventType;
  startTime: string;
  endTime: string;
  userName: string;
  status: 'active' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export const eventTypesApi = {
  getAll: () => api.get<EventType[]>('/event-types'),
  getById: (id: string) => api.get<EventType>(`/event-types/${id}`),
  create: (data: { name: string; description: string; duration: number }) =>
    api.post<EventType>('/event-types', data),
  update: (id: string, data: { name: string; description: string; duration: number }) =>
    api.put<EventType>(`/event-types/${id}`, data),
  delete: (id: string) => api.delete(`/event-types/${id}`),
};

export const availableDaysApi = {
  getAll: (startDate?: string, endDate?: string) =>
    api.get<AvailableDay[]>('/available-days', { params: { startDate, endDate } }),
  set: (data: { date: string; isAvailable: boolean }) =>
    api.post<AvailableDay>('/available-days', data),
  delete: (id: string) => api.delete(`/available-days/${id}`),
};

export const workingHoursApi = {
  get: () => api.get<WorkingHours>('/working-hours'),
  update: (data: { startTime: string; endTime: string }) =>
    api.put<WorkingHours>('/working-hours', data),
};

export const bookingsApi = {
  getSlots: (eventTypeId: string) =>
    api.get<Slot[]>('/bookings/slots', { params: { eventTypeId } }),
  getAll: (params?: { status?: string; upcoming?: boolean }) =>
    api.get<Booking[]>('/bookings', { params }),
  create: (data: { eventTypeId: string; startTime: string; userName: string }) =>
    api.post<Booking>('/bookings', data),
  update: (id: string, data: { userName?: string; status?: string }) =>
    api.put<Booking>(`/bookings/${id}`, data),
  cancel: (id: string) => api.delete(`/bookings/${id}`),
};

export default api;
