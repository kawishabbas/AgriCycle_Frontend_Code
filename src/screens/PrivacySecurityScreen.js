import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import AppHeader from '../components/AppHeader';
import Colors from '../theme/colors';

const PrivacySecurityScreen = () => {
  return (
    <View style={styles.root}>
      <AppHeader title="Privacy & Security" showBack={true} hideSearch={true} />
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.card}>
          <Text style={styles.heading}>Privacy Policy</Text>
          <Text style={styles.paragraph}>
            At AgriCycle, we are committed to protecting your personal data and ensuring your privacy. We collect information to provide you with the best possible service, including matching buyers with farmers, offering AI crop diagnostics, and ensuring secure transactions.
          </Text>
          <Text style={styles.paragraph}>
            Your data is never sold to third parties. We use industry-standard encryption to protect your sensitive information.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Data Security</Text>
          <Text style={styles.paragraph}>
            We employ secure server infrastructure and encrypt sensitive data like passwords and payment credentials. Please ensure you keep your account password secure and do not share it with anyone.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to access, update, or delete your personal data. If you wish to permanently delete your account and all associated data, please contact our support team.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
});

export default PrivacySecurityScreen;
