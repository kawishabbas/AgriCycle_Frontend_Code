import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors from '../theme/colors';

const LoginScreen = ({ navigation }) => {
  const { login, loginGuest } = useAuth();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');     // inline error banner

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const userData = await login(email.trim(), password);
      // Clean up the URL on web so that React Navigation doesn't stick to /login
      if (Platform.OS === 'web') {
        window.history.replaceState(null, '', userData.admin_role ? '/admin' : '/dashboard');
      }
      // Success → AuthContext sets user → NavigationContainer key changes → MainTabs or AdminNavigator
    } catch (err) {
      // err is always a string from extractError()
      setError(typeof err === 'string' ? err : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert('Google Sign-In', 'Google authentication will be integrated here.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="recycle" size={48} color={Colors.white} />
          </View>
          <Text style={styles.appName}>AgriCycle</Text>
          <Text style={styles.tagline}>Agricultural Waste Marketplace</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back!</Text>
          <Text style={styles.cardSub}>Sign in to your account</Text>

          {/* ── Error Banner ── */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#B71C1C" style={{ marginTop: 1 }} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputRow, error && !password && styles.inputRowError]}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot */}
          <TouchableOpacity style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnLoading]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.loginBtnText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Login */}
          <TouchableOpacity
            style={[styles.googleBtn, loading && { opacity: 0.6 }]}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            <MaterialCommunityIcons name="google" size={18} color="#DB4437" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: 30 },

  // ── Logo ──
  logoArea: { alignItems: 'center', paddingTop: 60, paddingBottom: 32, gap: 8 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  appName:  { fontSize: 38, fontFamily: 'Pacifico_400Regular', color: Colors.white },
  tagline:  { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '400' },

  // ── Card ──
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 20, borderRadius: 24, padding: 24, gap: 14,
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  cardSub:   { fontSize: 14, color: Colors.textSecondary, marginTop: -8 },

  // ── Error banner ──
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFEBEE',
    borderWidth: 1, borderColor: '#FFCDD2',
    borderRadius: 10, padding: 12,
  },
  errorBannerText: { flex: 1, color: '#B71C1C', fontSize: 13, lineHeight: 19, fontWeight: '500' },

  // ── Fields ──
  fieldBlock: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 14, gap: 10,
    backgroundColor: Colors.surface ?? '#FAFAFA',
    height: 54, // Fixed height for a better look
  },
  inputRowError: { borderColor: '#E53935' },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary, padding: 0, margin: 0, height: '100%' },

  // ── Forgot ──
  forgotRow: { alignItems: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // ── Buttons ──
  loginBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  loginBtnLoading: { opacity: 0.7 },
  loginBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  // ── Divider ──
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  // ── Google ──
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderColor: '#DB4437',
    borderRadius: 12, paddingVertical: 13,
  },
  googleBtnText: { color: '#DB4437', fontSize: 15, fontWeight: '600' },

  // ── Register ──
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerPrompt: { fontSize: 14, color: Colors.textSecondary },
  registerLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});

export default LoginScreen;
