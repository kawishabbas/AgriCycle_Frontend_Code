import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import Colors from '../../theme/colors';
import { silentError, showError } from '../../utils/errorHandler';

const AdminListingsScreen = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const { data } = await client.get('/admin/reports/');
      setReports(data.results || data);
    } catch (err) {
      silentError(err, 'Fetch listing reports');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchReports();
  }, []));

  const handleResolve = (id, action) => {
    const actionLabel = action === 'remove_listing' ? 'Remove Listing' : 'Dismiss Report';
    Alert.alert(`Confirm ${actionLabel}`, `Are you sure you want to ${actionLabel.toLowerCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Confirm', 
        onPress: async () => {
          try {
            await client.post(`/admin/reports/${id}/resolve/`, { action });
            fetchReports();
          } catch (e) {
            showError(e, 'Error', `Failed to ${actionLabel}`);
          }
        } 
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.reportHeader}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="alert-octagon" size={20} color="#F44336" />
          <Text style={styles.listingTitle}>{item.listing_title}</Text>
        </View>
        <View style={[styles.statusBadge, item.is_resolved ? styles.resolved : styles.unresolved]}>
          <Text style={styles.statusText}>{item.is_resolved ? 'RESOLVED' : 'PENDING'}</Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <Text style={styles.detailText}><Text style={styles.label}>Reason: </Text>{item.reason.toUpperCase()}</Text>
        <Text style={styles.detailText}><Text style={styles.label}>Reported By: </Text>{item.reporter_email}</Text>
        {item.description ? <Text style={styles.description}>"{item.description}"</Text> : null}
      </View>

      {!item.is_resolved && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.dismissBtn]} onPress={() => handleResolve(item.id, 'dismiss')}>
            <MaterialCommunityIcons name="check" size={18} color="#fff" />
            <Text style={styles.btnText}>Dismiss Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.removeBtn]} onPress={() => handleResolve(item.id, 'remove_listing')}>
            <MaterialCommunityIcons name="delete" size={18} color="#fff" />
            <Text style={styles.btnText}>Remove Listing</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Listing Moderation</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={i => i.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No reports found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12121D' },
  header: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: '#1E1E2C' },
  headerTitle: { color: Colors.white, fontSize: 20, fontWeight: '700' },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#1E1E2C', borderRadius: 8, padding: 16, marginBottom: 16 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  listingTitle: { color: Colors.white, fontSize: 16, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  unresolved: { backgroundColor: '#FF9800' },
  resolved: { backgroundColor: '#4CAF50' },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  details: { backgroundColor: '#2D2D3A', padding: 12, borderRadius: 6, marginBottom: 12 },
  detailText: { color: Colors.white, fontSize: 13, marginBottom: 4 },
  label: { color: '#8F92A1', fontWeight: '500' },
  description: { color: '#FFB74D', fontSize: 13, fontStyle: 'italic', marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, gap: 6 },
  dismissBtn: { backgroundColor: '#4CAF50' },
  removeBtn: { backgroundColor: '#F44336' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyText: { color: '#8F92A1', textAlign: 'center', marginTop: 40 },
});

export default AdminListingsScreen;
