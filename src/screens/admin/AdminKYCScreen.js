import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import client, { BASE_URL } from '../../api/client';
import Colors from '../../theme/colors';
import { silentError, showError } from '../../utils/errorHandler';

const AdminKYCScreen = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    try {
      const { data } = await client.get('/admin/kyc/');
      setDocs(data.results || data);
    } catch (err) {
      silentError(err, 'Fetch KYC docs');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchDocs();
  }, []));

  const handleAction = (id, action) => {
    Alert.alert(`Confirm ${action}`, `Are you sure you want to ${action} this document?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Confirm', 
        onPress: async () => {
          try {
            await client.post(`/admin/kyc/${id}/${action}/`, { notes: '' });
            fetchDocs();
          } catch (e) {
            showError(e, 'Error', `Failed to ${action} document`);
          }
        } 
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.docHeader}>
        <View>
          <Text style={styles.userEmail}>{item.user_name} ({item.user_email})</Text>
          <Text style={styles.docType}>{item.document_type.replace('_', ' ')}</Text>
        </View>
        <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      {item.file && (
        <Image 
          source={{ uri: item.file.startsWith('http') ? item.file : `${BASE_URL.replace('/api/v1', '')}${item.file}` }} 
          style={styles.docImage} 
          resizeMode="cover"
        />
      )}

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleAction(item.id, 'reject')}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#fff" />
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleAction(item.id, 'approve')}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KYC Management</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={i => i.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No KYC documents found.</Text>}
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
  docHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  userEmail: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  docType: { color: '#8F92A1', fontSize: 12, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  status_pending: { backgroundColor: '#FF9800' },
  status_approved: { backgroundColor: '#4CAF50' },
  status_rejected: { backgroundColor: '#F44336' },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  docImage: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#2D2D3A', marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: '#2D2D3A', paddingTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, gap: 6 },
  rejectBtn: { backgroundColor: '#F44336' },
  approveBtn: { backgroundColor: '#4CAF50' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyText: { color: '#8F92A1', textAlign: 'center', marginTop: 40 },
});

export default AdminKYCScreen;
