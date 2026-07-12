import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationContext';
import Colors from '../theme/colors';

/**
 * AppHeader
 * Props:
 *  - notificationCount (number) : how many unread notifs to show in badge
 *  - onNotificationPress (fn)   : callback when bell is tapped
 *  - onSearchChange (fn)        : callback(text) as user types in search
 *  - searchValue (string)       : controlled search value (optional)
 *  - searchPlaceholder (string) : placeholder text for search bar
 */
const AppHeader = ({
  notificationCount = 0,
  onNotificationPress,
  onSearchChange,
  searchValue,
  searchPlaceholder = 'Search listings...',
  hideSearch = false,
}) => {
  const navigation = useNavigation();
  const { unreadCount, refreshCount } = useNotifications();

  // Use props if provided, otherwise fallback to context/navigation
  const displayCount = notificationCount !== undefined && notificationCount !== 0 ? notificationCount : unreadCount;
  
  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      refreshCount();
      navigation.navigate('Notifications');
    }
  };

  const handleLogoPress = () => {
    navigation.navigate('Dashboard');
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <TouchableOpacity activeOpacity={0.7} onPress={handleLogoPress}>
        <Text style={styles.logo}>AgriCycle</Text>
      </TouchableOpacity>

      {/* Search Bar */}
      {!hideSearch ? (
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={Colors.textMuted}
            value={searchValue}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
          {searchValue ? (
            <TouchableOpacity onPress={() => onSearchChange && onSearchChange('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* Notification Bell */}
      <TouchableOpacity
        style={styles.notifContainer}
        activeOpacity={0.7}
        onPress={handleNotificationPress}
      >
        <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
        {displayCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {displayCount > 9 ? '9+' : displayCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  logo: {
    fontSize: 24,
    fontFamily: 'Pacifico_400Regular',
    color: Colors.primary,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  notifContainer: {
    position: 'relative',
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.badgeRed,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AppHeader;
