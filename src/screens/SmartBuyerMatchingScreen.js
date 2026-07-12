import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Colors from '../theme/colors';

const CircularProgress = ({ score, size = 60, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let color = '#F44336'; // Red
  if (score >= 90) color = '#4CAF50'; // Green
  else if (score >= 70) color = '#FF9800'; // Orange

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          stroke="#E0E0E0"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          stroke={color}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.scoreTextContainer]}>
        <Text style={[styles.scoreText, { color }]}>{score}%</Text>
      </View>
    </View>
  );
};

const DUMMY_LISTING = {
  id: 'w1',
  type: 'Wheat Straw',
  quantity: '100 KG',
  price: 'Rs. 4,000',
  location: 'Lahore',
  image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
};

const DUMMY_BUYERS = [
  {
    id: 'b1',
    name: 'Ahmed Industries',
    location: 'Lahore',
    score: 95,
    rating: 4.8,
    preferred: 'Wheat Straw',
    factors: { type: true, location: true, qty: true, price: true },
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
  },
  {
    id: 'b2',
    name: 'Green Energy Biomass',
    location: 'Sheikhupura',
    score: 82,
    rating: 4.5,
    preferred: 'Mixed Straw',
    factors: { type: true, location: false, qty: true, price: true },
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg'
  },
  {
    id: 'b3',
    name: 'Rana Fertilizers Ltd.',
    location: 'Kasur',
    score: 65,
    rating: 4.1,
    preferred: 'Wheat Straw',
    factors: { type: true, location: false, qty: true, price: false },
    avatar: 'https://randomuser.me/api/portraits/men/67.jpg'
  }
];

export default function SmartBuyerMatchingScreen({ navigation }) {
  const renderFactor = (label, isMatch) => (
    <View style={styles.factorRow}>
      <MaterialCommunityIcons 
        name={isMatch ? 'check-circle' : 'close-circle'} 
        size={16} 
        color={isMatch ? '#4CAF50' : '#F44336'} 
      />
      <Text style={[styles.factorText, !isMatch && styles.factorTextMiss]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Smart Buyer Matching</Text>
          <Text style={styles.headerSubtitle}>Find the best buyers for your agricultural waste.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner */}
        <View style={styles.banner}>
          <MaterialCommunityIcons name="bullseye-arrow" size={24} color="#FFF" />
          <Text style={styles.bannerText}>3 highly matched buyers found for your listing.</Text>
        </View>

        {/* Listing Summary Card */}
        <View style={styles.listingCard}>
          <Image source={{ uri: DUMMY_LISTING.image }} style={styles.listingImage} />
          <View style={styles.listingDetails}>
            <Text style={styles.listingType}>{DUMMY_LISTING.type}</Text>
            <View style={styles.listingRow}>
              <MaterialCommunityIcons name="weight" size={16} color={Colors.gray} />
              <Text style={styles.listingText}>{DUMMY_LISTING.quantity}</Text>
            </View>
            <View style={styles.listingRow}>
              <MaterialCommunityIcons name="cash" size={16} color={Colors.gray} />
              <Text style={styles.listingText}>{DUMMY_LISTING.price}</Text>
            </View>
            <View style={styles.listingRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={Colors.gray} />
              <Text style={styles.listingText}>{DUMMY_LISTING.location}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Top Matched Buyers</Text>

        {/* Buyers List */}
        {DUMMY_BUYERS.map((buyer) => (
          <View key={buyer.id} style={styles.buyerCard}>
            
            <View style={styles.buyerHeader}>
              <Image source={{ uri: buyer.avatar }} style={styles.buyerAvatar} />
              <View style={styles.buyerInfo}>
                <Text style={styles.buyerName}>{buyer.name}</Text>
                <View style={styles.buyerMetaRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.gray} />
                  <Text style={styles.buyerMetaText}>{buyer.location}</Text>
                  <Text style={styles.bullet}>•</Text>
                  <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
                  <Text style={styles.buyerMetaText}>{buyer.rating}/5</Text>
                </View>
                <Text style={styles.buyerPref}>Prefers: {buyer.preferred}</Text>
              </View>
              
              {/* Score Visualization */}
              <View style={styles.scoreWrapper}>
                <CircularProgress score={buyer.score} />
                <Text style={styles.scoreLabel}>Match Score</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.factorsContainer}>
              <Text style={styles.factorsTitle}>Matching Factors:</Text>
              <View style={styles.factorsGrid}>
                {renderFactor('Waste Type Match', buyer.factors.type)}
                {renderFactor('Location Match', buyer.factors.location)}
                {renderFactor('Quantity Match', buyer.factors.qty)}
                {renderFactor('Price Match', buyer.factors.price)}
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn}>
                <MaterialCommunityIcons name="message-text-outline" size={18} color="#FFF" style={{marginRight: 6}} />
                <Text style={styles.primaryBtnText}>Contact Buyer</Text>
              </TouchableOpacity>
            </View>

          </View>
        ))}

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 20 : 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    color: Colors.white,
    fontFamily: 'Poppins_700Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E8F5E9',
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  banner: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerText: {
    color: '#FFF',
    fontFamily: 'Poppins_500Medium',
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  listingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  listingDetails: {
    flex: 1,
  },
  listingType: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
    marginBottom: 4,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  listingText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.gray,
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.dark,
    marginBottom: 12,
  },
  buyerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  buyerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  buyerInfo: {
    flex: 1,
  },
  buyerName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
  },
  buyerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  buyerMetaText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.gray,
    marginLeft: 4,
  },
  bullet: {
    fontSize: 12,
    color: Colors.gray,
    marginHorizontal: 6,
  },
  buyerPref: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: Colors.primary,
    marginTop: 4,
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scoreWrapper: {
    alignItems: 'center',
    marginLeft: 8,
  },
  scoreTextContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
  scoreLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: Colors.gray,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  factorsContainer: {
    marginBottom: 16,
  },
  factorsTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
    marginBottom: 8,
  },
  factorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 6,
  },
  factorText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.dark,
    marginLeft: 6,
  },
  factorTextMiss: {
    color: Colors.gray,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryBtnText: {
    color: Colors.dark,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
});
