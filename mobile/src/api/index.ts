export { apiErrorMessage } from './client';

import type {
  AuthResponse,
  CreateOfferRequest,
  CreateOrderRequest,
  CreateServiceBookEntryRequest,
  CreateVehicleRequest,
  LoginRequest,
  Order,
  OrderOffer,
  OrderOfferWithMaster,
  RegisterRequest,
  Service,
  ServiceBookEntry,
  ServiceBookSummary,
  ServiceCategory,
  User,
  Vehicle,
} from '@shared/types/index';
import { api } from './client';

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data).then((response) => response.data),
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data).then((response) => response.data),
  me: () => api.get<User>('/auth/me').then((response) => response.data),
};

export const servicesApi = {
  list: (params?: { service_type?: 'sos' | 'planned' }) =>
    api.get<Service[]>('/services', { params }).then((response) => response.data),
  categories: () =>
    api.get<ServiceCategory[]>('/services/categories').then((response) => response.data),
};

export const vehiclesApi = {
  list: () => api.get<Vehicle[]>('/vehicles').then((response) => response.data),
  get: (id: string) => api.get<Vehicle>(`/vehicles/${id}`).then((response) => response.data),
  create: (data: CreateVehicleRequest) =>
    api.post<Vehicle>('/vehicles', data).then((response) => response.data),
  update: (id: string, data: Partial<CreateVehicleRequest>) =>
    api.put<Vehicle>(`/vehicles/${id}`, data).then((response) => response.data),
  remove: (id: string) => api.delete(`/vehicles/${id}`).then((response) => response.data),
};

export const serviceBookApi = {
  get: (vehicleId: string) =>
    api.get<ServiceBookSummary>(`/vehicles/${vehicleId}/service-book`).then((response) => response.data),
  add: (vehicleId: string, data: CreateServiceBookEntryRequest) =>
    api
      .post<ServiceBookEntry>(`/vehicles/${vehicleId}/service-book`, data)
      .then((response) => response.data),
  remove: (vehicleId: string, entryId: string) =>
    api.delete(`/vehicles/${vehicleId}/service-book/${entryId}`).then((response) => response.data),
};

export const ordersApi = {
  list: () => api.get<Order[]>('/orders').then((response) => response.data),
  get: (id: string) => api.get<Order>(`/orders/${id}`).then((response) => response.data),
  updateStatus: (id: string, status: string) =>
    api.put<Order>(`/orders/${id}/status`, { status }).then((r) => r.data),
  create: (data: CreateOrderRequest) =>
    api.post<Order>('/orders', data).then((response) => response.data),
};

export const offersApi = {
  list: (orderId: string) =>
    api.get<OrderOfferWithMaster[]>(`/orders/${orderId}/offers`).then((r) => r.data),
  create: (orderId: string, data: CreateOfferRequest) =>
    api.post<OrderOffer>(`/orders/${orderId}/offers`, data).then((r) => r.data),
  accept: (orderId: string, offerId: string) =>
    api.put<OrderOffer>(`/orders/${orderId}/offers/${offerId}/accept`).then((r) => r.data),
  decline: (orderId: string, offerId: string) =>
    api.put<OrderOffer>(`/orders/${orderId}/offers/${offerId}/decline`).then((r) => r.data),
};
