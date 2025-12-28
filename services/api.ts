import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get API URL from app.config.js extra field (set during build)
const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token management
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('session_token');
  }
  return await SecureStore.getItemAsync('session_token');
};

const setToken = async (token: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem('session_token', token);
  } else {
    await SecureStore.setItemAsync('session_token', token);
  }
};

const removeToken = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem('session_token');
  } else {
    await SecureStore.deleteItemAsync('session_token');
  }
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.session_token) {
      await setToken(response.data.session_token);
    }
    return response.data;
  },

  register: async (data: { name: string; email: string; phone: string; tc_kimlik?: string; password: string }) => {
    const response = await api.post('/auth/register', data);
    if (response.data.session_token) {
      await setToken(response.data.session_token);
    }
    return response.data;
  },

  googleCallback: async (session_id: string) => {
    const response = await api.post('/auth/google/callback', { session_id });
    if (response.data.session_token) {
      await setToken(response.data.session_token);
    }
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      await removeToken();
    }
  },

  getToken,
  setToken,
  removeToken,
};

// Vehicle API
export const vehicleAPI = {
  getVehicles: async (params?: Record<string, any>) => {
    const response = await api.get('/vehicles', { params });
    return response.data;
  },

  getVehicle: async (id: string) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  getPopularVehicles: async () => {
    const response = await api.get('/vehicles/popular');
    return response.data;
  },
};

// Reservation API
export const reservationAPI = {
  getReservations: async (status?: string) => {
    const response = await api.get('/reservations', { params: { status } });
    return response.data;
  },

  getReservation: async (id: string) => {
    const response = await api.get(`/reservations/${id}`);
    return response.data;
  },

  createReservation: async (data: any) => {
    const response = await api.post('/reservations', data);
    return response.data;
  },

  cancelReservation: async (id: string) => {
    const response = await api.delete(`/reservations/${id}`);
    return response.data;
  },

  payReservation: async (id: string) => {
    const response = await api.post(`/reservations/${id}/pay`);
    return response.data;
  },
};

// Notification API
export const notificationAPI = {
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
};

// Location API
export const locationAPI = {
  getLocations: async (city?: string) => {
    const response = await api.get('/locations', { params: { city } });
    return response.data;
  },
};

// Campaign API
export const campaignAPI = {
  getCampaigns: async () => {
    const response = await api.get('/campaigns');
    return response.data;
  },
};

// User API
export const userAPI = {
  updateProfile: async (data: any) => {
    const response = await api.put('/users/me', data);
    return response.data;
  },
};

// Seed API (for development)
export const seedAPI = {
  seed: async () => {
    const response = await api.post('/seed');
    return response.data;
  },
};

export default api;
