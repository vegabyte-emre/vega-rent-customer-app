export interface User {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  tc_kimlik?: string;
  picture?: string;
  created_at: string;
  ehliyet_no?: string;
  ehliyet_sinifi?: string;
  ehliyet_tarihi?: string;
  dogum_tarihi?: string;
  adres?: string;
}

export interface Vehicle {
  vehicle_id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  segment: string;
  transmission: string;
  fuel_type: string;
  seats: number;
  doors: number;
  daily_price: number;
  features: string[];
  images: string[];
  available: boolean;
  km: number;
  baggage_capacity: string;
  min_age: number;
  min_license_years: number;
  deposit: number;
  km_limit: number;
}

export interface Reservation {
  reservation_id: string;
  user_id: string;
  vehicle_id: string;
  pickup_date: string;
  return_date: string;
  pickup_location: string;
  return_location: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  total_price: number;
  extras: string[];
  extras_price: number;
  driver_info?: DriverInfo;
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
  qr_code?: string;
}

export interface DriverInfo {
  tc_kimlik: string;
  ehliyet_no: string;
  ehliyet_sinifi: string;
  ehliyet_tarihi: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'reservation' | 'campaign' | 'system' | 'payment';
  read: boolean;
  created_at: string;
  data?: Record<string, any>;
}

export interface Campaign {
  campaign_id: string;
  title: string;
  description: string;
  image: string;
  discount_percent: number;
  valid_until: string;
  active: boolean;
}

export interface Location {
  location_id: string;
  name: string;
  address: string;
  city: string;
  type: 'airport' | 'city' | 'hotel';
  working_hours: string;
}

export interface SearchParams {
  pickup_date?: Date;
  return_date?: Date;
  pickup_location?: string;
  return_location?: string;
}

export interface FilterParams {
  segment?: string;
  brand?: string;
  transmission?: string;
  fuel_type?: string;
  min_price?: number;
  max_price?: number;
  available?: boolean;
}
