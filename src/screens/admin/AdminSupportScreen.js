import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, Modal, TextInput, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { silentError, showError } from '../../utils/errorHandler';

const AdminSupportScreen = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');

  const STATUS_FILTERS = ['All', 'open', 'in_progress', 'resolved', 'closed'];
  const STATUS_COLORS  = { open:'#F44336', in_progress:'#FF9800', resolved:'#4CAF50', closed:'#8F92A1' };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'All') params.status = filter;
      const { data } = await client.get('/admin/tickets/', { params });
      setTickets(data.results || data);
    } catch (e) { silentError(e, 'Fetch support tickets'); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchTickets(); }, [filter]));

  const sendReply = async () => {
    if (!replyText.trim()) return;
    try {
      await client.post(`/admin/tickets/${selected.id}/reply/`, { message: replyText, is_internal: false });
      setReplyText('');
      
      // refresh ticket details
      const { data } = await client.get(`/admin/tickets/${selected.id}/`);
      setSelected(data);
      fetchTickets(); // refresh list to update status
    } catch (e) { showError(e, 'Error', 'Failed to send reply'); }
  };

  const resolveTicket = async () => {
    try {
      await client.post(`/admin/tickets/${selected.id}/resolve/`);
      setSelected({ ...selected, status: 'resolved' });
      fetchTickets();
    } catch (e) { showError(e, 'Error', 'Failed to resolve ticket'); }
  };

  const renderTicket = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
      <View style={styles.ticketHeader}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="ticket" size={18} color={STATUS_COLORS[item.status]} />
          <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#999') + '33' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#999' }]}>{(item.status || 'open').replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.userEmail}>{item.user_email}</Text>
      <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support Tickets</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator size="large" color="#FF9800" style={{ flex: 1 }} /> : (
        <FlatList data={tickets} keyExtractor={i => i.id.toString()} renderItem={renderTicket}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No support tickets found.</Text>}
        />
      )}

      {selected && (
        <Modal visible animationType="slide" onRequestClose={() => setSelected(null)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Ticket #{selected.id}</Text>
              {selected.status !== 'resolved' && selected.status !== 'closed' ? (
                <TouchableOpacity onPress={resolveTicket}>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
                </TouchableOpacity>
              ) : <View style={{ width: 24 }} />}
            </View>

            <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.subjectText}>{selected.subject}</Text>
              <Text style={styles.descText}>{selected.description}</Text>
              
              <View style={styles.divider} />

              {(selected.messages || []).map(msg => (
                <View key={msg.id} style={[styles.msgBubble, msg.sender ? styles.msgAdmin : styles.msgUser]}>
                  <Text style={styles.msgSender}>{msg.sender_name || selected.user_name}</Text>
                  <Text style={styles.msgText}>{msg.message}</Text>
                  <Text style={styles.msgDate}>{new Date(msg.created_at).toLocaleString()}</Text>
                </View>
              ))}
            </ScrollView>

            {selected.status !== 'resolved' && selected.status !== 'closed' && (
              <View style={styles.inputArea}>
                <TextInput
                  style={styles.input} placeholder="Type your reply..." placeholderTextColor="#8F92A1"
                  value={replyText} onChangeText={setReplyText} multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendReply}>
                  <MaterialCommunityIcons name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  header: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, backgroundColor: '#1A1A2E' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  filterBar: { maxHeight: 44, backgroundColor: '#1A1A2E', paddingVertical: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#2D2D3A', marginRight: 8 },
  chipActive: { backgroundColor: '#FF9800' },
  chipText: { color: '#8F92A1', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 12, padding: 16, marginBottom: 10 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  subject: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  userEmail: { color: '#8F92A1', fontSize: 13, marginBottom: 4 },
  dateText: { color: '#8F92A1', fontSize: 11 },
  empty: { color: '#8F92A1', textAlign: 'center', marginTop: 40 },

  modalContainer: { flex: 1, backgroundColor: '#0D0D1A' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, backgroundColor: '#1A1A2E' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  chatArea: { flex: 1 },
  subjectText: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  descText: { color: '#8F92A1', fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#2D2D3A', marginVertical: 20 },
  
  msgBubble: { padding: 12, borderRadius: 12, marginBottom: 16, maxWidth: '85%' },
  msgUser: { backgroundColor: '#2D2D3A', alignSelf: 'flex-start', borderBottomLeftRadius: 0 },
  msgAdmin: { backgroundColor: '#2196F333', alignSelf: 'flex-end', borderBottomRightRadius: 0 },
  msgSender: { color: '#8F92A1', fontSize: 11, marginBottom: 4, fontWeight: '600' },
  msgText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  msgDate: { color: '#8F92A1', fontSize: 10, marginTop: 6, alignSelf: 'flex-end' },

  inputArea: { flexDirection: 'row', padding: 12, backgroundColor: '#1A1A2E', borderTopWidth: 1, borderTopColor: '#2D2D3A', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#2D2D3A', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, minHeight: 40 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginLeft: 12, alignSelf: 'center' },
});

export default AdminSupportScreen;
