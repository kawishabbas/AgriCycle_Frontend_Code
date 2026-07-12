import React, { useCallback,  useState, useEffect, useRef  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Colors from '../theme/colors';
import client from '../api/client';
import { silentError } from '../utils/errorHandler';

const Bubble = ({ msg, isMine }) => (
  <View style={[styles.bubbleWrapper, isMine ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
    <View style={[styles.bubble, isMine ? styles.bubbleSent : styles.bubbleReceived]}>
      <Text style={[styles.bubbleText, isMine && styles.bubbleTextSent]}>{msg.content}</Text>
    </View>
    <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeRight]}>
      {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </Text>
  </View>
);

const ChatDetailScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { markChatReadLocally, refreshCount } = useNotifications();
  const { conversation, suggestedReplies: paramSuggestions } = route.params;
  const otherUser = (conversation.participants || []).find(p => p.id !== user?.id) || {};
  const hasUnreadRef = useRef((conversation.unread_count || 0) > 0);

  const listingName = conversation.listing_snapshot || 'this waste';

  // Built-in default suggestions — always available for empty conversations
  const defaultSuggestions = [
    `Hi, I'm interested in "${listingName}". Is it still available?`,
    `Can you send more info about this waste?`,
    `What's the minimum order for "${listingName}"?`,
    `Is the price negotiable?`,
    `Can you deliver to my location?`,
    `How was this waste stored?`,
  ];

  // Use param suggestions if provided, otherwise fall back to defaults
  const suggestions = paramSuggestions?.length > 0 ? paramSuggestions : defaultSuggestions;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [suggestionsVisible, setSuggestionsVisible] = useState(true);
  const flatRef = useRef(null);

  useEffect(() => {
    // If the conversation had unread messages when we opened it, drop the global badge instantly
    if (hasUnreadRef.current) {
      hasUnreadRef.current = false;
      markChatReadLocally();
      // Optionally trigger a background refresh to fully sync with the server
      setTimeout(() => refreshCount(), 1000);
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 8000); // Poll every 8s (was 2s — reduced to avoid token floods)
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const { data } = await client.get(`/chat/conversations/${conversation.id}/messages/`);
      const msgs = Array.isArray(data) ? data : (data.results || []);
      // Sort newest-first for the inverted FlatList
      const sortedMsgs = msgs.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
      setMessages(sortedMsgs);
      if (sortedMsgs.length > 0) setSuggestionsVisible(false);
    } catch (err) {
      if (err?.response?.status !== 401) {
        silentError(err, 'Fetch messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (overrideContent = null) => {
    const content = typeof overrideContent === 'string' ? overrideContent.trim() : input.trim();
    if (!content) return;

    // Optimistically add message to UI
    const optimistic = { id: `temp-${Date.now()}`, content, sender: user?.id, sent_at: new Date().toISOString() };
    // Add to the START of the array for inverted list
    setMessages(prev => [optimistic, ...prev]);
    setInput('');
    setSuggestionsVisible(false);

    try {
      const { data } = await client.post(`/chat/conversations/${conversation.id}/send/`, { content });
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    } catch (err) {
      silentError(err, 'Send message');
      // Remove the optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' }]}>
           <MaterialCommunityIcons name="account" size={24} color={Colors.textMuted} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUser.full_name || 'AgriCycle User'}</Text>
          <Text style={styles.headerOnline}>Active</Text>
        </View>
      </View>

      <View style={styles.productBanner}>
        <MaterialCommunityIcons name="leaf" size={18} color={Colors.primary} />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{conversation.listing_snapshot}</Text>
        </View>
      </View>

      {loading && messages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const senderId = typeof item.sender === 'object' ? item.sender?.id : item.sender;
            return <Bubble msg={item} isMine={senderId === user.id} />;
          }}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Suggested Replies — show when no messages and suggestions visible */}
      {!loading && messages.length === 0 && suggestionsVisible && suggestions.length > 0 && (
        <View style={styles.suggestionsWrap}>
          <Text style={styles.suggestionsLabel}>💡 Quick starters:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
            {suggestions.map((reply, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionChip}
                onPress={() => sendMessage(reply)}
                activeOpacity={0.75}
              >
                <Text style={styles.suggestionChipText} numberOfLines={2}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
          <Ionicons name="send" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingTop: 48, paddingBottom: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  backBtn: { padding: 4 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerOnline: { fontSize: 12, color: Colors.onlineDot, fontWeight: '500' },
  productBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: Colors.accent, gap: 10 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  messageList: { padding: 16, gap: 12 },
  bubbleWrapper: { maxWidth: '80%', marginBottom: 8 },
  bubbleWrapperLeft: { alignSelf: 'flex-start' },
  bubbleWrapperRight: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleSent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleReceived: { backgroundColor: Colors.white, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  bubbleTextSent: { color: Colors.white },
  bubbleTime: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  bubbleTimeRight: { textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  textInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 22, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9, fontSize: 14, color: Colors.textPrimary, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },

  // ── Suggested Replies ──
  suggestionsWrap: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, paddingBottom: 6 },
  suggestionsLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', paddingHorizontal: 14, marginBottom: 8 },
  suggestionsRow: { paddingHorizontal: 12, gap: 8 },
  suggestionChip: {
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#F0FAF4', maxWidth: 240,
  },
  suggestionChipText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});

export default ChatDetailScreen;
