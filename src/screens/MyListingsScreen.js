import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../theme/colors';
import client, { BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { silentError, getErrorMessage } from '../utils/errorHandler';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&q=70';

const resolveImage = (images) => {
  if (!images || images.length === 0) return PLACEHOLDER;
  const cover = images.find(i => i.is_cover) || images[0];
  const raw = cover?.image || '';
  if (!raw) return PLACEHOLDER;
  if (raw.startsWith('http')) return raw;
  const host = BASE_URL.replace('/api/v1', '');
  return `${host}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

const STATUS_COLOR = {
  active:  '#4CAF50',
  paused:  '#FF9800',
  sold:    '#2196F3',
  deleted: '#F44336',
};

const MyListingsScreen = ({ navigation }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ── Custom confirm modal (replaces Alert.alert) ──
  const [confirmModal, setConfirmModal] = useState({ visible: false, item: null });

  const fetchMyListings = async () => {
    try {
      const { data } = await client.get('/listings/my/', { params: { _t: Date.now() } });
      const raw = Array.isArray(data) ? data : (data.results ?? []);
      setListings(raw);
    } catch (err) {
      silentError(err, 'MyListings fetch');
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMyListings().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyListings();
    setRefreshing(false);
  };

  // Step 1: Show confirm modal
  const askDelete = (item) => {
    setConfirmModal({ visible: true, item });
  };

  // Step 2: Actually delete after user confirms
  const executeDelete = async () => {
    const item = confirmModal.item;
    setConfirmModal({ visible: false, item: null });
    if (!item) return;

    setDeletingId(item.id);
    try {
      try {
        // Try dedicated endpoint first
        await client.post(`/listings/${item.id}/delete-mine/`);
      } catch {
        // Fall back to standard DELETE
        await client.delete(`/listings/${item.id}/`);
      }

      setListings(prev => prev.filter(l => l.id !== item.id));
      setResultModal({ visible: true, success: true, msg: `"${item.title}" deleted.` });
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not delete this listing. Please try again.');
      setResultModal({ visible: true, success: false, msg });
    } finally {
      setDeletingId(null);
    }
  };

  const [resultModal, setResultModal] = useState({ visible: false, success: true, msg: '' });

  const renderItem = ({ item }) => {
    const imageUri = resolveImage(item.images);
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.itemWrapper}>
        {/* Card — navigates to detail */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('WasteDetails', { item, isOwner: true })}
        >
          <Image source={{ uri: imageUri }} style={styles.cardImage} />
          <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || '#999') + 'DD' }]}>
            <Text style={styles.statusText}>{(item.status || 'active').toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardPrice}>Rs. {parseFloat(item.price_per_kg || 0).toLocaleString()} / kg</Text>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="weight-kilogram" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.quantity_kg} kg</Text>
              <Ionicons name="location-outline" size={12} color={Colors.textMuted} style={{ marginLeft: 8 }} />
              <Text style={styles.metaText}>{item.city || 'N/A'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── DELETE BUTTON — completely outside card, no overflow clipping ── */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => askDelete(item)}
          disabled={isDeleting}
          activeOpacity={0.7}
        >
          {isDeleting
            ? <ActivityIndicator size="small" color="#C62828" />
            : <Ionicons name="trash-outline" size={16} color="#C62828" />
          }
          <Text style={styles.deleteTxt}>{isDeleting ? 'Deleting…' : 'Delete Listing'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddWaste')} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.textMuted, marginTop: 8 }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="leaf-off" size={72} color={Colors.border} />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySub}>Post your first agricultural waste to get started!</Text>
              <TouchableOpacity style={styles.postBtn} onPress={() => navigation.navigate('AddWaste')}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
                <Text style={styles.postBtnText}>Add Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── Confirm Delete Modal ── */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal({ visible: false, item: null })}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Ionicons name="trash-outline" size={40} color="#E53935" style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Delete Listing?</Text>
            <Text style={styles.modalMsg}>
              Are you sure you want to delete{'\n'}
              <Text style={{ fontWeight: '700' }}>"{confirmModal.item?.title}"</Text>?
              {'\n'}This cannot be undone.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setConfirmModal({ visible: false, item: null })}
              >
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={executeDelete}
              >
                <Text style={styles.confirmTxt}>Yes, Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Result Modal (success / error) ── */}
      <Modal
        visible={resultModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setResultModal({ visible: false, success: true, msg: '' })}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Ionicons
              name={resultModal.success ? 'checkmark-circle' : 'close-circle'}
              size={48}
              color={resultModal.success ? '#4CAF50' : '#E53935'}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.modalMsg}>{resultModal.msg}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: Colors.primary, width: '100%', marginTop: 16 }]}
              onPress={() => setResultModal({ visible: false, success: true, msg: '' })}
            >
              <Text style={styles.confirmTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  listContent: { padding: 16, paddingBottom: 40 },

  itemWrapper: { marginBottom: 16 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardImage: { width: '100%', height: 148, backgroundColor: '#EEE' },
  statusBadge: {
    position: 'absolute', top: 12, right: 12,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  cardInfo: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardPrice: { fontSize: 14, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textMuted },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8, paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    borderWidth: 1.5, borderColor: '#EF9A9A',
  },
  deleteTxt: { fontSize: 14, fontWeight: '700', color: '#C62828' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Modals ──
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 340, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  modalMsg: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0' },
  cancelTxt: { fontWeight: '700', color: Colors.textSecondary, fontSize: 15 },
  confirmBtn: { backgroundColor: '#E53935' },
  confirmTxt: { fontWeight: '700', color: '#fff', fontSize: 15 },
});

export default MyListingsScreen;
