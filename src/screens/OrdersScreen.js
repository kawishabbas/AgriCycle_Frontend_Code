import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors from '../theme/colors';
import client from '../api/client';
import { showError, silentError, getErrorMessage } from '../utils/errorHandler';


const STATUS_COLORS = {
  pending:    { bg: '#FFF3E0', text: '#E65100', label: 'Pending' },
  confirmed:  { bg: Colors.primaryBg, text: Colors.primary, label: 'Accepted, Awaiting Payment' },
  processing: { bg: '#E0F2F1', text: '#00796B', label: 'Paid, Awaiting Shipment' },
  delivered:  { bg: '#E3F2FD', text: '#1565C0', label: 'Delivered' },
  cancelled:  { bg: '#FFEBEE', text: '#C62828', label: 'Cancelled' },
  in_transit: { bg: '#F3E5F5', text: '#7B1FA2', label: 'In Transit' },
};

const OrderCard = ({ item, user, onPress, onMessage, onCancel, onAccept, onPay, onShip, onMarkDelivered, onRate }) => {
  const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
  const isSeller = user && String(item.seller?.id) === String(user.id);

  let statusLabel = sc.label;
  if (item.status === 'rejected') statusLabel = 'Declined by Seller';
  if (item.status === 'refunded') statusLabel = 'Refunded by Seller';
  if (item.status === 'cancelled') {
    // If we have history, use it to be precise
    if (item.status_history?.length > 0) {
      const cancelEvent = item.status_history.find(h => h.new_status === 'cancelled');
      if (cancelEvent && String(cancelEvent.changed_by?.id) === String(item.seller?.id)) {
        statusLabel = 'Declined by Seller';
      } else if (cancelEvent && String(cancelEvent.changed_by?.id) === String(item.buyer?.id)) {
        statusLabel = 'Cancelled by Buyer';
      }
    } else {
      // Fallback for optimistic updates: if current user is seller, it was likely a decline
      statusLabel = isSeller ? 'Declined by Seller' : 'Cancelled by Buyer';
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' }]}>
            <MaterialCommunityIcons name="account" size={24} color={Colors.textMuted} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.listing_title}</Text>
            <Text style={styles.cardSeller}>Order ID: #{item.id} • {isSeller ? 'Buyer' : 'Seller'}: {isSeller ? item.buyer?.full_name : item.seller?.full_name}</Text>
            <Text style={styles.cardMeta}>{item.quantity_kg} kg • Rs. {item.total_amount}</Text>
          </View>
        </View>
        <View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => onMessage && onMessage(item)}
        >
          <Ionicons name="chatbubble-outline" size={15} color={Colors.primary} />
          <Text style={styles.actionBtnText}>Message {isSeller ? 'Buyer' : 'Seller'}</Text>
        </TouchableOpacity>
        
        {item.status === 'pending' && !isSeller && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnDanger]} 
            onPress={() => onCancel && onCancel(item)}
          >
            <Ionicons name="close-circle-outline" size={15} color={Colors.badgeRed} />
            <Text style={[styles.actionBtnText, { color: Colors.badgeRed }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        {item.status === 'pending' && isSeller && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnDanger]} 
            onPress={() => onCancel && onCancel(item)}
          >
            <Ionicons name="close-circle-outline" size={15} color={Colors.badgeRed} />
            <Text style={[styles.actionBtnText, { color: Colors.badgeRed }]}>Decline</Text>
          </TouchableOpacity>
        )}

        {item.status === 'pending' && isSeller && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnPrimary]} 
            onPress={() => onAccept && onAccept(item)}
          >
            <Ionicons name="checkmark-circle-outline" size={15} color={Colors.white} />
            <Text style={[styles.actionBtnText, { color: Colors.white }]}>Accept</Text>
          </TouchableOpacity>
        )}

        {item.status === 'confirmed' && !isSeller && (
          <>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnPrimary, { marginRight: 10 }]} 
              onPress={() => onPay && onPay(item)}
            >
              <Ionicons name="card-outline" size={15} color={Colors.white} />
              <Text style={[styles.actionBtnText, { color: Colors.white }]}>Pay Now</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnDanger]} 
              onPress={() => onCancel && onCancel(item)}
            >
              <Ionicons name="close-circle-outline" size={15} color={Colors.badgeRed} />
              <Text style={[styles.actionBtnText, { color: Colors.badgeRed }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'processing' && isSeller && (
          <>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnPrimary, { marginRight: 10 }]} 
              onPress={() => onShip && onShip(item)}
            >
              <Ionicons name="car-outline" size={15} color={Colors.white} />
              <Text style={[styles.actionBtnText, { color: Colors.white }]}>Ship Order</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnDanger]} 
              onPress={() => onCancel && onCancel(item)}
            >
              <Ionicons name="close-circle-outline" size={15} color={Colors.badgeRed} />
              <Text style={[styles.actionBtnText, { color: Colors.badgeRed }]}>Cancel & Refund</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'in_transit' && !isSeller && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnPrimary]} 
            onPress={() => onMarkDelivered && onMarkDelivered(item)}
          >
            <Ionicons name="checkmark-done-circle-outline" size={15} color={Colors.white} />
            <Text style={[styles.actionBtnText, { color: Colors.white }]}>Mark Received</Text>
          </TouchableOpacity>
        )}

        {item.status === 'delivered' && !isSeller && !item.rating && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnPrimary]} 
            onPress={() => onRate && onRate(item)}
          >
            <Ionicons name="star-outline" size={15} color={Colors.white} />
            <Text style={[styles.actionBtnText, { color: Colors.white }]}>Rate Order</Text>
          </TouchableOpacity>
        )}

        {item.status === 'delivered' && !isSeller && item.rating && (
          <View style={[styles.actionBtn, { borderColor: '#E0E0E0', backgroundColor: '#F5F5F5' }]}>
            <Ionicons name="star" size={15} color="#FFB300" />
            <Text style={[styles.actionBtnText, { color: '#9E9E9E' }]}>Rated {item.rating}/5</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const OrdersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Custom Modal State for all actions
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', msg: '', confirmText: '', actionType: '' });

  // Rating Modal State
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  const tabs = ['All', 'pending', 'confirmed', 'delivered'];

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/orders/?t=${Date.now()}`); // Prevent Android caching
      setOrders(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      silentError(err, 'Fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async (order) => {
    const isSeller = user && order.seller?.id === user.id;
    const recipientId = isSeller ? order.buyer?.id : order.seller?.id;
    
    // Fallback if we don't have the ID
    if (!recipientId) {
      navigation.navigate('Chat');
      return;
    }

    // Backend requires listing_id. If listing was deleted, we can't create a new conversation.
    if (!order.listing) {
      Alert.alert('Notice', 'This listing was removed. Opening your chat list instead.');
      navigation.navigate('Chat');
      return;
    }

    try {
      const { data } = await client.post('/chat/conversations/start/', {
        listing_id: order.listing,
        recipient_id: recipientId,
      });
      navigation.navigate('Chat', {
        screen: 'ChatDetail',
        params: { conversation: data },
      });
    } catch (err) {
      showError(err, 'Error', 'Could not open conversation.');
    }
  };

  const handleCancel = (order) => {
    try {
      const isSeller = user && order.seller && String(order.seller.id || order.seller) === String(user.id);
      const isPaid = order.status === 'processing';
      
      let actionTitle = 'Cancel Order';
      let actionMsg = `Are you sure you want to CANCEL your order #${order.id}?`;
      let confirmText = 'Yes, Cancel';

      if (isSeller) {
        if (isPaid) {
          actionTitle = 'Refund & Cancel';
          actionMsg = `Are you sure you want to CANCEL order #${order.id}? The buyer has already paid, so a refund of Rs. ${order.total_amount || 0} will be automatically processed.`;
          confirmText = 'Refund & Cancel';
        } else {
          actionTitle = 'Decline Order';
          actionMsg = `Are you sure you want to DECLINE order #${order.id}? This will notify the buyer and cancel the deal.`;
          confirmText = 'Yes, Decline';
        }
      }

      setSelectedOrder(order);
      setModalConfig({ title: actionTitle, msg: actionMsg, confirmText, actionType: 'cancel' });
      setActionModalVisible(true);
    } catch (error) {
      silentError(error, 'Handle cancel UI');
    }
  };

  const handleAccept = (order) => {
    setSelectedOrder(order);
    setModalConfig({ 
      title: 'Accept Order', 
      msg: `Are you sure you want to accept order #${order.id}?`, 
      confirmText: 'Yes, Accept', 
      actionType: 'accept' 
    });
    setActionModalVisible(true);
  };

  const handlePay = (order) => {
    navigation.navigate('PaymentMethod', { order });
  };

  const handleShip = (order) => {
    setSelectedOrder(order);
    setModalConfig({ 
      title: 'Ship Order', 
      msg: `Mark order #${order.id} as In Transit?`, 
      confirmText: 'Yes, Ship', 
      actionType: 'ship' 
    });
    setActionModalVisible(true);
  };

  const handleMarkDelivered = (order) => {
    setSelectedOrder(order);
    setModalConfig({ 
      title: 'Mark Received', 
      msg: `Did you receive your order?`, 
      confirmText: 'Yes, Received', 
      actionType: 'deliver' 
    });
    setActionModalVisible(true);
  };

  const confirmAction = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    const order = selectedOrder;
    const { actionType } = modalConfig;

    try {
      if (actionType === 'cancel') {
        await client.post(`/orders/${order.id}/cancel/`, { reason: 'User requested cancellation' });
      } else if (actionType === 'accept') {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'confirmed' } : o));
        await client.patch(`/orders/${order.id}/update-status/`, { new_status: 'confirmed' });
        Alert.alert('Success', 'Order accepted successfully! You can now ship the item.');
      } else if (actionType === 'ship') {
        await client.patch(`/orders/${order.id}/update-status/`, { new_status: 'in_transit' });
        Alert.alert('Success', 'Order marked as shipped!');
      } else if (actionType === 'deliver') {
        await client.patch(`/orders/${order.id}/update-status/`, { new_status: 'delivered' });
        Alert.alert('Success', 'Order marked as received!');
      }

      setActionModalVisible(false);
      setActionLoading(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      setActionLoading(false);
      fetchOrders();
      showError(err, 'Error', 'Could not process this request. Please try again.');
    }
  };

  const handleRate = (order) => {
    setSelectedOrder(order);
    setRatingValue(0);
    setRatingComment('');
    setRatingModalVisible(true);
  };

  const submitRating = async () => {
    if (!selectedOrder) return;
    if (ratingValue === 0) {
      Alert.alert('Error', 'Please select a star rating first.');
      return;
    }

    setActionLoading(true);
    try {
      await client.post(`/orders/${selectedOrder.id}/review/`, { 
        rating: ratingValue,
        review: ratingComment
      });
      Alert.alert('Success', 'Thank you for your review!');
      setRatingModalVisible(false);
      setActionLoading(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      setActionLoading(false);
      showError(err, 'Error', 'Could not submit your review. Please try again.');
    }
  };

  const filtered =
    activeTab === 'All' ? orders : orders.filter((o) => o.status === activeTab);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{orders.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'All' ? 'All' : STATUS_COLORS[t]?.label || t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <OrderCard
            item={item}
            user={user}
            onPress={() => {}}
            onMessage={handleMessage}
            onCancel={handleCancel}
            onAccept={handleAccept}
            onPay={handlePay}
            onShip={handleShip}
            onMarkDelivered={handleMarkDelivered}
            onRate={handleRate}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="package-variant" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />
      )}

      {/* Generic Action Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={actionModalVisible}
        onRequestClose={() => {
          if (!actionLoading) setActionModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons 
                name={modalConfig.actionType === 'cancel' ? "warning-outline" : "information-circle-outline"} 
                size={28} 
                color={modalConfig.actionType === 'cancel' ? Colors.badgeRed : Colors.primary} 
              />
              <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            </View>
            
            <Text style={styles.modalMessage}>{modalConfig.msg}</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setActionModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalBtnCancelText}>Go Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalBtn, 
                  styles.modalBtnConfirm, 
                  modalConfig.actionType !== 'cancel' && { backgroundColor: Colors.primary }
                ]} 
                onPress={confirmAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>{modalConfig.confirmText}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={ratingModalVisible}
        onRequestClose={() => {
          if (!actionLoading) setRatingModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Rate Seller</Text>
            <Text style={[styles.modalMessage, { marginBottom: 15 }]}>
              How was your experience with {selectedOrder?.seller?.full_name}?
            </Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                  <Ionicons 
                    name={star <= ratingValue ? "star" : "star-outline"} 
                    size={40} 
                    color={star <= ratingValue ? "#FFB300" : Colors.border} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setRatingModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnConfirm, { backgroundColor: Colors.primary }]} 
                onPress={submitRating}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 60 },
  loadingText: { fontSize: 14, color: Colors.textSecondary },
  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerBadge: {
    backgroundColor: Colors.badgeRed,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  // ── Tabs ──
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  // ── List ──
  listContent: { padding: 14, gap: 12 },
  // ── Card ──
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: { flexDirection: 'row', gap: 10, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.border },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardSeller: { fontSize: 12, color: Colors.textSecondary },
  cardMeta: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-end',
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 11, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
  // ── Actions ──
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  actionBtnDanger: { borderColor: Colors.badgeRed },
  actionBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  // ── Empty ──
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted, fontWeight: '500' },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.badgeRed,
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
});

export default OrdersScreen;
