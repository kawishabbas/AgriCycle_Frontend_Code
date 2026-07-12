import React, { useCallback,  useState, useRef  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Dimensions, TouchableOpacity,
  Animated, StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { silentError } from '../../utils/errorHandler';

const { width } = Dimensions.get('window');

const StatCard = ({ title, value, icon, color, subtitle, animValue }) => (
  <Animated.View style={[
    styles.card, 
    { 
      borderBottomColor: color, borderBottomWidth: 3,
      opacity: animValue,
      transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
    }
  ]}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}1A` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      {subtitle ? <Text style={[styles.cardSubtitle, { color }]}>{subtitle}</Text> : null}
    </View>
    <View style={styles.cardInfo}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  </Animated.View>
);

const AdminDashboardScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('week');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchStats = async () => {
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        client.get('/admin/dashboard/stats/'),
        client.get(`/admin/analytics/?timeframe=${timeframe}`)
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      silentError(err, 'Admin dashboard stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  };

  useFocusEffect(useCallback(() => { fetchStats(); }, [timeframe]));
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0D14" />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Initializing Workspace...</Text>
      </View>
    );
  }

  const formatLabel = (dateStr) => {
    const d = new Date(dateStr);
    if (timeframe === 'year') {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months[d.getMonth()];
    }
    return `${d.getDate()}/${d.getMonth()+1}`;
  };

  const revenueTrend = analytics?.revenue_trend || [];
  const revenueData = revenueTrend.length ? revenueTrend.map(r => r.total) : [0];
  const revenueLabels = revenueTrend.length ? revenueTrend.map(r => formatLabel(r.date)) : ['—'];

  const userTrend = analytics?.user_growth || [];
  const userGrowth = userTrend.length ? userTrend.map(r => r.count) : [0];
  const growthLabels = userTrend.length ? userTrend.map(r => formatLabel(r.date)) : ['—'];

  const chartConfig = {
    backgroundGradientFrom: '#151A24',
    backgroundGradientTo: '#151A24',
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#0A0D14'
    }
  };

  const revenueConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0D14" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Overview</Text>
          <Text style={styles.headerTitle}>AgriCycle Admin</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialCommunityIcons name="logout-variant" size={20} color="#F87171" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* Key Metrics */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.grid}>
            <StatCard
              animValue={fadeAnim}
              title="Total Users" icon="account-multiple"
              value={stats?.users?.total ?? '—'} color="#10B981"
              subtitle={`+${stats?.users?.new_last_30_days ?? 0}`}
            />
            <StatCard
              animValue={fadeAnim}
              title="Active Listings" icon="clipboard-list"
              value={stats?.listings?.active ?? '—'} color="#3B82F6"
            />
            <StatCard
              animValue={fadeAnim}
              title="Total Orders" icon="cart-outline"
              value={stats?.orders?.total ?? '—'} color="#F59E0B"
            />
            <StatCard
              animValue={fadeAnim}
              title="Delivered Orders" icon="truck-check-outline"
              value={stats?.orders?.delivered ?? '—'} color="#10B981"
            />
            <StatCard
              animValue={fadeAnim}
              title="Cancelled (Buyer)" icon="cancel"
              value={stats?.orders?.cancelled_by_buyer ?? '—'} color="#EF4444"
            />
            <StatCard
              animValue={fadeAnim}
              title="Cancelled (Seller)" icon="cancel"
              value={stats?.orders?.cancelled_by_seller ?? '—'} color="#F59E0B"
            />
            <StatCard
              animValue={fadeAnim}
              title="Cancelled (Admin)" icon="cancel"
              value={stats?.orders?.cancelled_by_admin ?? '—'} color="#EC4899"
            />
            <StatCard
              animValue={fadeAnim}
              title="Revenue (PKR)" icon="cash-multiple"
              value={`${(stats?.orders?.revenue ?? 0).toLocaleString()}`}
              color="#8B5CF6"
            />
            <StatCard animValue={fadeAnim} title="Pending KYC" icon="file-document-alert" value={stats?.pending_actions?.kyc ?? '—'} color="#EF4444" />
            <StatCard animValue={fadeAnim} title="Open Reports" icon="alert-octagon" value={stats?.pending_actions?.reports ?? '—'} color="#EC4899" />
          </View>
        </Animated.View>

        {/* Timeframe Filters */}
        <Animated.View style={[{ flexDirection: 'row', gap: 8, marginBottom: 16, paddingHorizontal: 24, opacity: fadeAnim }]}>
          {['week', 'month', 'year'].map(t => (
            <TouchableOpacity 
              key={t}
              onPress={() => setTimeframe(t)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center',
                backgroundColor: timeframe === t ? '#10B981' : '#151A24',
                borderWidth: 1, borderColor: timeframe === t ? '#10B981' : '#1F2937'
              }}
            >
              <Text style={{ 
                color: timeframe === t ? '#FFFFFF' : '#9CA3AF', 
                fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' 
              }}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* User Growth Chart */}
        <Animated.View style={[styles.chartCard, { opacity: fadeAnim }]}>
          <Text style={styles.chartTitle}>User Signups ({timeframe === 'week' ? 'Last 7 Days' : timeframe === 'month' ? 'Last 30 Days' : 'This Year'})</Text>
          <LineChart
            data={{
              labels: growthLabels,
              datasets: [{ data: userGrowth }]
            }}
            width={width - 48}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chartStyle}
            withInnerLines={false}
          />
        </Animated.View>

        {/* Revenue Chart */}
        <Animated.View style={[styles.chartCard, { opacity: fadeAnim }]}>
          <Text style={styles.chartTitle}>Revenue Generated ({timeframe === 'week' ? 'Last 7 Days' : timeframe === 'month' ? 'Last 30 Days' : 'This Year'})</Text>
          <BarChart
            data={{
              labels: revenueLabels,
              datasets: [{ data: revenueData }]
            }}
            width={width - 48}
            height={200}
            chartConfig={revenueConfig}
            style={styles.chartStyle}
            withInnerLines={false}
            showValuesOnTopOfBars
          />
        </Animated.View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Management</Text>
        <View style={styles.quickActions}>
          {[
            { icon: 'account-group', label: 'Users', color: '#10B981', route: 'AdminUsers' },
            { icon: 'cart-outline', label: 'Orders', color: '#F59E0B', route: 'AdminOrders' },
            { icon: 'ticket-outline', label: 'Support', color: '#EF4444', route: 'AdminSupport' },
            { icon: 'cog-outline', label: 'Settings', color: '#6B7280', route: 'AdminSettings' },
          ].map(({ icon, label, color, route }) => (
            <TouchableOpacity key={label} style={styles.quickBtn} onPress={() => navigation.navigate(route)}>
              <View style={[styles.quickIcon, { backgroundColor: `${color}20` }]} >
                <MaterialCommunityIcons name={icon} size={28} color={color} />
              </View>
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0D14' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0D14', gap: 16 },
  loadingText: { color: '#9CA3AF', fontSize: 14, fontFamily: 'Poppins_500Medium' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20,
    backgroundColor: '#0A0D14',
  },
  headerGreeting: { color: '#9CA3AF', fontSize: 14, fontFamily: 'Poppins_400Regular' },
  headerTitle: { color: '#F9FAFB', fontSize: 26, fontFamily: 'Poppins_700Bold', marginTop: 2 },
  logoutBtn: { 
    backgroundColor: '#151A24', padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: '#1F2937'
  },

  scroll: { padding: 24, paddingTop: 10 },
  sectionTitle: { color: '#F9FAFB', fontSize: 18, fontFamily: 'Poppins_600SemiBold', marginBottom: 16, marginTop: 8 },

  grid: { flexDirection: 'column', gap: 12, marginBottom: 16 },
  card: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#151A24', borderRadius: 20, padding: 16,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardSubtitle: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', backgroundColor: '#0A0D14', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardInfo: { flex: 1 },
  cardTitle: { color: '#9CA3AF', fontSize: 12, fontFamily: 'Poppins_500Medium' },
  cardValue: { color: '#F9FAFB', fontSize: 20, fontFamily: 'Poppins_700Bold', marginTop: 2 },

  chartCard: { 
    backgroundColor: '#151A24', borderRadius: 24, paddingVertical: 20, marginBottom: 24, overflow: 'hidden',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  chartTitle: { color: '#F9FAFB', fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginLeft: 20, marginBottom: 16 },
  chartStyle: { borderRadius: 16 },

  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  quickBtn: { flex: 1, alignItems: 'center', backgroundColor: '#151A24', borderRadius: 20, paddingVertical: 20, marginHorizontal: 4, elevation: 2 },
  quickIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  quickLabel: { color: '#E5E7EB', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
});

export default AdminDashboardScreen;
