import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../theme/colors';
import client, { BASE_URL } from '../api/client';
import { silentError } from '../utils/errorHandler';
import { useAuth } from '../context/AuthContext';
import GuestPrompt from '../components/GuestPrompt';

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

const SavedListingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSavedListings = useCallback(async () => {
    try {
      const { data } = await client.get('/listings/saved/', { params: { _t: Date.now() } });
      console.log('[SavedListings] API raw response:', JSON.stringify(data).slice(0, 300));
      const raw = Array.isArray(data) ? data : (data.results ?? []);
      console.log('[SavedListings] Items count:', raw.length);
      setSavedItems(raw);
    } catch (err) {
      silentError(err, 'Saved listings fetch');
    }
  }, []);

  // Re-fetch EVERY time the screen gains focus (not just on first mount)
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      fetchSavedListings().finally(() => setLoading(false));
    }, [fetchSavedListings, user])
  );

  if (!user) {
    return (
      <GuestPrompt 
        title="Saved Items" 
        message="Sign in to view items you've bookmarked." 
        icon="bookmark-outline" 
      />
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSavedListings();
    setRefreshing(false);
  };

  const handleUnsave = async (savedItemId, listingId) => {
    setSavedItems(prev => prev.filter(item => item.id !== savedItemId));
    try {
      await client.post(`/listings/${listingId}/save/`);
    } catch (err) {
      silentError(err, 'Unsave listing');
      fetchSavedListings();
    }
  };

  const renderItem = ({ item }) => {
    const listing = item.listing;
    if (!listing) return null;
    const imageUri = resolveImage(listing.images);

    return (
      <View style={styles.itemWrapper}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('WasteDetails', { item: listing })}
        >
          <Image source={{ uri: imageUri }} style={styles.cardImage} />

          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => handleUnsave(item.id, listing.id)}
          >
            <Ionicons name="heart" size={22} color="#E53935" />
          </TouchableOpacity>

          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{listing.title}</Text>
            <Text style={styles.cardPrice}>
              Rs. {listing.price_per_kg || listing.price}
              <Text style={{ fontSize: 12, color: Colors.textMuted }}> / kg</Text>
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{listing.city || 'Pakistan'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Listings</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 12, color: Colors.textSecondary }}>Loading favorites...</Text>
        </View>
      ) : (
        <FlatList
          data={savedItems}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={64} color={Colors.border} />
              <Text style={styles.emptyTitle}>No Favorites Yet</Text>
              <Text style={styles.emptySub}>Tap the heart button on any listing to save it here.</Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate('WasteMarketplace')}
              >
                <Text style={styles.exploreBtnText}>Explore Marketplace</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, flex: 1 },

  listContent: { padding: 16, paddingBottom: 40 },
  itemWrapper: { marginBottom: 16 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardImage: { width: '100%', height: 160, backgroundColor: '#EEE' },

  heartBtn: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    elevation: 2,
  },

  cardInfo: { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: Colors.primary, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: Colors.textMuted },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  exploreBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default SavedListingsScreen;
