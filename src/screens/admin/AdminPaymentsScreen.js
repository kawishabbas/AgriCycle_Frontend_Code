import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, Dimensions, Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';

const AdminPaymentsScreen = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const STATUS_FILTERS = ['All', 'pending', 'success', 'failed', 'refunded'];
  const STATUS_COLORS  = { pending:'#FF9800', success:'#4CAF50', failed:'#F44336', refunded:'#9C27B0' };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'All') params.status = filter;
      
      const [listRes, sumRes] = await Promise.all([
        client.get('/admin/payments/', { params }),
        client.get('/admin/payments/summary/')
      ]);
      
      setPayments(listRes.data.results || listRes.data);
      setSummary(sumRes.data);
    } catch (e) { 
      console.warn(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useFocusEffect(useCallback(() => { fetchPayments(); }, [filter]));

  const renderPayment = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
      <View style={styles.paymentHeader}>
        <View>
          <Text style={styles.transactionId}>{item.transaction_id || 'COD Payment'}</Text>
          <Text style={styles.providerText}>{(item.provider || 'unknown').toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#999') + '33' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#999' }]}>{(item.status || 'pending').toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.paymentMeta}>
        <View>
          <Text style={styles.metaLabel}>Order</Text>
          <Text style={styles.metaText} numberOfLines={1}>{item.order_title}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.metaLabel}>Amount</Text>
          <Text style={styles.amountText}>Rs {parseFloat(item.amount).toLocaleString()}</Text>
        </View>
      </View>
      
      <View style={styles.footerRow}>
        <Text style={styles.metaLabel}>Buyer: {item.buyer_name}</Text>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments & Transactions</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>Rs {summary?.total_revenue?.toLocaleString() || 0}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#F4433622' }]}>
          <Text style={styles.summaryLabel}>Failed</Text>
          <Text style={[styles.summaryValue, { color: '#F44336' }]}>{summary?.failed_count || 0}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#9C27B022' }]}>
          <Text style={styles.summaryLabel}>Refunded</Text>
          <Text style={[styles.summaryValue, { color: '#9C27B0' }]}>Rs {summary?.refunded_amount?.toLocaleString() || 0}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity key={s} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator size="large" color="#4CAF50" style={{ flex: 1 }} /> : (
        <FlatList data={payments} keyExtractor={i => i.id.toString()} renderItem={renderPayment}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No payments found.</Text>}
        />
      )}

      {selected && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Payment Details</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                {[
                  ['Transaction ID', selected.transaction_id || 'N/A'],
                  ['Provider', (selected.provider || 'unknown').toUpperCase()],
                  ['Amount', `Rs ${parseFloat(selected.amount).toLocaleString()}`],
                  ['Status', (selected.status || 'pending').toUpperCase()],
                  ['Order', selected.order_title],
                  ['Buyer', selected.buyer_name],
                  ['Date', new Date(selected.created_at).toLocaleString()],
                ].map(([l, v]) => (
                  <View key={l} style={styles.row}><Text style={styles.rowLabel}>{l}</Text><Text style={styles.rowVal}>{v}</Text></View>
                ))}
              </ScrollView>
            </View>
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
  summaryContainer: { flexDirection: 'row', padding: 16, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#4CAF5022', padding: 12, borderRadius: 10, alignItems: 'center' },
  summaryLabel: { color: '#8F92A1', fontSize: 11, marginBottom: 4 },
  summaryValue: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },
  filterBar: { maxHeight: 44, backgroundColor: '#1A1A2E', paddingVertical: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#2D2D3A', marginRight: 8 },
  chipActive: { backgroundColor: '#4CAF50' },
  chipText: { color: '#8F92A1', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 12, padding: 16, marginBottom: 10 },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  transactionId: { color: '#fff', fontSize: 14, fontWeight: '600' },
  providerText: { color: '#8F92A1', fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  paymentMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#2D2D3A', padding: 10, borderRadius: 8 },
  metaLabel: { color: '#8F92A1', fontSize: 11 },
  metaText: { color: '#fff', fontSize: 13, fontWeight: '500', marginTop: 2 },
  amountText: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { color: '#8F92A1', fontSize: 11 },
  empty: { color: '#8F92A1', textAlign: 'center', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1A1A2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2D2D3A' },
  rowLabel: { color: '#8F92A1', fontSize: 13 },
  rowVal: { color: '#fff', fontSize: 14, flex: 1, textAlign: 'right', fontWeight: '500' },
});

export default AdminPaymentsScreen;
