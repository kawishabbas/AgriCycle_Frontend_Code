import React, { useCallback,  useEffect, useRef  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const IntroScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isTabletOrWeb = width > 768;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1592982537447-6f2da6c0c2f1?w=1000&q=80' }} // A vibrant, dynamic agricultural background
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        <View style={styles.container}>
          {/* Centered Content Wrapper for responsiveness */}
          <View style={[styles.contentWrapper, { maxWidth: isTabletOrWeb ? 500 : '100%' }]}>
            
            {/* Top Section */}
            <Animated.View style={[styles.topSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.logoCircle}>
                <Image source={require('../../assets/logo.jpg')} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={styles.brandName}>AgriCycle</Text>
              
              <Text style={styles.title}>Turn Waste Into Wealth</Text>
              <Text style={styles.subtitle}>
                Connect with farmers and industries to transform agricultural waste into
                valuable sustainable resources.
              </Text>
            </Animated.View>

            {/* Bottom Section */}
            <Animated.View style={[styles.bottomSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              {/* Features Row */}
              <View style={styles.featuresRow}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconCircle}>
                    <MaterialCommunityIcons name="recycle" size={26} color={Colors.white} />
                  </View>
                  <Text style={styles.featureText}>Upcycle</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconCircle}>
                    <MaterialCommunityIcons name="robot-outline" size={26} color={Colors.white} />
                  </View>
                  <Text style={styles.featureText}>AI Match</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconCircle}>
                    <MaterialCommunityIcons name="chart-line-variant" size={26} color={Colors.white} />
                  </View>
                  <Text style={styles.featureText}>Profit</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.button}
                activeOpacity={0.85}
                onPress={() => {
                  if (user?.admin_role) {
                    navigation.replace('Admin');
                  } else {
                    navigation.replace('Main');
                  }
                }}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
              </TouchableOpacity>
            </Animated.View>

          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 30, 15, 0.75)', // Sleek dark overlay for better contrast
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  topSection: {
    alignItems: 'center',
    marginTop: '15%',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white, // White background makes the logo pop
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    overflow: 'hidden', // Ensure the image stays within the circle
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  brandName: {
    fontSize: 42,
    color: '#28B463', // Vibrant modern green
    fontFamily: 'Pacifico_400Regular',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_800ExtraBold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
    paddingHorizontal: 10,
  },
  bottomSection: {
    width: '100%',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glassy effect
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#28B463', // Vibrant modern green
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 4,
    shadowColor: '#28B463',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
});

export default IntroScreen;
