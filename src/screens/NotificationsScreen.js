import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../theme/colors';
import client from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { silentError } from '../utils/errorHandler';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  // Only enable on Old Architecture to avoid the no-op warning on Fabric
  if (!global.nativeFabricUIManager) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Map notif_type → icon/color
const TYPE_META = {
  order_placed:    { icon: 'cart-outline',                color: Colors.primary },
  order_confirmed: { icon: 'checkmark-circle-outline',    color: '#4CAF50' },
  order_delivered: { icon: 'cube-outline',                color: '#2196F3' },
  order_cancelled: { icon: 'close-circle-outline',        color: '#F44336' },
  new_message:     { icon: 'chatbubble-outline',          color: '#9C27B0' },
  listing_sold:    { icon: 'pricetag-outline',            color: '#FF9800' },
  system:          { icon: 'information-circle-outline',  color: Colors.textMuted },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const { refreshCount, markNotificationsReadLocally } = useNotifications();

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, chatRes] = await Promise.all([
        client.get('/notifications/').catch(() => ({ data: [] })),
        client.get('/chat/conversations/').catch(() => ({ data: [] }))
      ]);

      const baseList = Array.isArray(notifRes.data) ? notifRes.data : (notifRes.data.results ?? []);
      
      const chats = Array.isArray(chatRes.data) ? chatRes.data : (chatRes.data.results ?? []);
      const unreadChats = chats.filter(c => (c.unread_count || 0) > 0);

      // Convert unread chats into notification-like objects
      const chatNotifs = unreadChats.map(c => {
        const otherUser = c.participants?.find(p => p.id !== undefined) || {}; // fallback if no id comparison available easily
        const lastMsg = c.last_message || {};
        return {
          id: `chat_${c.id}`, // pseudo id
          notif_type: 'new_message',
          title: `New message from ${otherUser.full_name || 'AgriCycle User'}`,
          body: lastMsg.content || 'You have unread messages.',
          created_at: lastMsg.sent_at || c.updated_at || new Date().toISOString(),
          is_read: false,
          is_chat_mock: true,
          conversation_id: c.id,
          raw_conversation: c,
        };
      });

      // Combine and sort by created_at descending
      const combined = [...chatNotifs, ...baseList].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(combined);
    } catch (err) {
      silentError(err, 'Notifications fetch');
    }
  }, []);

  // On focus: load notifications AND mark all read + reset badge
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));

      // Mark all read after a short delay (let user see unread state first)
      const timer = setTimeout(async () => {
        // Instantly drop the badge
        markNotificationsReadLocally();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        
        try {
          await client.post('/notifications/mark-all-read/');
          refreshCount(); // Resync with server
        } catch {
          // Silently fail
        }
      }, 1500);

      return () => clearTimeout(timer);
    }, [fetchNotifications, refreshCount])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const deleteNotification = async (id, isChatMock = false) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      if (!isChatMock) {
        await client.delete(`/notifications/${id}/delete/`);
      }
      refreshCount();
    } catch {
      // Already removed from UI — ignore API error
    }
  };

  const handlePress = (item) => {
    if (item.is_chat_mock && item.raw_conversation) {
      // Navigate through the Chat tab stack to reach ChatDetail properly
      navigation.navigate('Chat', { 
        screen: 'ChatDetail', 
        params: { conversation: item.raw_conversation } 
      });
    }
  };

  const renderItem = ({ item }) => {
    const meta = TYPE_META[item.notif_type] ?? TYPE_META.system;
    return (
      <TouchableOpacity 
        style={[styles.card, !item.is_read && styles.cardUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={item.is_chat_mock ? 0.7 : 1}
      >
        {/* Unread dot */}
        {!item.is_read && <View style={styles.unreadDot} />}

        <View style={[styles.iconWrap, { backgroundColor: meta.color + '22' }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteNotification(item.id, item.is_chat_mock)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={async () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            markNotificationsReadLocally();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            try { 
              await client.post('/notifications/mark-all-read/'); 
              refreshCount(); 
            } catch {}
          }}
          hitSlop={{ top:10,bottom:10,left:10,right:10 }}
        >
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={72} color={Colors.border} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySub}>You're all caught up! We'll notify you when something happens.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 14, paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  markAllText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  list: { padding: 16, paddingBottom: 40 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    position: 'relative',
  },
  cardUnread: {
    backgroundColor: '#F0FAF0',
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  unreadDot: {
    position: 'absolute', top: 14, right: 36,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  body: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 5 },
  time: { fontSize: 11, color: Colors.textMuted },

  deleteBtn: { padding: 4, marginLeft: 8, marginTop: 2 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
});

export default NotificationsScreen;
