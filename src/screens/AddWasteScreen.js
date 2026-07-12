import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Image,
  Dimensions, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../theme/colors';
import client, { BASE_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// ─── Waste Types ──────────────────────────────────────────────────────────────
const WASTE_TYPES = [
  { key: 'rice_husk',    label: 'Rice Husk',             icon: 'grain' },
  { key: 'wheat_straw',  label: 'Wheat Straw',           icon: 'grass' },
  { key: 'corn_stalks',  label: 'Corn Stalks',           icon: 'nature' },
  { key: 'cotton_waste', label: 'Cotton Waste',          icon: 'scatter-plot' },
  { key: 'cow_manure',   label: 'Cow Manure',            icon: 'agriculture' },
  { key: 'sugarcane',    label: 'Sugarcane Bagasse',     icon: 'local-florist' },
  { key: 'fruit_veg',    label: 'Fruit/Vegetable Waste', icon: 'eco' },
  { key: 'other',        label: 'Other',                 icon: 'category' },
];

// ─── WasteTypePicker ──────────────────────────────────────────────────────────
const WasteTypePicker = ({ value, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = WASTE_TYPES.find(t => t.key === value);

  return (
    <View>
      <TouchableOpacity
        style={styles.selectBox}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {selected && <MaterialIcons name={selected.icon} size={18} color={Colors.primary} />}
          <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
            {selected?.label || 'Select waste type'}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          {WASTE_TYPES.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.dropdownItem, value === opt.key && styles.dropdownItemActive]}
              onPress={() => { onSelect(opt.key); setOpen(false); }}
            >
              <MaterialIcons
                name={opt.icon}
                size={16}
                color={value === opt.key ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.dropdownText, value === opt.key && styles.dropdownTextActive]}>
                {opt.label}
              </Text>
              {value === opt.key && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Image Strip ──────────────────────────────────────────────────────────────
const ImageStrip = ({ images, onPickGallery, onPickCamera, onRemove }) => (
  <View style={{ gap: 10 }}>
    {/* Action buttons — Gallery (primary) + Camera (secondary) */}
    <View style={styles.photoActions}>
      <TouchableOpacity
        style={[styles.galleryBtn, images.length >= 5 && { opacity: 0.4 }]}
        onPress={onPickGallery}
        activeOpacity={0.8}
        disabled={images.length >= 5}
      >
        <MaterialIcons name="photo-library" size={28} color={Colors.primary} />
        <Text style={styles.galleryBtnTitle}>Choose from Gallery</Text>
        <Text style={styles.galleryBtnSub}>Tap to browse your photos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cameraBtn, images.length >= 5 && { opacity: 0.4 }]}
        onPress={onPickCamera}
        activeOpacity={0.8}
        disabled={images.length >= 5}
      >
        <MaterialIcons name="photo-camera" size={26} color={Colors.primary} />
        <Text style={styles.cameraBtnText}>Camera</Text>
      </TouchableOpacity>
    </View>

    {/* Selected photo thumbnails */}
    {images.length > 0 && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
          {images.map((asset, idx) => (
            <View key={`img-${idx}`} style={styles.thumbWrap}>
              {/* Use asset.uri for display */}
              <Image source={{ uri: asset.uri || asset }} style={styles.thumb} resizeMode="cover" />
              {idx === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverText}>Cover</Text>
                </View>
              )}
              <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(idx)}>
                <View style={styles.removeBtnInner}>
                  <Ionicons name="close" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    )}

    <Text style={styles.imageHint}>
      {images.length === 0
        ? 'Photos help buyers assess your waste quality'
        : `${images.length}/5 photo${images.length > 1 ? 's' : ''} added — first is the cover`}
    </Text>
  </View>
);

// ─── Field ────────────────────────────────────────────────────────────────────
const Field = ({ label, required, error, children }) => (
  <View style={styles.fieldBlock}>
    <Text style={styles.label}>
      {label}{required && <Text style={styles.required}> *</Text>}
    </Text>
    {children}
    {!!error && (
      <View style={styles.errorRow}>
        <Ionicons name="alert-circle" size={13} color="#E53935" />
        <Text style={styles.fieldError}>{error}</Text>
      </View>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AddWasteScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [images,      setImages]      = useState([]);
  const [wasteType,   setWasteType]   = useState('');
  const [title,       setTitle]       = useState('');
  const [quantity,    setQuantity]    = useState('');
  const [price,       setPrice]       = useState('');
  const [city,        setCity]        = useState(user?.city || '');
  const [address,     setAddress]     = useState(user?.address || '');
  const [description, setDescription] = useState('');
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [errors,      setErrors]      = useState({});
  const [notification, setNotification] = useState(null); // { type, message }

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // ── Pick from Gallery (opens phone gallery directly) ──────────────────────
  const pickFromGallery = useCallback(async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can add up to 5 photos.');
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Gallery access is needed to upload photos.\n\nGo to: Settings → Apps → AgriCycle → Permissions → Photos'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
      });
      if (!result.canceled && result.assets?.length > 0) {
        // Store full asset objects — we need mimeType + uri for reliable uploads
        setImages(prev => [...prev, ...result.assets].slice(0, 5));
      }
    } catch (e) {
      console.error('[Gallery]', e);
      Alert.alert('Error', e.message || 'Could not open gallery.');
    }
  }, [images.length]);

  // ── Pick from Camera (opens camera directly) ──────────────────────────────
  const pickFromCamera = useCallback(async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can add up to 5 photos.');
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to take photos.\n\nGo to: Settings → Apps → AgriCycle → Permissions → Camera'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets?.length > 0) {
        // Store full asset objects
        setImages(prev => [...prev, result.assets[0]].slice(0, 5));
      }
    } catch (e) {
      console.error('[Camera]', e);
      Alert.alert('Error', e.message || 'Could not open camera.');
    }
  }, [images.length]);

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  // ── GPS auto-fill ─────────────────────────────────────────────────────────
  const handleGPS = async () => {
    let Location;
    try { Location = require('expo-location'); } catch { Location = null; }

    if (!Location) {
      Alert.alert('GPS Unavailable', 'Please type your city manually.');
      return;
    }

    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed for GPS auto-fill.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo) {
        setCity(geo.city || geo.subregion || '');
        const parts = [geo.street, geo.district, geo.city, geo.region].filter(Boolean);
        setAddress(parts.join(', '));
      }
    } catch (e) {
      Alert.alert('GPS Error', 'Could not get location. Please type your city.');
    } finally {
      setGpsLoading(false);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!wasteType)                                             e.wasteType = 'Please select a waste type';
    if (!title.trim())                                          e.title     = 'Title is required';
    if (!quantity.trim() || isNaN(quantity) || parseInt(quantity) <= 0)
                                                                e.quantity  = 'Enter a valid quantity in kg';
    if (!price.trim() || isNaN(price) || parseFloat(price) <= 0)
                                                                e.price     = 'Enter a valid price per kg';
    if (!city.trim())                                           e.city      = 'City is required';
    return e;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      let newListing = null;

      if (images.length > 0) {
        const formData = new FormData();
        formData.append('title',        title.trim());
        formData.append('waste_type',   wasteType);
        formData.append('quantity_kg',  String(parseInt(quantity)));
        formData.append('price_per_kg', String(parseFloat(price)));
        formData.append('description',  description.trim());
        formData.append('city',         city.trim());
        formData.append('address',      address.trim());

        images.forEach((asset, idx) => {
          // asset is a full ImagePicker asset object with uri, mimeType, width, height etc.
          const uri      = asset.uri;
          const mimeType = asset.mimeType || 'image/jpeg';
          const ext      = mimeType === 'image/png' ? 'png' : 'jpg';
          const filename = `upload_${idx}_${Date.now()}.${ext}`;

          let finalUri = uri;
          if (finalUri && !finalUri.startsWith('file://') && !finalUri.startsWith('content://')) {
            finalUri = `file://${finalUri}`;
          }

          console.log(`[Upload] Image ${idx}: uri=${finalUri}, mime=${mimeType}, size=${asset.fileSize}`);

          formData.append('uploaded_images', {
            uri: finalUri,
            name: filename,
            type: mimeType,
          });
        });

        console.log('[Upload] Sending', images.length, 'images to', `/listings/`);

        const response = await client.post('/listings/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        newListing = response.data;
        console.log('[Upload] Success! listing id:', newListing?.id, 'images returned:', newListing?.images?.length);
      } else {
        const res = await client.post('/listings/', {
          title:        title.trim(),
          waste_type:   wasteType,
          quantity_kg:  parseInt(quantity),
          price_per_kg: parseFloat(price),
          description:  description.trim(),
          city:         city.trim(),
          address:      address.trim(),
        });
        newListing = res.data;
      }

      showNotification('success', '🎉 Listing Posted! Your waste is now live.');
      
      // Reset form to allow adding another if they navigate back
      setImages([]);
      setWasteType('');
      setTitle('');
      setQuantity('');
      setPrice('');
      setDescription('');

      // Navigate to the newly created listing's detail page
      if (newListing) {
        navigation.navigate('WasteDetails', { item: newListing });
      }

    } catch (err) {
      console.error('[AddWaste]', err.response?.data || err.message);
      const d = err.response?.data;
      let msg = 'Could not post listing. Please try again.';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (d.detail) msg = String(d.detail);
        else {
          const k = Object.keys(d)[0];
          if (k) {
            const errVal = Array.isArray(d[k]) ? d[k][0] : d[k];
            msg = `${k}: ${typeof errVal === 'object' ? JSON.stringify(errVal) : String(errVal)}`;
          }
        }
      } else if (!err.response) {
        msg = 'Cannot reach server. Make sure the Django backend is running.';
      }
      showNotification('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Waste Listing</Text>
      </View>

      {/* Toast Notification */}
      {notification && (
        <View style={[styles.notification, notification.type === 'error' ? styles.notificationError : styles.notificationSuccess]}>
          <Ionicons name={notification.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color="#fff" />
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Photos ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="photo-library" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Photos</Text>
            <Text style={styles.optionalTag}>optional</Text>
          </View>
          <ImageStrip
            images={images}
            onPickGallery={pickFromGallery}
            onPickCamera={pickFromCamera}
            onRemove={removeImage}
          />
        </View>

        {/* ── Listing Details ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="list-alt" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Listing Details</Text>
          </View>

          <Field label="Waste Type" required error={errors.wasteType}>
            <WasteTypePicker
              value={wasteType}
              onSelect={k => { setWasteType(k); setErrors(e => ({ ...e, wasteType: '' })); }}
            />
          </Field>

          <Field label="Listing Title" required error={errors.title}>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="e.g. Fresh Rice Husk from 2024 harvest"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={v => { setTitle(v); setErrors(e => ({ ...e, title: '' })); }}
            />
          </Field>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Quantity (kg)" required error={errors.quantity}>
                <TextInput
                  style={[styles.input, errors.quantity && styles.inputError]}
                  placeholder="e.g. 500"
                  placeholderTextColor={Colors.textMuted}
                  value={quantity}
                  onChangeText={v => { setQuantity(v); setErrors(e => ({ ...e, quantity: '' })); }}
                  keyboardType="numeric"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Price/kg (Rs.)" required error={errors.price}>
                <TextInput
                  style={[styles.input, errors.price && styles.inputError]}
                  placeholder="e.g. 15"
                  placeholderTextColor={Colors.textMuted}
                  value={price}
                  onChangeText={v => { setPrice(v); setErrors(e => ({ ...e, price: '' })); }}
                  keyboardType="decimal-pad"
                />
              </Field>
            </View>
          </View>

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Quality, storage method, harvest date, availability..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </Field>
        </View>

        {/* ── Location ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="location-on" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Location</Text>
          </View>

          <Field label="City" required error={errors.city}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <TextInput
                style={[styles.input, { flex: 1 }, errors.city && styles.inputError]}
                placeholder="e.g. Lahore"
                placeholderTextColor={Colors.textMuted}
                value={city}
                onChangeText={v => { setCity(v); setErrors(e => ({ ...e, city: '' })); }}
              />
              <TouchableOpacity style={styles.gpsBtn} onPress={handleGPS} disabled={gpsLoading}>
                {gpsLoading
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Ionicons name="locate" size={20} color={Colors.primary} />
                }
              </TouchableOpacity>
            </View>
          </Field>

          <Field label="Full Address">
            <TextInput
              style={styles.input}
              placeholder="Street, area, landmark..."
              placeholderTextColor={Colors.textMuted}
              value={address}
              onChangeText={setAddress}
            />
          </Field>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="upload-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Post Listing</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Your listing goes live on the marketplace immediately after posting.
        </Text>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white,
    paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },

  // Toast Notification
  notification: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    position: 'absolute', top: 110, left: 16, right: 16, zIndex: 100,
    padding: 14, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  notificationSuccess: { backgroundColor: '#4CAF50' },
  notificationError:   { backgroundColor: '#F44336' },
  notificationText:    { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },

  scrollContent: { padding: 16, gap: 14, paddingBottom: 48 },

  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle:     { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  optionalTag:   { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },

  // ── Photo picker ──
  photoActions: { flexDirection: 'row', gap: 12 },

  galleryBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primaryBg,
    borderWidth: 2, borderColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 8,
  },
  galleryBtnTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary, textAlign: 'center' },
  galleryBtnSub:   { fontSize: 10, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 4 },

  cameraBtn: {
    flex: 0.45, minWidth: 80, alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primaryBg,
    borderWidth: 2, borderColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16,
  },
  cameraBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  thumbWrap: { width: 90, height: 90, position: 'relative' },
  thumb:     { width: 90, height: 90, borderRadius: 12, backgroundColor: Colors.border },
  coverBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: Colors.primary, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  coverText:  { color: '#fff', fontSize: 9, fontWeight: '700' },
  removeBtn:  { position: 'absolute', top: -8, right: -8 },
  removeBtnInner: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#E53935',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  imageHint: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },

  // ── Fields ──
  fieldBlock: { gap: 6 },
  label:      { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  required:   { color: '#E53935' },
  errorRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldError: { fontSize: 12, color: '#E53935', flex: 1 },

  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.white,
  },
  inputError: { borderColor: '#E53935' },
  textArea:   { minHeight: 90, textAlignVertical: 'top' },

  // ── Dropdown ──
  selectBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: Colors.white,
  },
  selectValue:      { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  selectPlaceholder:{ fontSize: 14, color: Colors.textMuted, flex: 1 },
  dropdown: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    backgroundColor: Colors.white, marginTop: 3, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 5, zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  dropdownItemActive: { backgroundColor: Colors.primaryBg },
  dropdownText:       { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  dropdownTextActive: { color: Colors.primary, fontWeight: '700' },

  // ── GPS ──
  gpsBtn: {
    width: 48, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primaryBg,
  },

  // ── Submit ──
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 17, marginTop: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footerNote:    { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingBottom: 8 },
});

export default AddWasteScreen;
