import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Colors from '../theme/colors';
import client from '../api/client';
import { silentError } from '../utils/errorHandler';

// ─── Stat Card ──────────────────────────────────────
const StatCard = ({ icon, label, value, bg, textColor, iconColor }) => (
  <View style={[styles.statCard, { backgroundColor: bg }]}>
    <View style={styles.statTop}>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      <Text style={[styles.statLabel, { color: iconColor }]}>{label}</Text>
    </View>
    <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
  </View>
);

// ─── Action Row ─────────────────────────────────────
const ActionRow = ({ icon, label, subtitle, bg, iconColor, badge, onPress }) => (
  <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.actionIcon, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{subtitle}</Text>
    </View>
    {badge > 0 && (
      <View style={styles.badgeCircle}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
  </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────
const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total_earnings: 0, total_listings: 0, total_orders: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const firstName = (user?.full_name || user?.name || 'there').split(' ')[0];
  const { unreadCount, refreshCount } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setStatsLoading(false);
        return;
      }
      fetchDashboardData();
    }, [user])
  );

  const fetchDashboardData = async () => {
    setStatsLoading(true);
    try {
      // Fetch stats
      const { data: statsData } = await client.get('/auth/stats/');
      setStats({
        total_earnings: statsData.total_earnings ?? 0,
        total_listings: statsData.total_listings ?? 0,
        total_orders: statsData.total_orders ?? user?.total_orders ?? 0,
      });
    } catch (err) {
      silentError(err, 'Dashboard stats');
      // Fall back to user object values
      setStats({
        total_earnings: 0,
        total_listings: 0,
        total_orders: user?.total_orders ?? 0,
      });
    }

    try {
      // Fetch recent orders
      const { data: ordersData } = await client.get('/orders/?page_size=3');
      const orders = Array.isArray(ordersData)
        ? ordersData
        : (ordersData.results || []);
      setRecentOrders(orders.slice(0, 3));
    } catch (err) {
      silentError(err, 'Dashboard orders');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim().length >= 2) {
      navigation.navigate('Waste');
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <AppHeader
        notificationCount={unreadCount}
        onNotificationPress={() => { refreshCount(); navigation?.navigate('Notifications'); }}
        hideSearch={true}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>Hello, {firstName}! 👋</Text>
          <Text style={styles.greetingSub}>
            {!user || user?.role === 'farmer'
              ? 'Ready to turn your waste into wealth?'
              : 'Find quality agricultural waste today.'}
          </Text>
        </View>

        {/* Stats Row */}
        {statsLoading ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.statsLoadingText}>Loading stats...</Text>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <StatCard
              icon="currency-inr"
              label={!user || user?.role === 'farmer' ? 'Total Earnings' : 'Total Spent'}
              value={`Rs. ${stats.total_earnings.toLocaleString()}`}
              bg={Colors.primaryBg}
              textColor={Colors.primary}
              iconColor={Colors.primary}
            />
            <StatCard
              icon="recycle"
              label={!user || user?.role === 'farmer' ? 'Waste Listed' : 'Orders Placed'}
              value={!user || user?.role === 'farmer'
                ? `${stats.total_listings} Items`
                : `${stats.total_orders} Orders`}
              bg={Colors.accentBg}
              textColor={Colors.textPrimary}
              iconColor={Colors.accent}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          {(!user || user?.role === 'farmer') && (
            <>
              <ActionRow
                icon="view-list-outline"
                label="My Listings"
                subtitle="Manage your listed agricultural waste"
                bg={Colors.primaryBg}
                iconColor={Colors.primary}
                badge={stats.total_listings > 0 ? stats.total_listings : 0}
                onPress={() => navigation.navigate('MyListings')}
              />
              <View style={styles.divider} />
            </>
          )}

          {/* Show Post New Waste to farmers AND guests */}
          {(!user || user?.role === 'farmer') && (
            <>
              <ActionRow
                icon="plus-circle-outline"
                label="Post New Waste"
                subtitle="Create a new listing for sale"
                bg={Colors.accentBg}
                iconColor={Colors.accent}
                badge={0}
                onPress={() => {
                  if (!user) {
                    navigation.navigate('AuthStack', { screen: 'CreateAccount' });
                  } else {
                    navigation.navigate('AddWaste');
                  }
                }}
              />
              <View style={styles.divider} />
            </>
          )}
          
          <ActionRow
            icon="shopping-outline"
            label={!user ? "Login to view orders" : "My Orders"}
            subtitle="Track your waste pickup orders"
            bg={Colors.lightBlueBg || '#E1F5FE'}
            iconColor={Colors.blue || '#0288D1'}
            badge={stats.total_orders > 0 ? stats.total_orders : 0}
            onPress={() => {
              if (!user) {
                navigation.navigate('AuthStack', { screen: 'Login' });
              } else {
                navigation.navigate('Orders');
              }
            }}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="recycle"
            label="Waste Market"
            subtitle="Browse available agricultural waste"
            bg={Colors.accentBg}
            iconColor={Colors.accent}
            badge={0}
            onPress={() => navigation.navigate('Waste')}
          />
          {(!user || user?.role === 'farmer') && (
            <>
              <View style={styles.divider} />
              <ActionRow
                icon="robot-outline"
                label="AI Crop Help"
                subtitle="Get AI-powered crop diagnosis"
                bg={Colors.purpleBg}
                iconColor={Colors.purple}
                badge={0}
                onPress={() => navigation.navigate('AIHelp')}
              />
            </>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            {recentOrders.length === 0 ? (
              <View style={styles.emptyActivity}>
                <MaterialCommunityIcons name="package-variant-closed" size={36} color={Colors.border} />
                <Text style={styles.emptyActivityText}>No recent orders</Text>
                <TouchableOpacity
                  style={styles.emptyActivityBtn}
                  onPress={() => navigation.navigate('Waste')}
                >
                  <Text style={styles.emptyActivityBtnText}>Browse Marketplace</Text>
                </TouchableOpacity>
              </View>
            ) : (
              recentOrders.map((item, index) => (
                <React.Fragment key={String(item.id)}>
                  <TouchableOpacity
                    style={styles.activityRow}
                    onPress={() => navigation.navigate('Orders')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.activityDot}>
                      <MaterialCommunityIcons
                        name="truck-delivery-outline"
                        size={20}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>
                        {item.listing_title || `Order #${item.id}`}
                      </Text>
                      <Text style={styles.activitySub}>
                        {item.quantity_kg} kg • Rs. {item.total_amount} • {item.status}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                  {index < recentOrders.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB – shown for farmers and guests */}
      {(!user || user?.role === 'farmer') && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            if (!user) {
              navigation.navigate('AuthStack', { screen: 'CreateAccount' });
            } else {
              navigation.navigate('AddWaste');
            }
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
  // ── Greeting ──
  greetingBlock: { paddingTop: 8 },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  greetingSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  // ── Stats Loading ──
  statsLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  statsLoadingText: { fontSize: 13, color: Colors.textMuted },
  // ── Stats ──
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, gap: 8 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 13, fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '800' },
  // ── Actions ──
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  actionIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  actionContent: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  actionSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  badgeCircle: {
    backgroundColor: Colors.badgeRed,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.separator, marginLeft: 72 },
  // ── Activity ──
  activitySection: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionLink: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyActivityText: { fontSize: 14, color: Colors.textMuted },
  emptyActivityBtn: {
    backgroundColor: Colors.primaryBg,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  emptyActivityBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  activityDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  activitySub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 24, // Changed from 90 to be closer to the base navbar
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});

export default DashboardScreen;
