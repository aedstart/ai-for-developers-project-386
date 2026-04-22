import { useState, useEffect } from 'react';
import { eventTypesApi, availableDaysApi, bookingsApi, EventType, AvailableDay, Slot } from '../api/api';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';

export default function UserPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [availableDays, setAvailableDays] = useState<AvailableDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [userName, setUserName] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load event types
  useEffect(() => {
    loadEventTypes();
  }, []);

  // Load available days when month changes
  useEffect(() => {
    loadAvailableDays();
  }, [currentMonth]);

  // Load all slots when event type changes (for day availability check)
  useEffect(() => {
    if (selectedEventType) {
      loadAllSlots();
    }
  }, [selectedEventType]);

  // Filter slots for selected date
  useEffect(() => {
    if (selectedEventType && selectedDate) {
      loadSlots();
    }
  }, [selectedEventType, selectedDate]);

  const loadEventTypes = async () => {
    try {
      const response = await eventTypesApi.getAll();
      setEventTypes(response.data);
      if (response.data.length > 0) {
        setSelectedEventType(response.data[0].id);
      }
    } catch (err) {
      setError('Ошибка загрузки типов событий');
    }
  };

  const loadAvailableDays = async () => {
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const response = await availableDaysApi.getAll(start, end);
      setAvailableDays(response.data);
    } catch (err) {
      setError('Ошибка загрузки доступных дней');
    }
  };

  const loadAllSlots = async () => {
    if (!selectedEventType) return;
    try {
      const response = await bookingsApi.getSlots(selectedEventType);
      setAllSlots(response.data);
    } catch (err) {
      // ignore — calendar will just rely on isAvailable flag
    }
  };

  const loadSlots = async () => {
    if (!selectedEventType) return;

    setLoading(true);
    try {
      const response = await bookingsApi.getSlots(selectedEventType);
      setAllSlots(response.data);
      // Filter slots only for selected date
      if (selectedDate) {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        const filteredSlots = response.data.filter(slot => slot.date === selectedDateStr);
        setSlots(filteredSlots);
      } else {
        setSlots(response.data);
      }
    } catch (err) {
      setError('Ошибка загрузки слотов');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return;
    
    const dayStr = format(date, 'yyyy-MM-dd');
    const day = availableDays.find(d => d.date.startsWith(dayStr));
    const hasFreeSlots = allSlots.some(s => s.date === dayStr && s.available);
    
    if (day?.isAvailable && hasFreeSlots) {
      setSelectedDate(date);
      setSelectedSlot(null);
      setShowBookingForm(false);
    }
  };

  const handleSlotClick = (slot: Slot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setShowBookingForm(true);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !userName.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      await bookingsApi.create({
        eventTypeId: selectedEventType,
        startTime: selectedSlot.startTime,
        userName: userName.trim(),
      });
      
      setSuccess('Бронирование успешно создано!');
      setShowBookingForm(false);
      setUserName('');
      setSelectedSlot(null);
      loadSlots();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Это время уже занято');
      } else {
        setError('Ошибка при создании бронирования');
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = startOfDay(new Date());

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="page">
      <h2 className="page-title">Бронирование встречи</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <div className="card-title">Выберите тип встречи</div>
        <div className="form-group">
          <select
            value={selectedEventType}
            onChange={(e) => {
              setSelectedEventType(e.target.value);
              setSelectedDate(null);
              setSlots([]);
            }}
          >
            {eventTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.duration} мин)
              </option>
            ))}
          </select>
        </div>
        
        {selectedEventType && (
          <div className="event-info">
            {eventTypes.find(t => t.id === selectedEventType)?.description}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <span>Выберите день</span>
          <div className="calendar-nav">
            <button className="btn btn-secondary calendar-nav-btn" onClick={handlePrevMonth}>
              ←
            </button>
            <span className="calendar-month">
              {format(currentMonth, 'MMMM yyyy', { locale: ru })}
            </span>
            <button className="btn btn-secondary calendar-nav-btn" onClick={handleNextMonth}>
              →
            </button>
          </div>
        </div>

        <div className="calendar">
          {weekDays.map(day => (
            <div key={day} className="calendar-header">{day}</div>
          ))}
          
          {days.map(date => {
            const dayStr = format(date, 'yyyy-MM-dd');
            const day = availableDays.find(d => d.date.startsWith(dayStr));
            const isPast = isBefore(date, today);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const hasFreeSlots = allSlots.some(s => s.date === dayStr && s.available);
            const isEffectivelyAvailable = day?.isAvailable && hasFreeSlots;

            return (
              <div
                key={date.toISOString()}
                className={`calendar-day ${
                  isSelected ? 'selected' : ''
                } ${
                  isPast ? 'past' : ''
                } ${
                  isEffectivelyAvailable ? 'available' : ''
                } ${
                  !isEffectivelyAvailable && !isPast ? 'unavailable' : ''
                }`}
                onClick={() => handleDateClick(date)}
              >
                <span>{format(date, 'd')}</span>
              </div>
            );
          })}
        </div>
        
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color legend-available"></div>
            <span>Доступно</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-unavailable"></div>
            <span>Недоступно</span>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="card">
          <div className="card-title">
            Доступные слоты на {format(selectedDate, 'dd.MM.yyyy')}
          </div>
          
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : slots.length === 0 ? (
            <div className="empty-state">Нет доступных слотов</div>
          ) : (
            <div className="slots-grid">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className={`slot ${
                    selectedSlot?.startTime === slot.startTime ? 'selected' : ''
                  } ${!slot.available ? 'unavailable' : ''}`}
                  onClick={() => handleSlotClick(slot)}
                >
                  <div className="slot-time">{slot.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showBookingForm && selectedSlot && (
        <div className="modal-overlay" onClick={() => setShowBookingForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Подтвердите бронирование</h3>
            </div>
            
            <div className="info-block">
              <p><strong>Дата:</strong> {selectedSlot.date.split('-').reverse().join('.')}</p>
              <p><strong>Время:</strong> {selectedSlot.time}</p>
              <p><strong>Длительность:</strong> {eventTypes.find(t => t.id === selectedEventType)?.duration} мин</p>
            </div>
            
            <form onSubmit={handleBooking}>
              <div className="form-group">
                <label>Ваше имя *</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Введите ваше имя"
                  required
                />
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBookingForm(false)}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !userName.trim()}
                >
                  {loading ? 'Создание...' : 'Забронировать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
