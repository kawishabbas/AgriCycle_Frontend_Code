import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import Colors from '../theme/colors';

const HelpSupportScreen = () => {
  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@agricycle.pk').catch(() => {
      Alert.alert('Error', 'Unable to open email client. Please email us at support@agricycle.pk');
    });
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+923000000000').catch(() => {
      Alert.alert('Error', 'Unable to make a call. Please call us at +923000000000');
    });
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Help & Support" showBack={true} hideSearch={true} />
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.sectionTitle}>Contact Us</Text>
        
        <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="email-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Email Support</Text>
            <Text style={styles.contactSub}>support@agricycle.pk</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactCard} onPress={handleCallSupport}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="phone-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Call Us</Text>
            <Text style={styles.contactSub}>+92 300 000 0000</Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Frequently Asked Questions</Text>

        <View style={styles.faqCard}>
          <Text style={styles.faqQuestion}>How do I sell agricultural waste?</Text>
          <Text style={styles.faqAnswer}>
            If you are registered as a Farmer, you can go to the Dashboard and click the "+" button to add a new waste listing. Fill in the details, upload photos, and set a price.
          </Text>
        </View>

        <View style={styles.faqCard}>
          <Text style={styles.faqQuestion}>How does AI Crop Help work?</Text>
          <Text style={styles.faqAnswer}>
            Upload a clear photo of a diseased plant leaf using the AI Help tab. Our system will analyze the image and provide a diagnosis, along with treatment and prevention advice.
          </Text>
        </View>

        <View style={styles.faqCard}>
          <Text style={styles.faqQuestion}>How do I get paid?</Text>
          <Text style={styles.faqAnswer}>
            When a buyer purchases your waste, the funds are securely held. Once the buyer confirms delivery, the funds are added to your account earnings. You can withdraw them from your Profile screen.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  contactCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  contactSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  faqCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

export default HelpSupportScreen;
