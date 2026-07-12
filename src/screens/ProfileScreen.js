import React, { useCallback,  useState, useEffect  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import Colors from '../theme/colors';
import client from '../api/client';

// ─── Stat Card ───────────────────────────────────────
const StatCard = ({ icon, value, label, iconBg, iconColor }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconCircle, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value ?? '—'}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Edit Profile Modal ──────────────────────────────
const EditProfileModal = ({ visible, user, onClose, onSave, saving }) => {
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  // Sync when user prop changes (e.g., after auth context refresh)
  useEffect(() => {
    setFullName(user?.full_name ?? '');
    setCity(user?.city ?? '');
    setBio(user?.bio ?? '');
  }, [user, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit Profile</Text>

          <Text style={styles.modalLabel}>Full Name</Text>
          <TextInput
            style={styles.modalInput}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.modalLabel}>City</Text>
          <TextInput
            style={styles.modalInput}
            value={city}
            onChangeText={setCity}
            placeholder="Your city"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.modalLabel}>Bio</Text>
          <TextInput
            style={[styles.modalInput, { minHeight: 70 }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself..."
            placeholderTextColor={Colors.textMuted}
            multiline
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={() => onSave({ full_name: fullName, city, bio })}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ─────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateProfile } = useAuth();
  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    total_earnings: 0,
    total_listings: 0,
    total_orders: user?.total_orders ?? 0,
    rating: parseFloat(user?.rating ?? 0),
  });

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchStats();
      } else {
        setStatsLoading(false);
      }
    }, [user])
  );

  if (!user) {
    return (
      <View style={[styles.root, { backgroundColor: '#F7F9FC' }]}>
        <AppHeader hideSearch />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <MaterialCommunityIcons name="account-circle-outline" size={80} color={Colors.textMuted} />
          <Text style={{ fontSize: 22, fontFamily: 'Poppins_700Bold', color: Colors.textPrimary, marginTop: 16 }}>
            Welcome to AgriCycle!
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 32 }}>
            Log in or create an account to start buying, selling, and tracking agricultural waste.
          </Text>
          
          <TouchableOpacity 
            style={{ backgroundColor: Colors.primary, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 }} 
            onPress={() => navigation.navigate('AuthStack', { screen: 'Login' })}
          >
            <Text style={{ color: '#FFF', fontFamily: 'Poppins_600SemiBold', fontSize: 16 }}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ backgroundColor: '#FFF', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary }} 
            onPress={() => navigation.navigate('AuthStack', { screen: 'CreateAccount' })}
          >
            <Text style={{ color: Colors.primary, fontFamily: 'Poppins_600SemiBold', fontSize: 16 }}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const fetchStats = async () => {
    try {
      const { data } = await client.get('/auth/stats/');
      setStats({
        total_earnings: data.total_earnings ?? 0,
        total_listings: data.total_listings ?? 0,
        total_orders: data.total_orders ?? user?.total_orders ?? 0,
        rating: data.rating ?? parseFloat(user?.rating ?? 0),
      });
    } catch (err) {
      console.warn('Could not fetch dashboard stats:', err?.message);
      // Fall back to user object values
      setStats({
        total_earnings: 0,
        total_listings: 0,
        total_orders: user?.total_orders ?? 0,
        rating: parseFloat(user?.rating ?? 0),
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSave = async (profileData) => {
    setSaving(true);
    try {
      await updateProfile(profileData);
      setEditVisible(false);
      Alert.alert('Saved', 'Profile updated successfully!');
    } catch (err) {
      Alert.alert('Update Failed', typeof err === 'string' ? err : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    navigation.navigate('Logout');
  };

  const handleWithdraw = () => {
    if (stats.total_earnings <= 0) {
      Alert.alert('No Earnings', 'You have no earnings to withdraw yet.');
      return;
    }
    Alert.alert(
      'Withdraw Funds',
      `Withdraw Rs. ${stats.total_earnings.toLocaleString()} to your bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => Alert.alert('Success', 'Withdrawal request submitted!'),
        },
      ],
    );
  };

  const isFarmer = user?.role === 'farmer';

  const menuItems = [
    // Farmers only: My Listings
    ...(isFarmer ? [{
      icon: 'format-list-bulleted',
      label: 'My Listings',
      sub: 'View and manage your waste items',
      onPress: () => navigation.navigate('MyListings'),
    }] : []),

    // Everyone: Saved Listings, My Orders
    {
      icon: 'heart-outline',
      label: 'Saved Listings',
      sub: 'View your favorite waste items',
      onPress: () => navigation.navigate('SavedListings'),
    },
    {
      icon: 'shopping-outline',
      label: 'My Orders',
      sub: isFarmer ? 'View orders from buyers' : 'Track your purchases',
      onPress: () => navigation.navigate('Orders'),
    },

    // Farmers only: AI Help
    ...(isFarmer ? [{
      icon: 'robot-outline',
      label: 'AI Crop Help',
      sub: 'Get AI-powered crop diagnosis',
      onPress: () => navigation.navigate('AIHelp', { screen: 'AIHelpMain' }),
    }] : []),

    // Everyone: Payment History
    {
      icon: 'credit-card-clock-outline',
      label: 'Payment History',
      sub: 'View past transactions',
      onPress: () => navigation.navigate('PaymentHistory'),
    },

    // Everyone: Notifications, Privacy, Help, Logout
    {
      icon: 'bell-outline',
      label: 'Notifications',
      sub: 'Manage your alerts',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      icon: 'lock-outline',
      label: 'Privacy & Security',
      sub: 'Account security settings',
      onPress: () => navigation.navigate('PrivacySecurity'),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      sub: 'FAQs and contact us',
      onPress: () => navigation.navigate('HelpSupport'),
    },
    {
      icon: 'logout',
      label: 'Logout',
      sub: 'Sign out of your account',
      onPress: handleLogout,
      danger: true,
    },
  ];

  // Avatar: use uploaded avatar or a generated one from user initials API
  const avatarUri = user?.avatar_url
    || user?.avatar
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=1C9E4D&color=fff&size=200`;

  return (
    <View style={styles.root}>
      <AppHeader hideSearch={true} />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Green Profile Header */}
        <View style={styles.profileHeader}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name || 'Guest User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'guest@agricycle.pk'}</Text>
            {(user?.city || user?.address) ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={Colors.white} />
                <Text style={styles.profileLocation}>{user?.city || user?.address}</Text>
              </View>
            ) : null}
            {user?.role ? (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditVisible(true)} activeOpacity={0.8}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {statsLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ flex: 1, paddingVertical: 20 }} />
          ) : (
            <>
              <StatCard
                icon="shopping-outline"
                value={stats.total_orders}
                label="Orders"
                iconBg={Colors.primaryBg}
                iconColor={Colors.primary}
              />
              <View style={styles.statDivider} />
              <StatCard
                icon="sprout-outline"
                value={stats.total_listings}
                label="Listed"
                iconBg={Colors.blueBg}
                iconColor={Colors.blue}
              />
              <View style={styles.statDivider} />
              <StatCard
                icon="star-outline"
                value={stats.rating > 0 ? stats.rating.toFixed(1) : '—'}
                label="Rating"
                iconBg={Colors.accentBg}
                iconColor={Colors.accent}
              />
            </>
          )}
        </View>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsLeft}>
            <Text style={styles.earningsLabel}>
              {user?.role === 'farmer' ? 'Total Earnings' : 'Total Spent'}
            </Text>
            <Text style={styles.earningsValue}>
              {statsLoading ? '...' : `Rs. ${stats.total_earnings.toLocaleString()}`}
            </Text>
            <Text style={styles.earningsSub}>
              {user?.role === 'farmer' ? 'From waste sales' : 'On waste purchases'}
            </Text>
          </View>
          {user?.role === 'farmer' && (
            <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw} activeOpacity={0.85}>
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu Items */}
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.menuRow}
            onPress={item.onPress}
            activeOpacity={0.75}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.danger ? '#FFEBEE' : Colors.background }]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={20}
                color={item.danger ? Colors.badgeRed : Colors.textSecondary}
              />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, item.danger && { color: Colors.badgeRed }]}>
                {item.label}
              </Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editVisible}
        user={user}
        onClose={() => setEditVisible(false)}
        onSave={handleSave}
        saving={saving}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 30, gap: 12 },
  // ── Profile Header ──
  profileHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.white,
    backgroundColor: Colors.border,
  },
  profileInfo: { alignItems: 'center', gap: 3 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.white },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  profileLocation: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  roleBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  roleBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  editBtn: {
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 10,
  },
  editBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 12,
    borderRadius: 14,
    paddingVertical: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statCard: { flex: 1, alignItems: 'center', gap: 6 },
  statIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 6 },
  // ── Earnings ──
  earningsCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 12,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earningsLeft: { gap: 2 },
  earningsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  earningsValue: { fontSize: 24, fontWeight: '800', color: Colors.white },
  earningsSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  withdrawBtn: { backgroundColor: Colors.white, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 10 },
  withdrawBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  // ── Menu ──
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  menuIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  menuSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 10,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  modalInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});

export default ProfileScreen;
