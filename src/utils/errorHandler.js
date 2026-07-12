/**
 * errorHandler.js
 * ─────────────────────────────────────────────────────────────
 * Central error handling utility for AgriCycle.
 * All API errors are translated into friendly, non-technical
 * messages that any user can understand.
 * ─────────────────────────────────────────────────────────────
 */

import { Alert, Platform } from 'react-native';

/**
 * Converts any error (Axios, network, or generic) into a
 * clean, user-friendly string message.
 */
export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  // Network / no response
  if (!err.response) {
    const code = err.code || '';
    if (
      code === 'ECONNREFUSED' || code === 'ERR_NETWORK' ||
      code === 'ECONNABORTED' ||
      err.message?.includes('Network Error') ||
      err.message?.includes('Network request failed') ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('timeout')
    ) {
      return 'Cannot connect. Please check your internet connection and try again.';
    }
    return 'A connection problem occurred. Please try again.';
  }

  const status = err.response?.status;
  const data   = err.response?.data;

  // Auth errors — kept friendly
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'The information you requested could not be found.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500)  return 'Our server is currently unavailable. Please try again shortly.';

  // Try to parse a sensible message from the response body
  if (!data) return fallback;
  if (typeof data === 'string') return data.substring(0, 200);
  if (data.detail)              return String(data.detail).substring(0, 200);
  if (data.message)             return String(data.message).substring(0, 200);
  if (data.non_field_errors) {
    const v = data.non_field_errors;
    return String(Array.isArray(v) ? v[0] : v).substring(0, 200);
  }

  // First field error
  const keys = Object.keys(data);
  if (keys.length > 0) {
    const val = data[keys[0]];
    return String(Array.isArray(val) ? val[0] : val).substring(0, 200);
  }

  return fallback;
};

/**
 * Shows a friendly error Alert to the user.
 * Silences console.error-style stack traces.
 * @param {Error|string} err - The caught error
 * @param {string} title     - Dialog title (default "Oops!")
 * @param {string} fallback  - Fallback message if err is unreadable
 */
export const showError = (err, title = 'Oops!', fallback = 'Something went wrong. Please try again.') => {
  const message = getErrorMessage(err, fallback);
  if (Platform.OS === 'web') {
    // On web, avoid alert() blocking the thread — just log quietly
    console.warn('[AgriCycle]', title, message);
    // You can swap this for a toast/snackbar library in the future
  } else {
    Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
  }
};

/**
 * Silent error handler — logs quietly without showing UI.
 * Use for background tasks where we don't want to interrupt the user.
 */
export const silentError = (err, context = '') => {
  // Only log in dev — never expose to user
  if (__DEV__) {
    console.warn(`[AgriCycle${context ? ' · ' + context : ''}]`, getErrorMessage(err));
  }
};
