import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../theme/colors';

const PaymentResultScreen = ({ route, navigation }) => {
  const { success, transaction_id, error } = route.params;

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: success ? '#E8F5E9' : '#FFEBEE' }]}>
          <MaterialCommunityIcons 
            name={success ? 'check-circle' : 'close-circle'} 
            size={80} 
            color={success ? Colors.primary : Colors.badgeRed} 
          />
        </View>

        <Text style={styles.title}>
          {success ? 'Payment Successful!' : 'Payment Failed'}
        </Text>

        <Text style={styles.subtitle}>
          {success 
            ? 'Your payment has been verified and the order is now processing.' 
            : error || 'We could not process your payment at this time.'}
        </Text>

        <View style={styles.detailsCard}>
          <Text style={styles.detailLabel}>Transaction ID</Text>
          <Text style={styles.detailValue}>{transaction_id}</Text>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('OrdersTab', { screen: 'OrdersMain' })}
        >
          <Text style={styles.buttonText}>Back to My Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  detailsCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 40,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  }
});

export default PaymentResultScreen;
