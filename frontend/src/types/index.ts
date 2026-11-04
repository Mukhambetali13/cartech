// ── API Types ──
export type UserRole = 'client' | 'master';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  plate_number?: string;
  color?: string;
  engine_type?: string;
  transmission?: string;
  current_mileage?: number;
  notes?: string;
  engine_volume?: string;
  oil_type?: string;
  tire_size?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  service_type: 'sos' | 'planned';
  description?: string;
  sort_order?: number;
}

export interface Service {
  id: string;
  master_id: string;
  category_id: string;
  title: string;
  description?: string;
  price_from?: number;
  price_to?: number;
  duration_minutes?: number;
  is_mobile: boolean;
  is_active: boolean;
  created_at: string;
  master_name?: string;
  master_company?: string;
}

export interface CreateServiceRequest {
  category_id: string;
  title: string;
  description?: string;
  price_from?: number;
  price_to?: number;
  duration_minutes?: number;
  is_mobile: boolean;
}

export type OrderStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type ServiceType = 'sos' | 'planned';

export interface Order {
  id: string;
  client_id: string;
  master_id?: string;
  vehicle_id?: string;
  service_id?: string;
  status: OrderStatus;
  service_type: ServiceType;
  title: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  scheduled_at?: string;
  price_agreed?: number;
  client_price?: number;
  payment_status?: string;
  client_rating?: number;
  client_review?: string;
  created_at: string;
  updated_at: string;
  counterparty_name?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_engine_type?: string;
  vehicle_engine_volume?: string;
  vehicle_transmission?: string;
  vehicle_mileage?: number;
}

/** Насколько мастер может поднять цену клиента (₸) — совпадает с бэкендом */
export const MAX_OFFER_MARKUP = 10_000;

export type OfferStatus = 'pending' | 'accepted' | 'declined';

export interface OrderOffer {
  id: string;
  order_id: string;
  master_id: string;
  price: number;
  comment?: string;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderOfferWithMaster extends OrderOffer {
  master_name?: string;
  master_company?: string;
  master_rating?: number;
  master_review_count?: number;
}

export interface CreateOfferRequest {
  price: number;
  comment?: string;
}

export interface ServiceBookEntry {
  id: string;
  vehicle_id: string;
  order_id?: string;
  master_id?: string;
  entry_type: string;
  title: string;
  description?: string;
  mileage_at_service: number;
  next_service_mileage?: number;
  next_service_date?: string;
  parts_used?: Record<string, unknown>;
  cost?: number;
  receipt_url?: string;
  serviced_at: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  vehicle_id: string;
  user_id: string;
  reminder_type: 'mileage' | 'date';
  title: string;
  message?: string;
  trigger_mileage?: number;
  trigger_date?: string;
  is_sent?: boolean;
  is_dismissed?: boolean;
  created_at: string;
}

export interface ServiceBookSummary {
  entries: ServiceBookEntry[];
  active_reminders: Reminder[];
  last_oil_change?: ServiceBookEntry;
  last_service_mileage?: number;
}

// ── Request Types ──
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateVehicleRequest {
  make: string;
  model: string;
  year: number;
  vin?: string;
  plate_number?: string;
  color?: string;
  engine_type?: string;
  transmission?: string;
  current_mileage?: number;
  notes?: string;
  engine_volume?: string;
  oil_type?: string;
  tire_size?: string;
}

export interface CreateOrderRequest {
  vehicle_id?: string;
  service_id?: string;
  service_type: ServiceType;
  title: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  scheduled_at?: string;
  client_price: number;
}

export interface CreateServiceBookEntryRequest {
  entry_type: string;
  title: string;
  description?: string;
  mileage_at_service: number;
  next_service_mileage?: number;
  next_service_date?: string;
  parts_used?: Record<string, unknown>;
  cost?: number;
  serviced_at?: string;
}
