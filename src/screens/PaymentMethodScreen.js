import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import Colors from '../theme/colors';
import client from '../api/client';
import { showError } from '../utils/errorHandler';

const PAYMENT_METHODS = [
  { id: 'dummy', title: 'Test Gateway (Dummy)', icon: 'test-tube', color: Colors.primary },
  { id: 'jazzcash', title: 'JazzCash', icon: 'cellphone-nfc', color: '#B30000' },
  { id: 'easypaisa', title: 'EasyPaisa', icon: 'wallet-outline', color: '#00C366' },
  { id: 'stripe', title: 'Credit Card (Stripe)', icon: 'credit-card', color: '#6772E5' },
];

const PaymentMethodScreen = ({ route, navigation }) => {
  const { order } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('dummy');
  const [loading, setLoading] = useState(false);

  const handleProceed = async () => {
    if (!selectedMethod) {
      Alert.alert("Select Method", "Please select a payment method to proceed.");
      return;
    }

    setLoading(true);
    try {
      // Call our new backend API to initiate payment
      const { data } = await client.post('/payments/initiate/', {
        order_id: order.id,
        provider: selectedMethod,
      });

      // data contains: transaction_id, payment_url, amount, payload
      navigation.navigate('PaymentProcessing', { paymentInfo: data, order });

    } catch (err) {
      showError(err, 'Payment Failed', 'Could not initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Checkout" showBack hideSearch />
      
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Select Payment Method</Text>
        <Text style={styles.subText}>Total Amount to Pay: Rs. {order.total_amount}</Text>

        <View style={styles.methodsContainer}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected,
              ]}
              onPress={() => setSelectedMethod(method.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: method.color }]}>
                <MaterialCommunityIcons name={method.icon} size={24} color="#fff" />
              </View>
              <Text style={styles.methodTitle}>{method.title}</Text>
              
              {selectedMethod === method.id && (
                <MaterialCommunityIcons name="check-circle" size={24} color={Colors.primary} style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.payButton} 
          onPress={handleProceed}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Proceed to Pay</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20, flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 5 },
  subText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 25 },
  methodsContainer: { gap: 15 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  methodCardSelected: {
    borderColor: Colors.primary,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  methodTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  payButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default PaymentMethodScreen;
