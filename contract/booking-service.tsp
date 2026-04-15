import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;

@service({
  title: "Booking Service API",
  version: "1.0.0",
})
@server("http://localhost:3001/api", "Local development server")
namespace BookingService;

// Common models
model EventType {
  id: string;
  name: string;
  description: string;
  duration: int32;
  createdAt: string;
  updatedAt: string;
}

model AvailableDay {
  id: string;
  date: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

model WorkingHours {
  id: string;
  startTime: string;
  endTime: string;
  updatedAt: string;
}

model Booking {
  id: string;
  eventTypeId: string;
  eventType: EventType;
  startTime: string;
  endTime: string;
  userName: string;
  status: "active" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

model Slot {
  date: string;
  time: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

// Request/Response models
model CreateEventTypeRequest {
  name: string;
  description: string;
  duration: int32;
}

model CreateBookingRequest {
  eventTypeId: string;
  startTime: string;
  userName: string;
}

model UpdateBookingRequest {
  userName?: string;
  status?: "active" | "cancelled";
}

model SetAvailableDayRequest {
  date: string;
  isAvailable: boolean;
}

model UpdateWorkingHoursRequest {
  startTime: string;
  endTime: string;
}

// Error models
model Error {
  error: string;
}

// Event Types Routes
@route("/event-types")
interface EventTypes {
  @get list(): EventType[];
  @get read(@path id: string): EventType | Error;
  @post create(@body body: CreateEventTypeRequest): EventType | Error;
  @put update(@path id: string, @body body: CreateEventTypeRequest): EventType | Error;
  @delete delete(@path id: string): { message: string } | Error;
}

// Available Days Routes
@route("/available-days")
interface AvailableDays {
  @get list(@query startDate?: string, @query endDate?: string): AvailableDay[];
  @post set(@body body: SetAvailableDayRequest): AvailableDay | Error;
  @delete delete(@path id: string): { message: string } | Error;
}

// Working Hours Routes
@route("/working-hours")
interface WorkingHoursRoutes {
  @get get(): WorkingHours;
  @put update(@body body: UpdateWorkingHoursRequest): WorkingHours | Error;
}

// Bookings Routes
@route("/bookings")
interface Bookings {
  @get list(@query status?: string, @query upcoming?: boolean): Booking[];
  @get slots(@query eventTypeId: string): Slot[];
  @post create(@body body: CreateBookingRequest): Booking | Error;
  @put update(@path id: string, @body body: UpdateBookingRequest): Booking | Error;
  @delete cancel(@path id: string): { message: string } | Error;
}
