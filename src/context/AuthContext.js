import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import client, { BASE_URL, setLogoutHandler } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,          setUser]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isGuest,       setIsGuest]       = useState(true); // Default to true!

  // ─── Register logout callback so the API interceptor can trigger it ─────
  useEffect(() => {
    setLogoutHandler(async () => {
      try {
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('navState');
      } catch (e) {}
      setUser(null);
      setIsGuest(true); // Becoming a guest after token clears
    });
    return () => setLogoutHandler(null);
  }, []);

  // ─── Startup — restore session from AsyncStorage instantly ──────────────
  // Strategy: trust AsyncStorage immediately (no network call at startup).
  // The API interceptor handles expired tokens on the first API call.
  // This keeps startup fast (<100ms) and prevents navigation reset on reload.
  useEffect(() => {
    const init = async () => {
      try {
        const [storedUser, launched] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('hasLaunched'),
        ]);

        if (!launched) {
          setIsFirstLaunch(true);
          await AsyncStorage.setItem('hasLaunched', 'true');
        }

        if (storedUser) {
          setUser(JSON.parse(storedUser));
          
          // Background refresh to get the latest roles/profile
          client.get('/auth/profile/')
            .then(({ data }) => {
              setUser(data);
              AsyncStorage.setItem('user', JSON.stringify(data));
            })
            .catch(() => {});
        }
      } catch (_) {
        // Storage read failed — start clean
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ─── Error extractor ──────────────────────────────────────────────────────
  const extractError = (err) => {
    if (!err) return 'An unexpected error occurred.';
    if (typeof err === 'string') return err;

    if (!err.response) {
      const code = err.code || '';
      if (
        code === 'ECONNREFUSED' || code === 'ERR_NETWORK' ||
        code === 'ECONNABORTED' || err.message?.includes('Network Error') ||
        err.message?.includes('timeout')
      ) {
        return 'Cannot connect to the server. Please check your internet connection and try again.';
      }
      return err.message || 'Network error. Check your connection.';
    }

    const status = err.response.status;
    const d = err.response.data;

    if (!d) return `Server error (${status})`;
    if (typeof d === 'string') return d;
    if (d.detail) return String(d.detail);
    if (d.non_field_errors) {
      const v = d.non_field_errors;
      const first = Array.isArray(v) ? v[0] : v;
      return typeof first === 'object' ? JSON.stringify(first) : String(first);
    }
    const keys = Object.keys(d);
    if (keys.length > 0) {
      const key = keys[0];
      const val = d[key];
      const msg = Array.isArray(val) ? val[0] : val;
      return `${key}: ${String(msg)}`;
    }
    return `Server error (${status})`;
  };

  // ─── Intro mode ────────────────────────────────────────────────────────────
  const completeIntro = () => {
    setIsFirstLaunch(false);
  };

  // ─── Guest mode ────────────────────────────────────────────────────────────
  const continueAsGuest = () => {
    setIsGuest(true);
  };

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const { data } = await client.post('/auth/login/', {
        email: email.trim().toLowerCase(),
        password,
      });
      await AsyncStorage.setItem('accessToken',  data.tokens.access);
      await AsyncStorage.setItem('refreshToken', data.tokens.refresh);
      await AsyncStorage.setItem('user',         JSON.stringify(data.user));
      await AsyncStorage.removeItem('navState'); // Force clean slate on login
      setUser(data.user);
      setIsGuest(false);
      return data.user;
    } catch (err) {
      console.error('[Auth] Login:', err.response?.data ?? err.message);
      throw extractError(err);
    }
  };

  // ─── Guest login ──────────────────────────────────────────────────────────
  const loginGuest = async () => {
    try {
      const { data } = await client.get('/auth/demo/');
      await AsyncStorage.setItem('accessToken',  data.tokens.access);
      await AsyncStorage.setItem('refreshToken', data.tokens.refresh);
      await AsyncStorage.setItem('user',         JSON.stringify(data.user));
      await AsyncStorage.removeItem('navState'); // Force clean slate on guest login
      setUser(data.user);
      setIsGuest(false);
      return data.user;
    } catch (err) {
      console.error('[Auth] Guest:', err.response?.data ?? err.message);
      throw extractError(err);
    }
  };

  // ─── Register ─────────────────────────────────────────────────────────────
  const register = async (userData) => {
    try {
      const { data } = await client.post('/auth/register/', userData);
      if (data.tokens) {
        await AsyncStorage.setItem('accessToken',  data.tokens.access);
        await AsyncStorage.setItem('refreshToken', data.tokens.refresh);
      }
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      await AsyncStorage.removeItem('navState'); // Force clean slate on register
      setUser(data.user);
      setIsGuest(false);
      return data.user;
    } catch (err) {
      console.error('[Auth] Register:', err.response?.data ?? err.message);
      throw extractError(err);
    }
  };

  // ─── Update profile ───────────────────────────────────────────────────────
  const updateProfile = async (profileData) => {
    try {
      const { data } = await client.patch('/auth/profile/', profileData);
      const updated = { ...user, ...data };
      await AsyncStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      return updated;
    } catch (err) {
      console.error('[Auth] UpdateProfile:', err.response?.data ?? err.message);
      throw extractError(err);
    }
  };

  // ─── Logout — clears navState so user doesn't land on old screens ────────
  const logout = async () => {
    try {
      await client.post('/auth/logout/', { refresh: await AsyncStorage.getItem('refreshToken') });
    } catch (e) {
      // Ignore logout errors
    } finally {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('navState');
      setUser(null);
      setIsGuest(true); // Logout makes you a guest again
    }
    if (Platform.OS === 'web') {
      window.history.replaceState(null, '', '/'); // Go to root instead of /login
    }
  };

  const forceLogout = logout;

  // ─── Loading splash ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirstLaunch,
        isGuest,
        completeIntro,
        login,
        register,
        logout,
        continueAsGuest,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
