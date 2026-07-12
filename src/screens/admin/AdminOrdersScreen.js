import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, ScrollView, RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { silentError, showError } from '../../utils/errorHandler';

const STATUSES = ['All', 'pending', 'confirmed', 'in_transit', 'delivered', 'cancelled', 'disputed'];

const AdminOrdersScreen = () => {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusF, setStatusF]       = useState('All');
  const [selected, setSelected]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const fetchOrders = useCallback(async (reset = false) => {
    try {
      const url = statusF !== 'All'
        ? `/admin/orders/?status=${statusF}`
        : `/admin/orders/`;
      const { data } = await client.get(url);
      setOrders(data.results || data);
    } catch (e) {
      silentError(e, 'Fetch admin orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusF]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchOrders(); }, [statusF]));

  const updateStatus = async (orderId, newStatus) => {
    try {
      await client.post(`/admin/orders/${orderId}/update_status/`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setSelected(prev => ({ ...prev, status: newStatus }));
    } catch (e) {
      showError(e, 'Error', 'Failed to update order status');
    }
  };

  const executeCancel = async (orderId) => {
    try {
      await client.post(`/admin/orders/${orderId}/cancel/`, { reason: 'Cancelled by admin' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      setSelected(prev => ({ ...prev, status: 'cancelled' }));
      setConfirmCancel(false);
    } catch (e) {
      showError(e, 'Error', 'Failed to cancel order');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      confirmed: '#3B82F6',
      in_transit: '#8B5CF6',
      delivered: '#10B981',
      cancelled: '#EF4444',
      disputed: '#EC4899',
    };
    return colors[status] || '#6B7280';
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => { setSelected(item); setConfirmCancel(false); }}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.partiesRow}>
        <View style={styles.partyBox}>
          <Text style={styles.partyLabel}>Buyer</Text>
          <Text style={styles.partyName} numberOfLines={1}>{item.buyer_name}</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right-thick" size={16} color="#4B5563" />
        <View style={[styles.partyBox, { alignItems: 'flex-end' }]}>
          <Text style={styles.partyLabel}>Seller</Text>
          <Text style={styles.partyName} numberOfLines={1}>{item.seller_name}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.listing_title}</Text>
        <Text style={styles.amount}>Rs. {parseFloat(item.total_amount).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management</Text>
        <Text style={styles.headerCount}>{orders.length} Orders</Text>
      </View>

      {/* Filter chips — fixed height prevents FlatList from overlapping */}
      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6, gap: 8 }}
        >
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, statusF === s && styles.filterChipActive]}
              onPress={() => setStatusF(s)}
            >
              <Text style={[styles.filterChipText, statusF === s && styles.filterChipTextActive]}>
                {s === 'All' ? 'All Orders' : s.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={i => i.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No orders found.</Text>}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
        />
      )}

      {/* Detail Modal */}
      {selected && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Order #{selected.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selected.status), alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Text style={styles.statusText}>{selected.status.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {[
                  ['Item', selected.listing_title],
                  ['Type', selected.listing_waste_type],
                  ['Quantity', `${selected.quantity_kg} kg`],
                  ['Price/kg', `Rs. ${selected.price_per_kg}`],
                  ['Total Amount', `Rs. ${parseFloat(selected.total_amount).toLocaleString()}`],
                  ['Buyer', selected.buyer_name],
                  ['Seller', selected.seller_name],
                  ['Created', new Date(selected.created_at).toLocaleString()],
                ].map(([label, val]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailVal}>{String(val)}</Text>
                  </View>
                ))}

                {/* Change Status Section */}
                <Text style={styles.sectionTitle}>Change Status</Text>
                <View style={styles.statusGrid}>
                  {['pending', 'confirmed', 'in_transit', 'delivered', 'disputed'].map(st => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusBtn,
                        selected.status === st && styles.statusBtnActive,
                        { borderColor: getStatusColor(st) }
                      ]}
                      onPress={() => updateStatus(selected.id, st)}
                      disabled={selected.status === st}
                    >
                      <Text style={[
                        styles.statusBtnText,
                        { color: getStatusColor(st) },
                        selected.status === st && styles.statusBtnTextActive
                      ]}>
                        {st.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Cancel Order — inline confirmation, no Alert popup */}
                {selected.status !== 'cancelled' && (
                  confirmCancel ? (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmText}>Cancel this order permanently?</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity
                          style={[styles.confirmBtn, { backgroundColor: '#EF4444' }]}
                          onPress={() => executeCancel(selected.id)}
                        >
                          <Text style={styles.confirmBtnText}>Yes, Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.confirmBtn, { backgroundColor: '#374151' }]}
                          onPress={() => setConfirmCancel(false)}
                        >
                          <Text style={styles.confirmBtnText}>Go Back</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.cancelOrderBtn} onPress={() => setConfirmCancel(true)}>
                      <MaterialCommunityIcons name="cancel" size={16} color="#fff" />
                      <Text style={styles.cancelOrderBtnText}>Cancel This Order</Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0D14' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#0A0D14'
  },
  headerTitle: { color: '#F9FAFB', fontSize: 24, fontFamily: 'Poppins_700Bold' },
  headerCount: { color: '#9CA3AF', fontSize: 13, fontFamily: 'Poppins_500Medium' },

  filterRow: {
    height: 52,          // explicit height — this is what tells flex where to stop
    marginBottom: 4,
  },

  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#151A24', borderWidth: 1, borderColor: '#1F2937', marginRight: 8
  },
  filterChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  filterChipText: { color: '#9CA3AF', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  filterChipTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: '#151A24', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#1F2937'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { color: '#F9FAFB', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#FFF', fontSize: 10, fontFamily: 'Poppins_700Bold' },

  partiesRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0A0D14', padding: 12, borderRadius: 8, marginBottom: 12
  },
  partyBox: { flex: 1 },
  partyLabel: { color: '#6B7280', fontSize: 11, fontFamily: 'Poppins_500Medium' },
  partyName: { color: '#E5E7EB', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 12
  },
  itemTitle: { color: '#9CA3AF', fontSize: 13, flex: 1, fontFamily: 'Poppins_500Medium' },
  amount: { color: '#10B981', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 40, fontFamily: 'Poppins_500Medium' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#151A24', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%', padding: 24
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20
  },
  modalTitle: { color: '#F9FAFB', fontSize: 22, fontFamily: 'Poppins_700Bold' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center'
  },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F2937'
  },
  detailLabel: { color: '#9CA3AF', fontSize: 13, fontFamily: 'Poppins_500Medium' },
  detailVal: { color: '#E5E7EB', fontSize: 13, fontFamily: 'Poppins_600SemiBold', maxWidth: '60%', textAlign: 'right' },

  sectionTitle: { color: '#F9FAFB', fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 24, marginBottom: 12 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, backgroundColor: 'transparent'
  },
  statusBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  statusBtnText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  statusBtnTextActive: { color: '#10B981' },

  confirmRow: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginTop: 24
  },
  confirmText: { color: '#F9FAFB', fontSize: 14, fontFamily: 'Poppins_500Medium' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  cancelOrderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#7F1D1D', borderWidth: 1, borderColor: '#EF4444',
    padding: 14, borderRadius: 12, marginTop: 24
  },
  cancelOrderBtnText: { color: '#FCA5A5', fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
});

export default AdminOrdersScreen;
