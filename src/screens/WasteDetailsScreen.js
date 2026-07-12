import React, { useCallback,  useState, useRef, useEffect  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { silentError, getErrorMessage } from '../utils/errorHandler';

const { width } = Dimensions.get('window');

import { BASE_URL } from '../api/client';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&q=80';

const resolveImage = (rawUri) => {
  if (!rawUri) return PLACEHOLDER;
  if (rawUri.startsWith('http')) return rawUri;
  const host = BASE_URL.replace('/api/v1', '');
  return `${host}${rawUri.startsWith('/') ? '' : '/'}${rawUri}`;
};

const FEATURES = [
  'Organic and chemical-free',
  'Properly dried and stored',
  'Available for immediate pickup',
  'Bulk discounts available',
];

// ─── Image Carousel ──────────────────────────────────
const ImageCarousel = ({ images, activeIndex, flatRef }) => {
  const [active, setActive] = useState(activeIndex ?? 0);

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActive(idx);
  };

  return (
    <View style={styles.carouselBlock}>
      <FlatList
        ref={flatRef}
        data={images}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.mainImage} />
        )}
      />
      {/* Counter Badge */}
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>
          {active + 1}/{images.length}
        </Text>
      </View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────
const WasteDetailsScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeThumbnail, setActiveThumbnail] = useState(0);
  const carouselRef = useRef(null);

  // Custom modals for consistent experience
  const [confirmModal, setConfirmModal] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  const [resultModal, setResultModal] = useState({ visible: false, success: true, msg: '' });

  const executeDelete = async () => {
    setConfirmModal(false);
    setLoading(true);
    try {
      try {
        await client.post(`/listings/${item.id}/delete-mine/`);
      } catch {
        await client.delete(`/listings/${item.id}/`);
      }
      setResultModal({ visible: true, success: true, msg: 'Your listing has been removed.' });
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not delete this listing. Please try again.');
      setResultModal({ visible: true, success: false, msg });
    } finally {
      setLoading(false);
    }
  };

  const executeOrder = async () => {
    setOrderModal(false);
    setLoading(true);
    try {
      await client.post('/orders/place/', {
        listing_id: item.id,
        quantity_kg: item.quantity_kg || item.quantity || 1,
      });
      setResultModal({ visible: true, success: true, msg: 'Order Placed! 🎉\nYou can track it in My Orders.' });
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not place your order. Please try again.');
      setResultModal({ visible: true, success: false, msg });
    } finally {
      setLoading(false);
    }
  };

  // Start with route params data for instant render, then fetch fresh from API
  const routeItem = route?.params?.item ?? null;
  const [item, setItem] = useState(routeItem ?? {
    title: 'Loading...',
    city: '', address: '', price_per_kg: 0, quantity_kg: 0,
    views_count: 0, seller: {}, description: '', images: [], is_owner: false,
  });
  const [fetchLoading, setFetchLoading] = useState(!!routeItem?.id);

  // Always fetch fresh listing data from API — route params may have stale/no images
  useEffect(() => {
    const listingId = routeItem?.id;
    if (!listingId) return;
    setFetchLoading(true);
    client.get(`/listings/${listingId}/`)
      .then(({ data }) => {
        console.log('[WasteDetails] Fresh data images:', data.images?.length, data.images?.map(i => i.image));
        setItem(data);
      })
      .catch(err => {
        silentError(err, 'Refresh listing');
      })
      .finally(() => setFetchLoading(false));
  }, [routeItem?.id]);

  const sellerId = item.seller?.id ?? item.seller_id ?? (typeof item.seller === 'object' ? item.seller?.id : item.seller);
  const currentUserId = user?.id;
  
  // A listing belongs to the current user if:
  // 1. The backend explicitly flagged it as is_owner=true
  // 2. The route params passed it as isOwner=true (e.g., from MyListingsScreen)
  // 3. The current user's ID matches the listing's seller ID
  const isOwner = Boolean(item.is_owner) || 
                  Boolean(route?.params?.isOwner) || 
                  (currentUserId != null && sellerId != null && String(currentUserId) === String(sellerId));

  const locationText = [item.city, item.address].filter(Boolean).join(', ');

  const [saving, setSaving] = useState(false);
  const handleToggleSave = async () => {
    if (!user) {
      navigation.navigate('AuthStack', { screen: 'Login' });
      return;
    }
    if (!item.id) return;
    setSaving(true);
    const wasSaved = item.is_saved;
    setItem(prev => ({ ...prev, is_saved: !prev.is_saved }));
    try {
      await client.post(`/listings/${item.id}/save/`);
      // Stay on this page — heart icon updates to reflect saved state
    } catch (err) {
      silentError(err, 'Save listing');
      setItem(prev => ({ ...prev, is_saved: wasSaved }));
    } finally {
      setSaving(false);
    }
  };

  // Extract images
  const imagesList = item.images?.length > 0 
    ? item.images.map(img => resolveImage(img.image)) 
    : [PLACEHOLDER];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Waste Details</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { screen: 'SavedListings' })} style={styles.saveBtn}>
          <Ionicons name="list" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <ImageCarousel images={imagesList} activeIndex={activeThumbnail} flatRef={carouselRef} />

        {/* Thumbnail Strip */}
        <View style={styles.thumbnailRow}>
          {imagesList.map((uri, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                setActiveThumbnail(idx);
                carouselRef.current?.scrollToIndex({ index: idx, animated: true });
              }}
              style={[
                styles.thumbWrapper,
                activeThumbnail === idx && styles.thumbWrapperActive,
              ]}
            >
              <Image source={{ uri }} style={styles.thumbnail} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Product Info */}
        <View style={styles.infoBlock}>
          {/* Title + Heart */}
          <View style={styles.titleRow}>
            <Text style={styles.productTitle}>{item.title}</Text>
            <TouchableOpacity onPress={handleToggleSave} disabled={saving} style={styles.heartBtn}>
              <Ionicons
                name={item.is_saved ? 'heart' : 'heart-outline'}
                size={24}
                color={item.is_saved ? '#E53935' : Colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.locationText}>{locationText || 'Location not specified'}</Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>Rs. {item.price_per_kg || item.price || 0}</Text>
            <Text style={styles.perKg}> per kg</Text>
          </View>

          {/* Tags Row */}
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <MaterialCommunityIcons name="weight" size={14} color={Colors.textSecondary} />
              <Text style={styles.tagText}>{item.quantity_kg || item.quantity || 0} kg available</Text>
            </View>
            <View style={styles.tag}>
              <Ionicons name="eye" size={14} color={Colors.accent} />
              <Text style={styles.tagText}>
                {item.views_count || 0} views
              </Text>
            </View>
          </View>

          {/* Feature Chips */}
          <View style={styles.featuresGrid}>
            {FEATURES.map((f, idx) => (
              <View key={idx} style={styles.featureChip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.featureText} numberOfLines={1}>
                  {f}
                </Text>
              </View>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descText}>{item.description}</Text>

          {/* Seller */}
          <View style={styles.sellerRow}>
            <Image
              source={{ uri: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.seller?.full_name || item.seller || 'User') + '&background=random' }}
              style={styles.sellerAvatar}
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{item.seller?.full_name || item.seller || 'Unknown Farmer'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.sellerSub}>{item.seller?.is_verified ? 'Verified Farmer' : 'Farmer'}</Text>
                {item.seller?.is_verified && <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />}
              </View>
            </View>
            {!isOwner && (
              <TouchableOpacity
                style={styles.msgBtn}
                onPress={async () => {
                  if (!user) {
                    navigation.navigate('AuthStack', { screen: 'CreateAccount' });
                    return;
                  }
                  try {
                    // Start or find existing conversation (no auto-message)
                    const { data } = await client.post('/chat/conversations/start/', {
                      listing_id: item.id,
                      recipient_id: item.seller?.id || item.seller_id,
                      // Removed first_message so no auto-message is sent
                    });
                    // Navigate through the Chat tab stack
                    navigation?.navigate('Chat', {
                      screen: 'ChatDetail',
                      params: {
                        conversation: data,
                        suggestedReplies: [
                          `Hi, I'm interested in "${item.title}". Is it still available?`,
                          `What is the minimum order quantity for "${item.title}"?`,
                          `Can you deliver to my location?`,
                          `Is the price negotiable?`,
                        ],
                      }
                    });
                  } catch (err) {
                    showError(err, 'Error', 'Could not open conversation.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
                <Text style={styles.msgBtnText}>Message</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerFavBtn} 
          onPress={handleToggleSave} 
          disabled={saving}
        >
          <Ionicons
            name={item.is_saved ? "heart" : "heart-outline"}
            size={24}
            color={item.is_saved ? "#E53935" : Colors.textSecondary}
          />
        </TouchableOpacity>

        {isOwner ? (
          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: '#E53935', flex: 1 }, loading && { opacity: 0.7 }]}
            disabled={loading}
            onPress={() => setConfirmModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.contactBtnText}>
              {loading ? <ActivityIndicator size="small" color={Colors.white} /> : 'Delete Listing'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.contactBtn, { flex: 1 }, loading && { opacity: 0.7 }]}
            disabled={loading}
            onPress={() => {
              if (!user) {
                navigation.navigate('AuthStack', { screen: 'CreateAccount' });
              } else {
                setOrderModal(true);
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.contactBtnText}>
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                'Place Order'
              )}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      <Modal visible={confirmModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}><Ionicons name="trash-outline" size={32} color="#E53935" /></View>
            <Text style={styles.modalTitle}>Delete Listing?</Text>
            <Text style={styles.modalBody}>Are you sure you want to permanently remove this listing?</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setConfirmModal(false)}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={executeDelete}><Text style={styles.confirmTxt}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Order Confirmation Modal */}
      <Modal visible={orderModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#E1F5FE' }]}>
              <Ionicons name="cart-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Confirm Purchase</Text>
            <Text style={styles.modalBody}>
              Do you want to buy {item.quantity_kg || item.quantity}kg of {item.title}?{'\n'}
              <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>
                Total: Rs. {(item.price_per_kg || item.price) * (item.quantity_kg || item.quantity)}
              </Text>
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setOrderModal(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.primary }]} onPress={executeOrder}>
                <Text style={styles.confirmTxt}>Place Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Result Modal */}
      <Modal visible={resultModal.visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Ionicons name={resultModal.success ? "checkmark-circle" : "alert-circle"} size={48} color={resultModal.success ? Colors.primary : '#E53935'} />
            <Text style={[styles.modalTitle, { marginTop: 16 }]}>{resultModal.success ? 'Success' : 'Oops'}</Text>
            <Text style={styles.modalBody}>{resultModal.msg}</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.primary, width: '100%' }]} onPress={() => { setResultModal({ visible: false, success: true, msg: '' }); if (resultModal.success) navigation.goBack(); }}><Text style={styles.confirmTxt}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    padding: 4,
  },
  // ── Carousel ──
  carouselBlock: {
    position: 'relative',
  },
  mainImage: {
    width,
    height: 220,
    resizeMode: 'cover',
    backgroundColor: Colors.border,
  },
  counterBadge: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Thumbnails ──
  thumbnailRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thumbWrapper: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbWrapperActive: {
    borderColor: Colors.primary,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  // ── Info Block ──
  infoBlock: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  heartBtn: {
    padding: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
  },
  perKg: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // ── Tags ──
  tagsRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tagText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // ── Features ──
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '48%',
  },
  featureText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: 4,
  },
  // ── Description ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  descText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // ── Seller ──
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginTop: 4,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.border,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sellerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  msgBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  // ── Footer ──
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  footerFavBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBtn: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  contactBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Modals ──
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 320, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFEBEE',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  modalBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: '#F5F7FA' },
  cancelTxt: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  confirmBtn: { backgroundColor: '#E53935' },
  confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalMsg: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
});

export default WasteDetailsScreen;
