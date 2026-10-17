import api from './client';
import type {
  AuthResponse,
  CreateOrderRequest,
  CreateServiceBookEntryRequest,
  CreateVehicleRequest,
  LoginRequest,
  Order,
  RegisterRequest,
  Reminder,
  Service,
  ServiceBookSummary,
  ServiceCategory,
  Vehicle,
} from '../types';

// ── Auth ──
export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  me: () => api.get<AuthResponse['user']>('/auth/me').then((r) => r.data),
};

// ── Vehicles ──
export const vehiclesApi = {
  list: () => api.get<Vehicle[]>('/vehicles').then((r) => r.data),
  get: (id: string) => api.get<Vehicle>(`/vehicles/${id}`).then((r) => r.data),
  create: (data: CreateVehicleRequest) =>
    api.post<Vehicle>('/vehicles', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateVehicleRequest>) =>
    api.put<Vehicle>(`/vehicles/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/vehicles/${id}`).then((r) => r.data),
};

// ── Services ──
export const servicesApi = {
  categories: () =>
    api.get<ServiceCategory[]>('/services/categories').then((r) => r.data),
  list: (params?: { service_type?: string; category_slug?: string; is_mobile?: boolean }) =>
    api.get<Service[]>('/services', { params }).then((r) => r.data),
  get: (id: string) => api.get<Service>(`/services/${id}`).then((r) => r.data),
  create: (data: Omit<Service, 'id' | 'master_id' | 'is_active' | 'created_at'>) =>
    api.post<Service>('/services', data).then((r) => r.data),
  myServices: () => api.get<Service[]>('/services/my').then((r) => r.data),
};

// ── Orders ──
export const ordersApi = {
  list: (params?: { status?: string; service_type?: string }) =>
    api.get<Order[]>('/orders', { params }).then((r) => r.data),
  get: (id: string) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  create: (data: CreateOrderRequest) =>
    api.post<Order>('/orders', data).then((r) => r.data),
  updateStatus: (id: string, status: string, price_agreed?: number) =>
    api.put<Order>(`/orders/${id}/status`, { status, price_agreed }).then((r) => r.data),
  rate: (id: string, rating: number, review?: string) =>
    api.post<Order>(`/orders/${id}/rate`, { rating, review }).then((r) => r.data),
};

// ── Service Book ──
export const serviceBookApi = {
  get: (vehicleId: string) =>
    api.get<ServiceBookSummary>(`/vehicles/${vehicleId}/service-book`).then((r) => r.data),
  addEntry: (vehicleId: string, data: CreateServiceBookEntryRequest) =>
    api.post(`/vehicles/${vehicleId}/service-book`, data).then((r) => r.data),
  getReminders: (vehicleId: string) =>
    api.get<Reminder[]>(`/vehicles/${vehicleId}/reminders`).then((r) => r.data),
  dismissReminder: (vehicleId: string, reminderId: string) =>
    api
      .put(`/vehicles/${vehicleId}/reminders/${reminderId}`)
      .then((r) => r.data),
};
