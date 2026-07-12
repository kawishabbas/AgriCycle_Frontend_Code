import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Modal, ScrollView, RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { silentError, showError } from '../../utils/errorHandler';

const ROLES = ['All', 'farmer', 'buyer', 'admin'];

const AdminUserManagementScreen = () => {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [role, setRole]             = useState('All');
  const [selected, setSelected]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchUsers = useCallback(async (reset = false) => {
    try {
      const roleFilter = role !== 'All' ? `&role=${role}` : '';
      const { data } = await client.get(
        `/admin/users/?search=${search}&page_size=50${roleFilter}`
      );
      setUsers(data.results || data);
    } catch (e) {
      silentError(e, 'Fetch admin users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, role]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(true);
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchUsers(true);
  }, [search, role]));

  // ─── Actions: tap fires instantly, no Alert behind Modal ───────────────────
  const handleAction = async (userId, action, label) => {
    try {
      await client.post(`/admin/users/${userId}/${action}/`);

      const applyChanges = (u) => {
        if (!u || u.id !== userId) return u;
        if (action === 'suspend')  return { ...u, is_active: false };
        if (action === 'activate') return { ...u, is_active: true };
        if (action === 'verify')   return { ...u, is_verified: true };
        return u;
      };

      setUsers(prev => prev.map(applyChanges));
      setSelected(prev => applyChanges(prev));
    } catch (e) {
      showError(e, 'Error', `Failed to ${label}. Please try again.`);
    }
  };

  // ─── Delete: inline confirm inside modal — no Alert popup ──────────────────
  const executeDelete = async (userId) => {
    try {
      await client.delete(`/admin/users/${userId}/`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelected(null);
      setConfirmDelete(false);
    } catch (e) {
      showError(e, 'Error', 'Failed to delete user.');
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => { setSelected(item); setConfirmDelete(false); }}
      activeOpacity={0.85}
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{item.full_name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, styles[`role_${item.role}`] || styles.role_buyer]}>
            <Text style={styles.badgeText}>{(item.role || 'user').toUpperCase()}</Text>
          </View>
          {item.is_verified && (
            <View style={[styles.badge, styles.badge_verified]}>
              <Text style={styles.badgeText}>✓ VERIFIED</Text>
            </View>
          )}
          {!item.is_active && (
            <View style={[styles.badge, styles.badge_suspended]}>
              <Text style={styles.badgeText}>SUSPENDED</Text>
            </View>
          )}
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#374151" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerCount}>{users.length} Users</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or email..."
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role Filter — fixed height prevents the list from overlapping */}
      <View style={{ height: 52, marginBottom: 4 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6, gap: 8 }}
        >
          {ROLES.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, role === r && styles.chipActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.chipText, role === r && styles.chipTextActive]}>
                {r === 'All' ? 'All Roles' : r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={i => i.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
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

      {/* User Detail Modal */}
      {selected && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalAvatarCircle}>
                    <Text style={styles.modalAvatarText}>
                      {selected.full_name?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selected.full_name}</Text>
                    <Text style={styles.modalEmail}>{selected.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* User Details */}
                {[
                  ['Phone',   selected.phone_number || '—'],
                  ['CNIC',    selected.cnic || '—'],
                  ['City',    selected.city || '—'],
                  ['Role',    selected.role || '—'],
                  ['Joined',  new Date(selected.date_joined).toLocaleDateString()],
                  ['Orders',  String(selected.total_orders ?? 0)],
                  ['Rating',  selected.rating ? `${selected.rating} ★` : '—'],
                  ['Status',  selected.is_active ? '✓ Active' : '✗ Suspended'],
                  ['Verified', selected.is_verified ? '✓ Verified' : 'Not Verified'],
                ].map(([label, val]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailVal}>{val}</Text>
                  </View>
                ))}

                {/* Action Buttons */}
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.actionsGrid}>
                  {/* Suspend / Activate */}
                  {selected.is_active ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#92400E', borderColor: '#F59E0B' }]}
                      onPress={() => handleAction(selected.id, 'suspend', 'Suspend')}
                    >
                      <MaterialCommunityIcons name="account-off" size={16} color="#FCD34D" />
                      <Text style={[styles.actionBtnText, { color: '#FCD34D' }]}>Suspend</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#064E3B', borderColor: '#10B981' }]}
                      onPress={() => handleAction(selected.id, 'activate', 'Activate')}
                    >
                      <MaterialCommunityIcons name="account-check" size={16} color="#6EE7B7" />
                      <Text style={[styles.actionBtnText, { color: '#6EE7B7' }]}>Activate</Text>
                    </TouchableOpacity>
                  )}

                  {/* Verify */}
                  {!selected.is_verified && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' }]}
                      onPress={() => handleAction(selected.id, 'verify', 'Verify')}
                    >
                      <MaterialCommunityIcons name="check-decagram" size={16} color="#93C5FD" />
                      <Text style={[styles.actionBtnText, { color: '#93C5FD' }]}>Verify</Text>
                    </TouchableOpacity>
                  )}

                  {/* Reset Password */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#3B0764', borderColor: '#8B5CF6' }]}
                    onPress={() => handleAction(selected.id, 'reset_password', 'Reset Password')}
                  >
                    <MaterialCommunityIcons name="lock-reset" size={16} color="#C4B5FD" />
                    <Text style={[styles.actionBtnText, { color: '#C4B5FD' }]}>Reset Password</Text>
                  </TouchableOpacity>
                </View>

                {/* Delete — inline confirm, no Alert popup */}
                {confirmDelete ? (
                  <View style={styles.deleteConfirm}>
                    <Text style={styles.deleteConfirmText}>
                      ⚠️  Permanently delete {selected.full_name}? This cannot be undone.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => executeDelete(selected.id)}
                      >
                        <Text style={styles.confirmBtnText}>Yes, Delete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: '#374151' }]}
                        onPress={() => setConfirmDelete(false)}
                      >
                        <Text style={styles.confirmBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => setConfirmDelete(true)}
                  >
                    <MaterialCommunityIcons name="delete-forever" size={18} color="#FCA5A5" />
                    <Text style={styles.deleteBtnText}>Delete Account</Text>
                  </TouchableOpacity>
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
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 12
  },
  headerTitle: { color: '#F9FAFB', fontSize: 24, fontFamily: 'Poppins_700Bold' },
  headerCount: { color: '#9CA3AF', fontSize: 13, fontFamily: 'Poppins_500Medium' },

  searchRow: { paddingHorizontal: 20, paddingBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#151A24',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    gap: 8, borderWidth: 1, borderColor: '#1F2937'
  },
  searchInput: { flex: 1, color: '#F9FAFB', fontSize: 14, fontFamily: 'Poppins_400Regular' },

  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#151A24', borderWidth: 1, borderColor: '#1F2937', marginRight: 8
  },
  chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipText: { color: '#9CA3AF', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  chipTextActive: { color: '#FFFFFF' },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#151A24',
    borderRadius: 16, padding: 16, marginBottom: 10,
    gap: 12, borderWidth: 1, borderColor: '#1F2937'
  },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center', alignItems: 'center'
  },
  avatarText: { color: '#10B981', fontSize: 20, fontFamily: 'Poppins_700Bold' },
  userInfo: { flex: 1 },
  name: { color: '#F9FAFB', fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  email: { color: '#9CA3AF', fontSize: 12, fontFamily: 'Poppins_400Regular', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  badgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Poppins_700Bold' },
  role_farmer:   { backgroundColor: '#065F46' },
  role_buyer:    { backgroundColor: '#1E3A5F' },
  role_admin:    { backgroundColor: '#4C1D95' },
  badge_verified:  { backgroundColor: 'rgba(59, 130, 246, 0.5)' },
  badge_suspended: { backgroundColor: 'rgba(239, 68, 68, 0.5)' },

  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 40, fontFamily: 'Poppins_500Medium' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#151A24', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%', padding: 24
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  modalAvatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center'
  },
  modalAvatarText: { color: '#10B981', fontSize: 24, fontFamily: 'Poppins_700Bold' },
  modalTitle: { color: '#F9FAFB', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  modalEmail: { color: '#9CA3AF', fontSize: 12, fontFamily: 'Poppins_400Regular' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center'
  },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#1F2937'
  },
  detailLabel: { color: '#9CA3AF', fontSize: 13, fontFamily: 'Poppins_500Medium' },
  detailVal: { color: '#E5E7EB', fontSize: 13, fontFamily: 'Poppins_600SemiBold', maxWidth: '60%', textAlign: 'right' },

  sectionTitle: { color: '#F9FAFB', fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 24, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, borderWidth: 1
  },
  actionBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#7F1D1D', borderWidth: 1, borderColor: '#EF4444',
    padding: 14, borderRadius: 12, marginTop: 24, marginBottom: 8
  },
  deleteBtnText: { color: '#FCA5A5', fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  deleteConfirm: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 16,
    marginTop: 24, marginBottom: 8, borderWidth: 1, borderColor: '#EF4444'
  },
  deleteConfirmText: { color: '#F9FAFB', fontSize: 13, fontFamily: 'Poppins_500Medium', lineHeight: 20 },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
});

export default AdminUserManagementScreen;
