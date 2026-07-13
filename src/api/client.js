import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * ─────────────────────────────────────────────────────────────
 *  NETWORK CONFIGURATION
 * ─────────────────────────────────────────────────────────────
 *
 *  This automatically detects the correct backend host:
 *
 *  Physical Device  → uses the same IP Expo is already using
 *  Android Emulator → 10.0.2.2 (host machine's localhost)
 *  iOS Simulator    → localhost
 *
 *  If auto-detection fails, set MANUAL_IP to your PC's WiFi IP.
 *  Run `ipconfig` on Windows to find it (look for 192.168.x.x).
 * ─────────────────────────────────────────────────────────────
 */
const PRODUCTION_URL = 'http://98.94.8.46';

const getBaseUrl = () => {
  // If we have a production URL set, use it everywhere (web, iOS, Android)
  if (PRODUCTION_URL) {
    // Strip trailing slash if present, then append /api/v1
    const base = PRODUCTION_URL.replace(/\/$/, '');
    return `${base}/api/v1`;
  }

  // Web always uses the host it was loaded from (fixes Network Error on localhost)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `http://${window.location.hostname}:8000/api/v1`;
    }
    return 'http://localhost:8000/api/v1';
  }

  // Try to read the host Expo is already using to serve the JS bundle
  const expoHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (expoHost) {
    const host = expoHost.split(':')[0];
    console.log('[API] Auto-detected backend host from Expo:', host);
    return `http://${host}:8000/api/v1`;
  }

  // Emulator fallback
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000/api/v1';
  return 'http://localhost:8000/api/v1';
};

export const BASE_URL = getBaseUrl();
console.log('[API] Backend URL:', BASE_URL);

// ─── Global logout callback ────────────────────────────────────────────────
let _logoutHandler = null;
export const setLogoutHandler = (handler) => { _logoutHandler = handler; };
const triggerLogout = () => { if (_logoutHandler) _logoutHandler(); };

// ─── Token Refresh Mutex ───────────────────────────────────────────────────
// Prevents multiple concurrent 401 errors from all triggering a refresh at
// the same time (race condition that blacklists the refresh token prematurely).
let _isRefreshing = false;
let _refreshQueue = []; // [{resolve, reject}]

const processRefreshQueue = (error, token = null) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  _refreshQueue = [];
};

// ─── Axios instance ────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
});

// ─── Request interceptor — attach JWT access token ────────────────────────
const PUBLIC_ROUTES = [
  '/auth/login/',
  '/auth/register/',
  '/auth/demo/',
  '/auth/token/refresh/',
  '/auth/status/',
];

const isPublicRoute = (url = '') =>
  PUBLIC_ROUTES.some((route) => url.includes(route));

client.interceptors.request.use(
  async (config) => {
    if (!isPublicRoute(config.url)) {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (_) {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 with mutex ─────────────────────────
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Don't retry auth routes — avoids infinite loops
    const isAuthRoute =
      original?.url?.includes('/auth/login/') ||
      original?.url?.includes('/auth/register/') ||
      original?.url?.includes('/auth/token/refresh/') ||
      original?.url?.includes('/auth/demo/');

    if (
      error.response?.status === 401 &&
      !original?._retry &&
      !isAuthRoute
    ) {
      // If a refresh is already in progress, queue this request
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (original.headers && typeof original.headers.set === 'function') {
              original.headers.set('Authorization', `Bearer ${newToken}`);
            } else {
              original.headers.Authorization = `Bearer ${newToken}`;
            }
            return client(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      _isRefreshing = true;

      try {
        const refresh = await AsyncStorage.getItem('refreshToken');
        if (!refresh) throw new Error('No refresh token stored');

        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh,
        });

        // Store rotated tokens
        await AsyncStorage.setItem('accessToken', data.access);
        if (data.refresh) {
          await AsyncStorage.setItem('refreshToken', data.refresh);
        }

        // Notify all queued requests with the new token
        processRefreshQueue(null, data.access);
        _isRefreshing = false;

        if (original.headers && typeof original.headers.set === 'function') {
          original.headers.set('Authorization', `Bearer ${data.access}`);
        } else {
          original.headers.Authorization = `Bearer ${data.access}`;
        }
        return client(original);
      } catch (refreshError) {
        // Token refresh failed — clear everything and force user to login
        processRefreshQueue(refreshError, null);
        _isRefreshing = false;

        try {
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('refreshToken');
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('navState');
        } catch (e) {}

        triggerLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
