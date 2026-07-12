import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({ 
  unreadCount: 0, 
  unreadMessageCount: 0,
  refreshCount: () => {} 
});

export const useNotifications = () => useContext(NotificationContext);

const POLL_INTERVAL_MS = 30_000; // 30 seconds — reduced from 5s to prevent token refresh floods

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifCount, setNotifCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const intervalRef = useRef(null);

  // Derived total
  const unreadCount = notifCount + unreadMessageCount;

  // Optimistic Updaters for instant UI response
  const markNotificationsReadLocally = useCallback(() => setNotifCount(0), []);
  const markChatReadLocally = useCallback(() => setUnreadMessageCount(prev => Math.max(0, prev - 1)), []);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [notifRes, chatRes] = await Promise.all([
        client.get('/notifications/unread-count/').catch((e) => {
          if (e?.response?.status === 401) throw e; // let interceptor handle auth
          return { data: { unread_count: 0 } };
        }),
        client.get('/chat/conversations/').catch((e) => {
          if (e?.response?.status === 401) throw e;
          return { data: [] };
        })
      ]);

      const newNotifCount = notifRes.data.unread_count ?? 0;
      const chats = Array.isArray(chatRes.data) ? chatRes.data : (chatRes.data.results || []);
      const unreadChatCount = chats.filter(chat => (chat.unread_count || 0) > 0).length;

      setUnreadMessageCount(unreadChatCount);
      setNotifCount(newNotifCount);
    } catch {
      // Silently fail — interceptor handles auth
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifCount(0);
      setUnreadMessageCount(0);
      return;
    }

    fetchCounts();
    intervalRef.current = setInterval(fetchCounts, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchCounts]);

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      unreadMessageCount, 
      refreshCount: fetchCounts,
      markNotificationsReadLocally,
      markChatReadLocally
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
