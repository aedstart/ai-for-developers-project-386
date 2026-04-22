import { useState, useEffect } from 'react';
import {
  eventTypesApi,
  availableDaysApi,
  workingHoursApi,
  bookingsApi,
  EventType,
  AvailableDay,
  WorkingHours,
  Booking,
} from '../api/api';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Format a wall-clock datetime string from the API ("YYYY-MM-DDTHH:MM:SS" or with Z suffix)
 * as a display string without any timezone conversion.
 * The API stores times as wall-clock UTC, so we read UTC parts directly.
 */
function formatWallClock(isoStr: string, fmt: 'datetime' | 'time' | 'date'): string {
  // Strip Z so we can parse as UTC explicitly
  const normalized = isoStr.replace('Z', '') + 'Z';
  const d = new Date(normalized);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getUTCDate());
  const month = pad(d.getUTCMonth() + 1);
  const year = d.getUTCFullYear();
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());

  if (fmt === 'datetime') return `${day}.${month}.${year} ${hours}:${minutes}`;
  if (fmt === 'time') return `${hours}:${minutes}`;
  return `${day}.${month}.${year}`;
}

export default function OwnerPage() {
  // State
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [availableDays, setAvailableDays] = useState<AvailableDay[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // Form states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventTypeForm, setShowEventTypeForm] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [showWorkingHoursForm, setShowWorkingHoursForm] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  
  // Form data
  const [eventTypeForm, setEventTypeForm] = useState({
    name: '',
    description: '',
    duration: 30,
  });
  const [workingHoursForm, setWorkingHoursForm] = useState({
    startTime: '09:00',
    endTime: '18:00',
  });
  const [editBookingForm, setEditBookingForm] = useState({
    userName: '',
    status: 'active',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAvailableDays();
  }, [currentMonth]);

  const loadData = async () => {
    await Promise.all([
      loadEventTypes(),
      loadWorkingHours(),
      loadBookings(),
    ]);
  };

  const loadEventTypes = async () => {
    try {
      const response = await eventTypesApi.getAll();
      setEventTypes(response.data);
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

  const loadWorkingHours = async () => {
    try {
      const response = await workingHoursApi.get();
      setWorkingHours(response.data);
      setWorkingHoursForm({
        startTime: response.data.startTime,
        endTime: response.data.endTime,
      });
    } catch (err) {
      setError('Ошибка загрузки рабочих часов');
    }
  };

  const loadBookings = async () => {
    try {
      const response = await bookingsApi.getAll({ status: 'active', upcoming: true });
      setBookings(response.data);
    } catch (err) {
      setError('Ошибка загрузки бронирований');
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingDay = availableDays.find(d => d.date.startsWith(dateStr));
    const isAvailable = !existingDay?.isAvailable;

    try {
      await availableDaysApi.set({
        date: dateStr,
        isAvailable,
      });
      
      setSuccess(isAvailable ? 'День отмечен как доступный' : 'День отмечен как недоступный');
      loadAvailableDays();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Ошибка при установке доступности дня');
    }
  };

  const handleCreateEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await eventTypesApi.create(eventTypeForm);
      setSuccess('Тип события создан');
      setShowEventTypeForm(false);
      setEventTypeForm({ name: '', description: '', duration: 30 });
      loadEventTypes();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Ошибка при создании типа события');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEventType) return;
    
    setLoading(true);
    
    try {
      await eventTypesApi.update(editingEventType.id, eventTypeForm);
      setSuccess('Тип события обновлен');
      setShowEventTypeForm(false);
      setEditingEventType(null);
      setEventTypeForm({ name: '', description: '', duration: 30 });
      loadEventTypes();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Ошибка при обновлении типа события');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEventType = async (id: string) => {
    if (!confirm('Удалить этот тип события?')) return;
    
    try {
      await eventTypesApi.delete(id);
      setSuccess('Тип события удален');
      loadEventTypes();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Ошибка при удалении типа события');
    }
  };

  const handleSaveWorkingHours = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await workingHoursApi.update(workingHoursForm);
      setSuccess('Рабочие часы обновлены');
      setShowWorkingHoursForm(false);
      loadWorkingHours();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Ошибка при обновлении рабочих часов');
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Отменить это бронирование?')) return;
    
    try {
      await bookingsApi.cancel(id);
      setSuccess('Бронирование отменено');
      loadBookings();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Ошибка при отмене бронирования');
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setEditBookingForm({
      userName: booking.userName,
      status: booking.status,
    });
    setShowEditBookingModal(true);
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    
    setLoading(true);
    
    try {
      await bookingsApi.update(editingBooking.id, editBookingForm);
      setSuccess('Бронирование обновлено');
      setShowEditBookingModal(false);
      setEditingBooking(null);
      loadBookings();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Ошибка при обновлении бронирования');
    } finally {
      setLoading(false);
    }
  };

  const openEditEventType = (eventType: EventType) => {
    setEditingEventType(eventType);
    setEventTypeForm({
      name: eventType.name,
      description: eventType.description,
      duration: eventType.duration,
    });
    setShowEventTypeForm(true);
  };

  const openCreateEventType = () => {
    setEditingEventType(null);
    setEventTypeForm({ name: '', description: '', duration: 30 });
    setShowEventTypeForm(true);
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="page">
      <h2 className="page-title">Панель владельца</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Working Hours Section */}
      <div className="card">
        <div className="card-title">
          <span>Рабочие часы</span>
          <button className="btn btn-primary" onClick={() => setShowWorkingHoursForm(true)}>
            Настроить
          </button>
        </div>
        <div className="info-block">
          <p><strong>Начало:</strong> {workingHours?.startTime || '09:00'}</p>
          <p><strong>Окончание:</strong> {workingHours?.endTime || '18:00'}</p>
        </div>
      </div>

      {/* Event Types Section */}
      <div className="card">
        <div className="card-title">
          <span>Типы событий</span>
          <button className="btn btn-primary" onClick={openCreateEventType}>
            Добавить
          </button>
        </div>
        
        <ul className="list">
          {eventTypes.map(type => (
            <li key={type.id} className="list-item">
              <div className="list-item-info">
                <h4>{type.name}</h4>
                <p>{type.description} (Длительность: {type.duration} мин)</p>
              </div>
              <div className="list-item-actions">
                <button className="btn btn-secondary" onClick={() => openEditEventType(type)}>
                  Редактировать
                </button>
                <button className="btn btn-danger" onClick={() => handleDeleteEventType(type.id)}>
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Available Days Calendar */}
      <div className="card">
        <div className="card-title">
          <span>Доступные дни</span>
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
        
        <p className="form-hint">
          Нажмите на день, чтобы отметить его как доступный/недоступный
        </p>

        <div className="calendar">
          {weekDays.map(day => (
            <div key={day} className="calendar-header">{day}</div>
          ))}
          
          {days.map(date => {
            const dayStr = format(date, 'yyyy-MM-dd');
            const day = availableDays.find(d => d.date.startsWith(dayStr));
            const isAvailable = day?.isAvailable;

            return (
              <div
                key={date.toISOString()}
                className={`calendar-day ${
                  isAvailable ? 'available' : 'unavailable'
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
            <span>Доступен</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-unavailable"></div>
            <span>Недоступен</span>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="card">
        <div className="card-title">
          <span>Предстоящие встречи</span>
          <button className="btn btn-secondary" onClick={loadBookings}>
            Обновить
          </button>
        </div>
        
        <ul className="list">
          {bookings.length === 0 ? (
            <li className="list-item empty-state">Нет предстоящих встреч</li>
          ) : (
            bookings.map(booking => (
              <li key={booking.id} className="list-item">
                <div className="list-item-info">
                  <h4>{booking.eventType.name}</h4>
                  <p>
                    {formatWallClock(booking.startTime, 'datetime')} - 
                    {formatWallClock(booking.endTime, 'time')} | 
                    Клиент: {booking.userName} |
                    Статус: <span className={`status-badge ${booking.status === 'active' ? 'status-active' : 'status-cancelled'}`}>
                      {booking.status === 'active' ? 'Активно' : 'Отменено'}
                    </span>
                  </p>
                </div>
                <div className="list-item-actions">
                  <button className="btn btn-secondary" onClick={() => handleEditBooking(booking)}>
                    Редактировать
                  </button>
                  {booking.status === 'active' && (
                    <button className="btn btn-danger" onClick={() => handleCancelBooking(booking.id)}>
                      Отменить
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Event Type Modal */}
      {showEventTypeForm && (
        <div className="modal-overlay" onClick={() => setShowEventTypeForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEventType ? 'Редактировать тип события' : 'Создать тип события'}</h3>
            </div>
            
            <form onSubmit={editingEventType ? handleUpdateEventType : handleCreateEventType}>
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={eventTypeForm.name}
                  onChange={(e) => setEventTypeForm({ ...eventTypeForm, name: e.target.value })}
                  placeholder="Например: Встреча 30 минут"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={eventTypeForm.description}
                  onChange={(e) => setEventTypeForm({ ...eventTypeForm, description: e.target.value })}
                  placeholder="Описание события"
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label>Длительность (минуты) *</label>
                <input
                  type="number"
                  value={eventTypeForm.duration}
                  onChange={(e) => setEventTypeForm({ ...eventTypeForm, duration: parseInt(e.target.value) || 0 })}
                  min={5}
                  max={480}
                  required
                />
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEventTypeForm(false);
                    setEditingEventType(null);
                    setEventTypeForm({ name: '', description: '', duration: 30 });
                  }}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !eventTypeForm.name.trim()}
                >
                  {loading ? 'Сохранение...' : (editingEventType ? 'Обновить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Working Hours Modal */}
      {showWorkingHoursForm && (
        <div className="modal-overlay" onClick={() => setShowWorkingHoursForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Настройка рабочих часов</h3>
            </div>
            
            <form onSubmit={handleSaveWorkingHours}>
              <div className="form-group">
                <label>Начало (HH:mm)</label>
                <input
                  type="text"
                  value={workingHoursForm.startTime}
                  onChange={(e) => setWorkingHoursForm({ ...workingHoursForm, startTime: e.target.value })}
                  placeholder="09:00"
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Окончание (HH:mm)</label>
                <input
                  type="text"
                  value={workingHoursForm.endTime}
                  onChange={(e) => setWorkingHoursForm({ ...workingHoursForm, endTime: e.target.value })}
                  placeholder="18:00"
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  required
                />
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowWorkingHoursForm(false)}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditBookingModal && editingBooking && (
        <div className="modal-overlay" onClick={() => setShowEditBookingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Редактировать бронирование</h3>
            </div>
            
            <div className="info-block">
              <p><strong>Дата:</strong> {formatWallClock(editingBooking.startTime, 'datetime')}</p>
              <p><strong>Тип:</strong> {editingBooking.eventType.name}</p>
            </div>
            
            <form onSubmit={handleUpdateBooking}>
              <div className="form-group">
                <label>Имя клиента</label>
                <input
                  type="text"
                  value={editBookingForm.userName}
                  onChange={(e) => setEditBookingForm({ ...editBookingForm, userName: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Статус</label>
                <select
                  value={editBookingForm.status}
                  onChange={(e) => setEditBookingForm({ ...editBookingForm, status: e.target.value })}
                >
                  <option value="active">Активно</option>
                  <option value="cancelled">Отменено</option>
                </select>
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditBookingModal(false);
                    setEditingBooking(null);
                  }}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
