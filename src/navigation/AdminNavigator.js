import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUserManagementScreen from '../screens/admin/AdminUserManagementScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen';
import AdminSupportScreen from '../screens/admin/AdminSupportScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

// We also have KYC and Listings screens but we can put them into a "More" stack or keep them accessible via dashboard quick actions if tabs get too crowded.
// For now, let's create a 5-tab layout: Dashboard, Users, Orders, Support, Settings.

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const wrapInStack = (Component, name) => () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name={name} component={Component} />
  </Stack.Navigator>
);

const TabIcon = ({ name, focused }) => (
  <View style={styles.iconWrapper}>
    <MaterialCommunityIcons
      name={name}
      size={24}
      color={focused ? '#4CAF50' : '#8F92A1'}
    />
  </View>
);

const AdminNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#8F92A1',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={wrapInStack(AdminDashboardScreen, 'AdminDashboardMain')}
        options={{ tabBarLabel: 'Dash', tabBarIcon: ({ focused }) => <TabIcon name="view-dashboard" focused={focused} /> }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={wrapInStack(AdminUserManagementScreen, 'AdminUsersMain')}
        options={{ tabBarLabel: 'Users', tabBarIcon: ({ focused }) => <TabIcon name="account-group" focused={focused} /> }}
      />
      <Tab.Screen
        name="AdminOrders"
        component={wrapInStack(AdminOrdersScreen, 'AdminOrdersMain')}
        options={{ tabBarLabel: 'Orders', tabBarIcon: ({ focused }) => <TabIcon name="cart-outline" focused={focused} /> }}
      />
      <Tab.Screen
        name="AdminSupport"
        component={wrapInStack(AdminSupportScreen, 'AdminSupportMain')}
        options={{ tabBarLabel: 'Support', tabBarIcon: ({ focused }) => <TabIcon name="ticket-outline" focused={focused} /> }}
      />
      <Tab.Screen
        name="AdminSettings"
        component={wrapInStack(AdminSettingsScreen, 'AdminSettingsMain')}
        options={{ tabBarLabel: 'Settings', tabBarIcon: ({ focused }) => <TabIcon name="cog-outline" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1A1A2E',
    borderTopWidth: 1,
    borderTopColor: '#2D2D3A',
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  iconWrapper: {
    width: 28, height: 28,
    justifyContent: 'center', alignItems: 'center',
  },
});

export default AdminNavigator;
