import React, { useCallback,  useEffect, useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
// In a real app, you would use react-native-webview for the actual gateways
// import { WebView } from 'react-native-webview';
import AppHeader from '../components/AppHeader';
import Colors from '../theme/colors';
import client from '../api/client';
import { silentError } from '../utils/errorHandler';

const PaymentProcessingScreen = ({ route, navigation }) => {
  const { paymentInfo, order } = route.params;
  const [statusText, setStatusText] = useState('Connecting to gateway...');

  useEffect(() => {
    // If it's a dummy provider, simulate the flow here.
    // If it's JazzCash/EasyPaisa, we would render a WebView instead and listen to onNavigationStateChange.
    
    if (paymentInfo.provider === 'dummy') {
      simulateDummyPayment();
    } else {
      setStatusText(`Redirecting to ${paymentInfo.provider}...`);
      // Here you would render a WebView to load the payment form
      // For now, since we only have dummy, we'll simulate it anyway.
      setTimeout(() => simulateDummyPayment(), 2000);
    }
  }, []);

  const simulateDummyPayment = async () => {
    setStatusText('Processing your payment securely...');
    
    // Simulate a 3-second bank delay
    setTimeout(async () => {
      setStatusText('Verifying transaction...');
      try {
        // Send webhook callback to our backend to verify
        const { data } = await client.post('/payments/webhook/dummy/', {
          transaction_id: paymentInfo.transaction_id,
          success: true, // We simulate success
        });

        if (data.status === 'ok') {
          navigation.replace('PaymentResult', { 
            success: true, 
            transaction_id: paymentInfo.transaction_id 
          });
        }
      } catch (err) {
        silentError(err, 'Payment processing');
        navigation.replace('PaymentResult', { 
          success: false, 
          transaction_id: paymentInfo.transaction_id,
          error: 'Payment could not be verified. Please try again.'
        });
      }
    }, 3000);
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Processing Payment" hideSearch />
      
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        <Text style={styles.title}>Please wait</Text>
        <Text style={styles.subtitle}>{statusText}</Text>
        <Text style={styles.warning}>Do not close this screen or press back</Text>
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
    padding: 20,
  },
  loader: {
    transform: [{ scale: 1.5 }],
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  warning: {
    fontSize: 14,
    color: Colors.badgeRed,
    fontWeight: '600',
    marginTop: 20,
  }
});

export default PaymentProcessingScreen;
