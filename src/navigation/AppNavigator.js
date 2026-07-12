import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen    from '../screens/DashboardScreen';
import ChatListScreen     from '../screens/ChatListScreen';
import ChatDetailScreen   from '../screens/ChatDetailScreen';
import AIHelpScreen       from '../screens/AIHelpScreen';
import AddWasteScreen     from '../screens/AddWasteScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import LogoutScreen       from '../screens/LogoutScreen';
import WasteMarketplaceScreen from '../screens/WasteMarketplaceScreen';
import WasteDetailsScreen from '../screens/WasteDetailsScreen';
import OrdersScreen       from '../screens/OrdersScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import SavedListingsScreen from '../screens/SavedListingsScreen';
import PaymentMethodScreen from '../screens/PaymentMethodScreen';
import PaymentProcessingScreen from '../screens/PaymentProcessingScreen';
import PaymentResultScreen from '../screens/PaymentResultScreen';
import PaymentHistoryScreen from '../screens/PaymentHistoryScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import Colors from '../theme/colors';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Dashboard Stack ──────────────────────────────────
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardMain"   component={DashboardScreen} />
    <Stack.Screen name="AddWaste"        component={AddWasteScreen} />
    <Stack.Screen name="Orders"          component={OrdersScreen} />
    <Stack.Screen name="WasteDetails"    component={WasteDetailsScreen} />
    <Stack.Screen name="MyListings"      component={MyListingsScreen} />
    <Stack.Screen name="SavedListings"   component={SavedListingsScreen} />
    <Stack.Screen name="SmartBuyerMatching" component={require('../screens/SmartBuyerMatchingScreen').default} />
  </Stack.Navigator>
);

// ─── Waste Stack ──────────────────────────────────────
const WasteStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="WasteMarketplace" component={WasteMarketplaceScreen} />
    <Stack.Screen name="WasteDetails"     component={WasteDetailsScreen} />
    <Stack.Screen name="ChatDetail"       component={ChatDetailScreen} />
    <Stack.Screen name="SavedListings"    component={SavedListingsScreen} />
  </Stack.Navigator>
);

// ─── Chat Stack ───────────────────────────────────────
const ChatStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ChatList"      component={ChatListScreen} />
    <Stack.Screen name="ChatDetail"    component={ChatDetailScreen} />
    <Stack.Screen name="WasteDetails"  component={WasteDetailsScreen} />
    <Stack.Screen name="SavedListings" component={SavedListingsScreen} />
  </Stack.Navigator>
);

// ─── AI Help Stack ────────────────────────────────────
const AIStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AIHelpMain"    component={AIHelpScreen} />
  </Stack.Navigator>
);

// ─── Orders Stack ─────────────────────────────────────
const OrdersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OrdersMain"    component={OrdersScreen} />
    <Stack.Screen name="WasteDetails"  component={WasteDetailsScreen} />
    <Stack.Screen name="ChatDetail"    component={ChatDetailScreen} />
    <Stack.Screen name="SavedListings" component={SavedListingsScreen} />
    <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
    <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
    <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
  </Stack.Navigator>
);

// ─── Profile Stack ────────────────────────────────────
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain"      component={ProfileScreen} />
    <Stack.Screen name="Logout"           component={LogoutScreen} />
    <Stack.Screen name="WasteMarketplace" component={WasteMarketplaceScreen} />
    <Stack.Screen name="WasteDetails"     component={WasteDetailsScreen} />
    <Stack.Screen name="Orders"           component={OrdersScreen} />
    <Stack.Screen name="MyListings"       component={MyListingsScreen} />
    <Stack.Screen name="SavedListings"    component={SavedListingsScreen} />
    <Stack.Screen name="PaymentHistory"   component={PaymentHistoryScreen} />
    <Stack.Screen name="PrivacySecurity"  component={PrivacySecurityScreen} />
    <Stack.Screen name="HelpSupport"      component={HelpSupportScreen} />
  </Stack.Navigator>
);

// ─── Tab Icon ─────────────────────────────────────────
const TabIcon = ({ name, focused, badge }) => (
  <View style={tabStyles.iconWrapper}>
    <MaterialCommunityIcons
      name={name}
      size={24}
      color={focused ? Colors.navActive : Colors.navInactive}
    />
    {badge > 0 && (
      <View style={tabStyles.badge}>
        <Text style={tabStyles.badgeText}>{badge}</Text>
      </View>
    )}
  </View>
);

// ─── Bottom Tab Navigator ─────────────────────────────
const MainTabs = () => {
  const { unreadCount, unreadMessageCount } = useNotifications();
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
      headerShown: false,
      tabBarStyle: tabStyles.tabBar,
      tabBarActiveTintColor:   Colors.navActive,
      tabBarInactiveTintColor: Colors.navInactive,
      tabBarLabelStyle: tabStyles.tabLabel,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardStack}
      listeners={({ navigation }) => ({
        tabPress: (e) => {
          e.preventDefault();
          navigation.navigate('Dashboard', { screen: 'DashboardMain' });
        },
      })}
      options={{
        tabBarLabel: 'Dashboard',
        tabBarIcon: ({ focused }) => (
          <TabIcon name="home-outline" focused={focused} badge={unreadCount} />
        ),
      }}
    />
    <Tab.Screen
      name="Waste"
      component={WasteStack}
      listeners={({ navigation }) => ({
        tabPress: (e) => {
          e.preventDefault();
          navigation.navigate('Waste', { screen: 'WasteMarketplace' });
        },
      })}
      options={{
        tabBarLabel: 'Waste',
        tabBarIcon: ({ focused }) => (
          <TabIcon name="recycle" focused={focused} badge={0} />
        ),
      }}
    />
    <Tab.Screen
      name="Chat"
      component={ChatStack}
      listeners={({ navigation }) => ({
        tabPress: (e) => {
          e.preventDefault();
          navigation.navigate('Chat', { screen: 'ChatList' });
        },
      })}
      options={{
        tabBarLabel: 'Chat',
        tabBarIcon: ({ focused }) => (
          <TabIcon name={focused ? 'chat' : 'chat-outline'} focused={focused} badge={unreadMessageCount} />
        ),
      }}
    />
    {(!user || user?.role === 'farmer') ? (
      <Tab.Screen
        name="AIHelp"
        component={AIStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AIHelp', { screen: 'AIHelpMain' });
          },
        })}
        options={{
          tabBarLabel: 'AI Help',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="robot-outline" focused={focused} badge={0} />
          ),
        }}
      />
    ) : (
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('OrdersTab', { screen: 'OrdersMain' });
          },
        })}
        options={{
          tabBarLabel: 'My Orders',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="shopping-outline" focused={focused} badge={0} />
          ),
        }}
      />
    )}
    <Tab.Screen
      name="Profile"
      component={ProfileStack}
      listeners={({ navigation }) => ({
        tabPress: (e) => {
          e.preventDefault();
          navigation.navigate('Profile', { screen: 'ProfileMain' });
        },
      })}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ focused }) => (
          <TabIcon name={focused ? 'account' : 'account-outline'} focused={focused} badge={0} />
        ),
      }}
    />
    <Tab.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{
        tabBarItemStyle: { display: 'none' }, // Completely removes the item from layout space
        tabBarVisible: true,
      }}
    />
  </Tab.Navigator>
  );
};

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 11, fontWeight: '500' },
  iconWrapper: {
    position: 'relative',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: Colors.badgeRed,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  chatBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatBubbleFocused: { backgroundColor: Colors.primary },
});

export default MainTabs;
