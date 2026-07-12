import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors from '../theme/colors';

const LogoutScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleLogout = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLoggingOut(true);
      // Small delay so the animation is visible before navigation fires
      setTimeout(async () => {
        await logout(); // clears session and sets user to null
        navigation.navigate('AuthStack', { screen: 'Login' });
      }, 400);
    });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      {/* Background gradient overlay */}
      <View style={styles.backdrop} />

      {/* Card */}
      <View style={styles.card}>
        {/* Icon circle */}
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="logout" size={38} color={Colors.white} />
        </View>

        {/* Heading */}
        <Text style={styles.title}>Sign Out</Text>
        <Text style={styles.subtitle}>
          You are currently signed in as
        </Text>
        <View style={styles.userRow}>
          <Ionicons name="person-circle" size={18} color={Colors.primary} />
          <Text style={styles.userEmail} numberOfLines={1}>
            {user?.email || 'your account'}
          </Text>
        </View>

        <Text style={styles.confirmText}>
          Are you sure you want to sign out?
        </Text>

        {/* Logout button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
          <TouchableOpacity
            style={[styles.logoutBtn, loggingOut && styles.logoutBtnLoading]}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.85}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="logout" size={18} color={Colors.white} />
                <Text style={styles.logoutBtnText}>Yes, Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Cancel button */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={loggingOut}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        {/* Footer note */}
        <View style={styles.noteRow}>
          <Ionicons name="shield-checkmark-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.noteText}>
            Your data is safe and will be here when you return.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    opacity: 0.08,
  },

  // ── Card ──
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },

  // ── Icon ──
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.badgeRed ?? '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: Colors.badgeRed ?? '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Text ──
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: -4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.background ?? '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    maxWidth: '100%',
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    flexShrink: 1,
  },
  confirmText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginTop: 4,
  },

  // ── Logout Button ──
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.badgeRed ?? '#E53935',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
    shadowColor: Colors.badgeRed ?? '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutBtnLoading: {
    opacity: 0.75,
  },
  logoutBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Cancel Button ──
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border ?? '#E0E0E0',
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // ── Footer ──
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 12,
    color: Colors.textMuted ?? '#9E9E9E',
    flex: 1,
    lineHeight: 18,
  },
});

export default LogoutScreen;
