import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { silentError, showError } from '../../utils/errorHandler';

const AdminSettingsScreen = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // default local settings if none exist in DB yet
  const [localState, setLocalState] = useState({
    'allow_new_registrations': 'true',
    'require_kyc_for_farmers': 'true',
    'maintenance_mode': 'false',
    'platform_commission_percent': '5.0',
    'auto_approve_listings': 'false',
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await client.get('/admin/settings/');
      const settingsMap = {};
      data.forEach(s => { settingsMap[s.key] = s.value; });
      setSettings(settingsMap);
      setLocalState(prev => ({ ...prev, ...settingsMap }));
    } catch (e) {
      silentError(e, 'Fetch admin settings');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchSettings(); }, []));

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.post('/admin/settings/bulk_update/', localState);
      Alert.alert('Success', 'Platform settings updated successfully.');
      fetchSettings();
    } catch (e) {
      showError(e, 'Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const updateKey = (key, value) => {
    setLocalState(prev => ({ ...prev, [key]: value }));
  };

  const SettingSwitch = ({ label, settingKey, desc }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {desc && <Text style={styles.settingDesc}>{desc}</Text>}
      </View>
      <Switch
        value={localState[settingKey] === 'true'}
        onValueChange={v => updateKey(settingKey, v ? 'true' : 'false')}
        trackColor={{ false: '#2D2D3A', true: '#4CAF50' }}
        thumbColor={'#fff'}
      />
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Platform Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Access</Text>
          <View style={styles.card}>
            <SettingSwitch 
              label="Maintenance Mode" 
              desc="If enabled, blocks all non-admin users from accessing the API."
              settingKey="maintenance_mode" 
            />
            <View style={styles.divider} />
            <SettingSwitch 
              label="Allow New Registrations" 
              desc="Open the platform to new users."
              settingKey="allow_new_registrations" 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification & Moderation</Text>
          <View style={styles.card}>
            <SettingSwitch 
              label="Require KYC for Farmers" 
              desc="Farmers cannot post listings until KYC is approved."
              settingKey="require_kyc_for_farmers" 
            />
            <View style={styles.divider} />
            <SettingSwitch 
              label="Auto-Approve Listings" 
              desc="Skip manual moderation for new waste listings."
              settingKey="auto_approve_listings" 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financials</Text>
          <View style={styles.card}>
            <View style={[styles.settingRow, { alignItems: 'center' }]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Platform Commission (%)</Text>
                <Text style={styles.settingDesc}>Percentage cut taken from each successful order.</Text>
              </View>
              <TextInput 
                style={styles.input}
                value={localState.platform_commission_percent}
                onChangeText={v => updateKey('platform_commission_percent', v)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  loader: { flex: 1, backgroundColor: '#0D0D1A', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 16, backgroundColor: '#1A1A2E' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  scroll: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#8F92A1', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  settingInfo: { flex: 1, paddingRight: 16 },
  settingLabel: { color: '#fff', fontSize: 15, fontWeight: '500', marginBottom: 4 },
  settingDesc: { color: '#8F92A1', fontSize: 12, lineHeight: 16 },
  divider: { height: 1, backgroundColor: '#2D2D3A', marginLeft: 16 },
  input: { backgroundColor: '#2D2D3A', color: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, width: 70, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  footer: { padding: 16, backgroundColor: '#1A1A2E', borderTopWidth: 1, borderTopColor: '#2D2D3A' },
  saveBtn: { backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default AdminSettingsScreen;
