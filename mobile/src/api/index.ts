import type {
  AuthResponse,
  CreateOrderRequest,
  LoginRequest,
  Order,
  RegisterRequest,
  Service,
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
};

export const vehiclesApi = {
  list: () => api.get<Vehicle[]>('/vehicles').then((response) => response.data),
};

export const ordersApi = {
  list: () => api.get<Order[]>('/orders').then((response) => response.data),
  create: (data: CreateOrderRequest) =>
    api.post<Order>('/orders', data).then((response) => response.data),
};
