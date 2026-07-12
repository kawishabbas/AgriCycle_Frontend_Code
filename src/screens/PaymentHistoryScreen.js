import React, { useCallback,  useEffect, useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import Colors from '../theme/colors';
import client from '../api/client';
import { silentError } from '../utils/errorHandler';

const PaymentHistoryScreen = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await client.get('/payments/history/');
      // Pagination results are inside 'results' if paginated
      setPayments(data.results || data);
    } catch (err) {
      silentError(err, 'Payment history fetch');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isSuccess = item.status === 'successful';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.txnId}>{item.transaction_id}</Text>
          <View style={[styles.badge, { backgroundColor: isSuccess ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[styles.badgeText, { color: isSuccess ? Colors.primary : Colors.accent }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>Rs. {item.amount}</Text>
          </View>
          <View style={styles.rightAlign}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.providerRow}>
          <MaterialCommunityIcons 
            name={item.provider === 'jazzcash' ? 'cellphone-nfc' : item.provider === 'stripe' ? 'credit-card' : 'bank-transfer'} 
            size={16} 
            color={Colors.textSecondary} 
          />
          <Text style={styles.providerText}>
            Paid via {item.provider.charAt(0).toUpperCase() + item.provider.slice(1)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Payment History" showBack hideSearch />
      
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No payment transactions found.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  listContainer: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    paddingBottom: 10,
  },
  txnId: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rightAlign: {
    alignItems: 'flex-end',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: 16,
  }
});

export default PaymentHistoryScreen;
