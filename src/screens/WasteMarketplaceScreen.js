import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  ScrollView, StyleSheet, ActivityIndicator, TextInput,
  RefreshControl, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import Colors from '../theme/colors';
import client, { BASE_URL } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { silentError } from '../utils/errorHandler';

const { width } = Dimensions.get('window');


const PLACEHOLDER = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&q=70';

// ─── Resolve image URL ────────────────────────────────────────
// Backend returns relative paths like "/media/listings/foo.jpg"
const resolveImage = (images) => {
  if (!images || images.length === 0) return PLACEHOLDER;
  const cover = images.find(i => i.is_cover) || images[0];
  const raw = cover?.image || '';
  if (!raw) return PLACEHOLDER;
  if (raw.startsWith('http')) return raw;
  // Relative path — prepend the backend host
  const host = BASE_URL.replace('/api/v1', '');
  return `${host}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

// ─── Filter categories ────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'All', icon: '' },
  { key: 'rice_husk', label: 'Rice Husk', icon: 'grain' },
  { key: 'wheat_straw', label: 'Wheat Straw', icon: 'grass' },
  { key: 'corn_stalks', label: 'Corn', icon: 'nature' },
  { key: 'cotton_waste', label: 'Cotton', icon: 'scatter-plot' },
  { key: 'cow_manure', label: 'Manure', icon: 'agriculture' },
  { key: 'sugarcane', label: 'Sugarcane', icon: 'local-florist' },
  { key: 'fruit_veg', label: 'Fruit & Veg', icon: 'eco' },
  { key: 'other', label: 'Other', icon: 'category' },
];

// ─── Filter Chip ──────────────────────────────────────────────
const FilterChip = ({ icon, label, active, onPress, style }) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive, style]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <MaterialIcons
      name={icon}
      size={14}
      color={active ? Colors.white : Colors.textSecondary}
    />
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Waste Card ───────────────────────────────────────────────
const WasteCard = ({ item, onPress }) => {
  const imageUri = resolveImage(item.images);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      {/* Image */}
      <Image
        source={{ uri: imageUri }}
        style={styles.cardImage}
        defaultSource={{ uri: PLACEHOLDER }}
      />

      {/* Featured badge */}
      {item.is_featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>⭐ Featured</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.cardPrice}>Rs. {parseFloat(item.price_per_kg).toLocaleString()}</Text>
          <Text style={styles.perKg}>/kg</Text>
        </View>

        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="weight-kilogram" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>{item.quantity_kg} kg available</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>{item.city}</Text>
        </View>

        <View style={styles.sellerRow}>
          <Ionicons name="person-circle-outline" size={13} color={Colors.primary} />
          <Text style={styles.sellerText} numberOfLines={1}>
            {item.seller?.full_name || 'Unknown Farmer'}
          </Text>
          {item.seller?.is_verified && (
            <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Empty State ──────────────────────────────────────────────
const EmptyState = ({ onRefresh }) => (
  <View style={styles.emptyWrap}>
    <MaterialCommunityIcons name="leaf-off" size={64} color={Colors.border} />
    <Text style={styles.emptyTitle}>No listings found</Text>
    <Text style={styles.emptySub}>Be the first to post a waste listing!</Text>
    <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
      <Text style={styles.refreshBtnText}>Refresh</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────
const WasteMarketplaceScreen = ({ navigation }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const { unreadCount, refreshCount } = useNotifications();

  // Use refs so the async function always reads fresh state without stale closures
  const filterRef = useRef(activeFilter);
  const searchRef = useRef(searchQuery);
  filterRef.current = activeFilter;
  searchRef.current = searchQuery;

  const fetchListings = async (filterType, search) => {
    const fType = filterType !== undefined ? filterType : filterRef.current;
    const sQuery = search !== undefined ? search : searchRef.current;
    try {
      const params = { _t: Date.now() }; // Cache buster
      if (fType !== 'all') params.waste_type = fType;
      if (sQuery.trim()) params.search = sQuery.trim();

      console.log('[Marketplace] Fetching ALL listings, params:', params);
      const { data } = await client.get('/listings/', { params });
      const raw = Array.isArray(data) ? data : (data.results ?? []);
      setListings(raw);
      setError('');
    } catch (err) {
      silentError(err, 'Marketplace fetch');
      setError('Could not load listings. Please check your connection and try again.');
    }
  };

  // Re-fetch every time the screen comes into focus (after delete, add, etc.)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchListings().finally(() => setLoading(false));
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Re-fetch when filter chip is tapped
  const handleFilterChange = (key) => {
    setActiveFilter(key);
    setLoading(true);
    fetchListings(key, searchRef.current).finally(() => setLoading(false));
  };

  // Re-fetch as user types in search
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length === 0 || text.length > 2) {
      fetchListings(filterRef.current, text);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  };

  const handleCardPress = (item) => {
    navigation?.navigate('WasteDetails', { item });
  };

  return (
    <View style={styles.root}>
      <AppHeader hideSearch={true} />

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search waste, city, seller..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={{ flexGrow: 0 }}
        >
          {FILTERS.map((f, index) => (
            <FilterChip
              key={f.key}
              icon={f.icon}
              label={f.label}
              active={activeFilter === f.key}
              onPress={() => handleFilterChange(f.key)}
              style={index !== FILTERS.length - 1 ? { marginRight: 8 } : {}}
            />
          ))}
        </ScrollView>
      </View>

      {/* Count bar */}
      {!loading && !error && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            {listings.length} listing{listings.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* Error */}
      {!!error && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle" size={16} color="#B71C1C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <WasteCard item={item} onPress={handleCardPress} />
          )}
          ListEmptyComponent={<EmptyState onRefresh={onRefresh} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },

  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, padding: 0 },

  // ── Filters ──
  filterContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterRow: {
    paddingHorizontal: 16, paddingVertical: 10,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },

  // ── Count bar ──
  countBar: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  countText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },

  // ── Error ──
  errorBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#FFCDD2',
  },
  errorText: { flex: 1, color: '#B71C1C', fontSize: 13 },
  retryText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },

  // ── List ──
  listContent: { padding: 16, gap: 12, paddingBottom: 30 },
  row: { justifyContent: 'space-between' },

  // ── Card ──
  card: {
    width: '48%', // Responsive width, fits perfectly with space-between
    backgroundColor: Colors.white,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    marginBottom: 12,
  },
  cardImage: { width: '100%', height: 130, backgroundColor: '#E0E0E0' },
  featuredBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  featuredText: { color: '#FFD700', fontSize: 10, fontWeight: '700' },
  cardContent: { padding: 10, gap: 5 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  perKg: { fontSize: 11, color: Colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted, flex: 1 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sellerText: { fontSize: 11, color: Colors.primary, fontWeight: '600', flex: 1 },

  // ── Loading / Empty ──
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 14 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textMuted },
  refreshBtn: {
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4,
  },
  refreshBtnText: { color: Colors.primary, fontWeight: '700' },
});

export default WasteMarketplaceScreen;
