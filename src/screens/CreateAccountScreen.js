import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../theme/colors';

// ─── Role Button ─────────────────────────────────────
const RoleButton = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.roleBtn, active && styles.roleBtnActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <MaterialCommunityIcons
      name={icon}
      size={22}
      color={active ? Colors.primary : Colors.textSecondary}
    />
    <Text style={[styles.roleBtnText, active && styles.roleBtnTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Input Field with inline error ───────────────────
const Field = ({ label, placeholder, value, onChangeText, secureTextEntry, keyboardType, error, iconName, maxLength }) => {
  const [secure, setSecure] = useState(secureTextEntry ?? false);
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        {iconName && (
          <Ionicons name={iconName} size={18} color={Colors.textMuted} style={styles.fieldIcon} />
        )}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize="none"
          underlineColorAndroid="transparent"
          maxLength={maxLength}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setSecure((s) => !s)}
          >
            <Ionicons
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Phone Input Field (fixed 03 prefix) ────────────────
// The user ONLY types the 9 digits after "03".
// Full number = "03" + value  (e.g. "03001234567")
const PhoneField = ({ label, value, onChangeText, error, iconName }) => {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError, { flexDirection: 'row', alignItems: 'center' }]}>
        {iconName && (
          <Ionicons name={iconName} size={18} color={Colors.textMuted} style={styles.fieldIcon} />
        )}
        {/* Fixed, non-editable country code + 03 prefix */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRightWidth: 1,
          borderRightColor: Colors.border,
          paddingRight: 8,
          marginRight: 8,
          paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 14, color: Colors.text, fontWeight: '600' }}>🇵🇰 +92</Text>
        </View>
        {/* Fixed, non-editable 03 */}
        <Text style={{ fontSize: 15, color: Colors.textSecondary, fontWeight: '700', marginRight: 2 }}>03</Text>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="0 1234567"
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={(text) => {
            // Only allow digits, max 9
            const digits = text.replace(/\D/g, '').slice(0, 9);
            onChangeText(digits);
          }}
          keyboardType="phone-pad"
          autoCapitalize="none"
          underlineColorAndroid="transparent"
          maxLength={9}
        />
      </View>
      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────
const CreateAccountScreen = ({ navigation }) => {
  const { register } = useAuth();

  const [role,            setRole]            = useState('buyer');
  const [fullName,        setFullName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [cnic,            setCnic]            = useState('');
  const [city,            setCity]            = useState('');
  const [address,         setAddress]         = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);

  // Inline field errors
  const [errors, setErrors] = useState({});
  // Banner error for general / server errors
  const [serverError, setServerError] = useState('');

  const handleCnicChange = (text) => {
    // Remove non-digit characters
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length > 5 && cleaned.length <= 12) {
      formatted = cleaned.slice(0, 5) + '-' + cleaned.slice(5);
    } else if (cleaned.length > 12) {
      formatted = cleaned.slice(0, 5) + '-' + cleaned.slice(5, 12) + '-' + cleaned.slice(12, 13);
    }
    
    setCnic(formatted);
    setErrors(e => ({ ...e, cnic: '' }));
  };

  const validate = () => {
    const e = {};
    if (!fullName.trim())   e.fullName = 'Full name is required';
    if (!email.trim())      e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address';
    
    if (!phone.trim()) {
      e.phone = 'Phone number is required';
    } else if (phone.length !== 9) {
      e.phone = 'Enter 9 digits after 03 (network code + 7-digit number)';
    } else {
      // Network code = first 2 digits the user typed
      const networkCode = parseInt(phone.slice(0, 2), 10);
      // Jazz: 00–10, 20–30  |  Zong: 10–20  |  Ufone: 30–40
      // Telenor: 40–50      |  SCO/SCOM: 70–80
      const isValid =
        (networkCode >= 0  && networkCode <= 10) || // Jazz
        (networkCode >= 10 && networkCode <= 20) || // Zong
        (networkCode >= 20 && networkCode <= 30) || // Jazz (Warid)
        (networkCode >= 30 && networkCode <= 40) || // Ufone
        (networkCode >= 40 && networkCode <= 50) || // Telenor
        (networkCode >= 70 && networkCode <= 80);   // SCO/SCOM

      if (!isValid) {
        e.phone = 'Invalid network code.\nJazz: 00–30 | Zong: 10–20 | Ufone: 30–40 | Telenor: 40–50 | SCO: 70–80';
      }
    }

    const cleanCnic = cnic.replace(/\D/g, '');
    if (!cnic.trim()) {
      e.cnic = 'CNIC is required';
    } else if (cleanCnic.length !== 13) {
      e.cnic = 'CNIC must be exactly 13 digits';
    }

    if (!city.trim())       e.city     = 'City is required';
    if (!address.trim())    e.address  = 'Address is required';
    if (!password)          e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (/^\d+$/.test(password)) e.password = 'Password cannot be all numbers';
    if (!confirmPassword)            e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleCreate = async () => {
    setServerError('');
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const userData = await register({
        full_name:        fullName.trim(),
        email:            email.trim().toLowerCase(),
        phone_number:     '03' + phone.trim(),
        cnic:             cnic.trim(),
        role,
        address:          address.trim(),
        city:             city.trim(),
        password,
        confirm_password: confirmPassword,
      });
      // On success: auth guard in App.js watches user state and navigates automatically
    } catch (err) {
      // err is always a string from extractError()
      const msg = typeof err === 'string' ? err : (err?.message || 'Registration failed. Please try again.');
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    Alert.alert('Google Sign-Up', 'Google authentication will be integrated here.');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Server error banner */}
        {!!serverError && (
          <View style={styles.serverErrorBox}>
            <Ionicons name="alert-circle" size={18} color="#B71C1C" />
            <Text style={styles.serverErrorText}>{serverError}</Text>
          </View>
        )}

        {/* Role Selector */}
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>
            I am a <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.roleRow}>
            <RoleButton
              icon="sprout-outline"
              label="Farmer"
              active={role === 'farmer'}
              onPress={() => setRole('farmer')}
            />
            <RoleButton
              icon="store-outline"
              label="Buyer"
              active={role === 'buyer'}
              onPress={() => setRole('buyer')}
            />
          </View>
        </View>

        <Field label="Full Name"        placeholder="Enter your full name"      value={fullName}        onChangeText={v => { setFullName(v);        setErrors(e => ({...e, fullName: ''})); }}        error={errors.fullName} iconName="person-outline" />
        <Field label="Email"            placeholder="Enter your email"          value={email}           onChangeText={v => { setEmail(v);           setErrors(e => ({...e, email: ''})); }}           error={errors.email}    keyboardType="email-address" iconName="mail-outline" />
        <PhoneField label="Phone Number" value={phone} onChangeText={v => { setPhone(v); setErrors(e => ({...e, phone: ''})); }} error={errors.phone} iconName="call-outline" />
        <Field label="CNIC"             placeholder="e.g. 35201-1234567-1"        value={cnic}            onChangeText={handleCnicChange}            error={errors.cnic}     keyboardType="numeric" iconName="id-card-outline" maxLength={15} />
        <Field label="City"             placeholder="e.g. Lahore, Karachi"     value={city}            onChangeText={v => { setCity(v);            setErrors(e => ({...e, city: ''})); }}            error={errors.city} iconName="business-outline" />
        <Field label="Detailed Address" placeholder="Enter your full address"   value={address}         onChangeText={v => { setAddress(v);         setErrors(e => ({...e, address: ''})); }}         error={errors.address} iconName="location-outline" />
        <Field label="Password"         placeholder="Min. 8 characters"        value={password}        onChangeText={v => { setPassword(v);        setErrors(e => ({...e, password: ''})); }}        error={errors.password}        secureTextEntry iconName="lock-closed-outline" />
        <Field label="Confirm Password" placeholder="Re-enter your password"    value={confirmPassword} onChangeText={v => { setConfirmPassword(v); setErrors(e => ({...e, confirmPassword: ''})); }} error={errors.confirmPassword} secureTextEntry iconName="shield-checkmark-outline" />

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnLoading]}
          onPress={handleCreate}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.createBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Signup */}
        <TouchableOpacity
          style={[styles.googleBtn, loading && { opacity: 0.6 }]}
          onPress={handleGoogleSignup}
          activeOpacity={0.8}
          disabled={loading}
        >
          <MaterialCommunityIcons name="google" size={18} color="#DB4437" />
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Password hint */}
        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.hintText}>
            Password must be at least 8 characters and cannot be entirely numeric.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },

  // ── Header ──
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.white },

  // ── Scroll ──
  scrollContent: { padding: 20, paddingBottom: 100, gap: 14 },

  // ── Server error banner ──
  serverErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 10,
    padding: 14,
  },
  serverErrorText: {
    flex: 1,
    color: '#B71C1C',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },

  // ── Role ──
  roleRow: { flexDirection: 'row', gap: 12 },
  roleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
  },
  roleBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  roleBtnTextActive: { color: Colors.primary },

  // ── Fields ──
  fieldBlock: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  required: { color: '#E53935' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.white,
    height: 54,
  },
  inputWrapperError: { borderColor: '#E53935' },
  fieldIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    height: '100%',
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 13 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: { fontSize: 12, color: '#E53935', flex: 1 },

  // ── Create Button ──
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  createBtnLoading: { opacity: 0.7 },
  createBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  // ── Divider ──
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  // ── Google ──
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderColor: '#DB4437',
    borderRadius: 12, paddingVertical: 13,
  },
  googleBtnText: { color: '#DB4437', fontSize: 15, fontWeight: '600' },

  // ── Login Link ──
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginPrompt: { fontSize: 14, color: Colors.textSecondary },
  loginLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // ── Hint ──
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  hintText: { fontSize: 12, color: Colors.textMuted, flex: 1, lineHeight: 18 },
});

export default CreateAccountScreen;
