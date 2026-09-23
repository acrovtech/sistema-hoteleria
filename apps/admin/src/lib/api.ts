import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const ACCESS_KEY = 'hotel.accessToken';
const REFRESH_KEY = 'hotel.refreshToken';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_KEY, access),
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api: AxiosInstance = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) throw new Error('Sin refresh token');
      const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
      tokenStore.set(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

interface RetryConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    if (error.response?.status === 401 && config && !config._retried) {
      config._retried = true;
      try {
        const accessToken = await doRefresh();
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
        return api(config);
      } catch {
        tokenStore.clear();
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
    }
    throw error;
  },
);
