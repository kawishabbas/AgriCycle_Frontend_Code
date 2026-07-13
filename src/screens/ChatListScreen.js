import React, { useCallback,  useState, useEffect, useRef  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Colors from '../theme/colors';
import client from '../api/client';
import { silentError } from '../utils/errorHandler';
import GuestPrompt from '../components/GuestPrompt';

const timeAgo = (dateStr) => {
  if (!dateStr) return 'now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ─── Swipe Delete Action ────────────────────────────
const RightSwipeAction = ({ onPress, dragX }) => {
  const scale = dragX.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });
  return (
    <RectButton style={styles.deleteAction} onPress={onPress}>
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.deleteActionTxt}>Delete</Text>
      </Animated.View>
    </RectButton>
  );
};

// ─── Chat Row ───────────────────────────────────────
const ChatRow = ({ item, onPress, onLongPress, onDelete, currentUser }) => {
  const otherUser = item.participants?.find(p => p.id !== currentUser.id) || {};
  const lastMsg = item.last_message || {};
  const [, setTick] = useState(0);
  const swipeRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const renderRightActions = (progress, dragX) => (
    <RightSwipeAction
      dragX={dragX}
      onPress={() => {
        onDelete(item, () => swipeRef.current?.close());
      }}
    />
  );

  return (
    <Swipeable 
      ref={swipeRef} 
      renderRightActions={renderRightActions} 
      friction={2} 
      rightThreshold={40}
      onSwipeableOpen={() => {
        onDelete(item, () => swipeRef.current?.close());
      }}
    >
      <TouchableOpacity
        style={styles.row}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        delayLongPress={800}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatar, { backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' }]}>
            <MaterialCommunityIcons name="account" size={28} color={Colors.textMuted} />
          </View>
        </View>

        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={styles.name}>{otherUser.full_name || 'AgriCycle User'}</Text>
            <Text style={styles.time}>{timeAgo(lastMsg.sent_at || item.updated_at)}</Text>
          </View>
          <Text style={styles.product}>{item.listing_snapshot}</Text>
          <Text style={styles.preview} numberOfLines={1}>
            {lastMsg.content || 'No messages yet...'}
          </Text>
        </View>

        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread_count}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};


// ─── Main Screen ────────────────────────────────────
const ChatListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { unreadCount, refreshCount } = useNotifications();
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Fetch initially on focus
    const unsubscribeFocus = navigation.addListener('focus', () => {
      fetchConversations();
    });

    // Poll every 15 seconds (was 5s — reduced to prevent token refresh floods)
    const interval = setInterval(fetchConversations, 15000);

    return () => {
      unsubscribeFocus();
      clearInterval(interval);
    };
  }, [navigation, user]);

  const fetchConversations = async () => {
    try {
      const { data } = await client.get('/chat/conversations/');
      setConversations(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      if (err?.response?.status !== 401) {
        silentError(err, 'Fetch chats');
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversations.filter(
    (c) =>
      (c.listing_snapshot || '').toLowerCase().includes(search.toLowerCase())
  );

  const [deleteModal, setDeleteModal] = useState({ visible: false, item: null, closeCallback: null });
  const [deleting, setDeleting] = useState(false);

  const handleLongPress = (item, closeCallback) => {
    setDeleteModal({ visible: true, item, closeCallback });
  };

  const executeDelete = async () => {
    const { item, closeCallback } = deleteModal;
    if (closeCallback) closeCallback();
    setDeleteModal({ visible: false, item: null, closeCallback: null });
    if (!item) return;
    setDeleting(true);
    // Optimistic remove
    setConversations(prev => prev.filter(c => c.id !== item.id));
    try {
      await client.delete(`/chat/conversations/${item.id}/delete/`);
    } catch (err) {
      silentError(err, 'Delete chat');
      // Revert on failure
      fetchConversations();
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <GuestPrompt 
        title="Chats" 
        message="Sign in to view your messages and chat with buyers and sellers." 
        icon="chat-processing-outline" 
      />
    );
  }

  const handlePress = (item) => {
    navigation?.navigate('ChatDetail', { conversation: item });
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        notificationCount={unreadCount}
        onNotificationPress={() => { refreshCount(); navigation?.navigate('Notifications'); }}
        hideSearch={true}
      />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ChatRow
            item={item}
            onPress={handlePress}
            onLongPress={handleLongPress}
            onDelete={handleLongPress}
            currentUser={user}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="chat-remove-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No conversations yet</Text>
          </View>
        }
      />

      {/* Delete Confirm Modal */}
      <Modal visible={deleteModal.visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trash-outline" size={32} color="#E53935" />
            </View>
            <Text style={styles.modalTitle}>Delete Chat?</Text>
            <Text style={styles.modalBody}>
              This conversation will be removed from your chat list.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#F5F7FA' }]}
                onPress={() => {
                  if (deleteModal.closeCallback) deleteModal.closeCallback();
                  setDeleteModal({ visible: false, item: null, closeCallback: null });
                }}
              >
                <Text style={[styles.modalBtnTxt, { color: Colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#E53935' }]}
                onPress={executeDelete}
              >
                <Text style={[styles.modalBtnTxt, { color: '#fff' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: 14,
    marginVertical: 10,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, gap: 12 },
  avatarWrapper: { width: 50, height: 50 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  rowContent: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  time: { fontSize: 12, color: Colors.textMuted },
  product: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  preview: { fontSize: 13, color: Colors.textSecondary },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  separator: { height: 1, backgroundColor: Colors.separator, marginLeft: 78 },
  empty: { alignItems: 'center', paddingTop: 100, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 16 },

  // ── Modal ──
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 320, alignItems: 'center',
    elevation: 5,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFEBEE',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  modalBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnTxt: { fontWeight: '700', fontSize: 14 },

  // ── Swipe Action ──
  deleteAction: {
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteActionTxt: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 4 },
});

export default ChatListScreen;
