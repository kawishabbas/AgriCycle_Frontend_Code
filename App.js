import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import MainTabs from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import CreateAccountScreen from './src/screens/CreateAccountScreen';
import IntroScreen from './src/screens/IntroScreen';
import AdminNavigator from './src/navigation/AdminNavigator';

const Stack = createStackNavigator();

// ─── Auth screens (unauthenticated) ───────────────────────────────────────
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName="Login"
  >
    <Stack.Screen name="Login"          component={LoginScreen} />
    <Stack.Screen name="CreateAccount"  component={CreateAccountScreen} />
  </Stack.Navigator>
);

// ─── URL Linking Config (web deep links) ─────────────────────────────────
const linking = {
  prefixes: [],
  config: {
    screens: {
      // Admin app tabs (nested under Admin)
      Admin: {
        path: 'admin',
        screens: {
          AdminDashboard: { path: '', screens: { AdminDashboardMain: '' } },
          AdminUsers:     { path: 'users', screens: { AdminUsersMain: '' } },
          AdminOrders:    { path: 'orders', screens: { AdminOrdersMain: '' } },
          AdminSupport:   { path: 'support', screens: { AdminSupportMain: '' } },
          AdminSettings:  { path: 'settings', screens: { AdminSettingsMain: '' } },
        }
      },

      Intro: 'intro',
      // Auth screens
      AuthStack: {
        screens: {
          Login:         'sign-in',
          CreateAccount: 'sign-up',
        }
      },

      // Main app tabs (now nested under Main)
      Main: {
        path: '',
        screens: {
          Dashboard: {
            path: 'dashboard',
            screens: {
              DashboardMain: '',
              AddWaste:      'add-waste',
              Orders:        'orders',
              MyListings:    'my-listings',
              SavedListings: 'saved',
              WasteDetails:  'waste/:id',
            },
          },
          Waste: {
            path: 'market',
            screens: {
              WasteMarketplace: '',
              WasteDetails:     'item/:id',
              ChatDetail:       'chat/:id',
              SavedListings:    'saved',
            },
          },
          Chat: {
            path: 'chat',
            screens: {
              ChatList:      '',
              ChatDetail:    ':id',
              WasteDetails:  'waste/:id',
              SavedListings: 'saved',
            },
          },
          AIHelp: {
            path: 'ai-help',
            screens: {
              AIHelpMain: '',
            },
          },
          OrdersTab: {
            path: 'my-orders',
            screens: {
              OrdersMain:    '',
              WasteDetails:  'waste/:id',
              ChatDetail:    'chat/:id',
              SavedListings: 'saved',
              SmartBuyerMatching: 'smart-matching',
              PaymentMethod: 'payment/method',
              PaymentProcessing: 'payment/processing',
              PaymentResult: 'payment/result',
            },
          },
          Profile: {
            path: 'profile',
            screens: {
              ProfileMain:      '',
              Orders:           'orders',
              MyListings:       'my-listings',
              SavedListings:    'saved',
              WasteMarketplace: 'market',
              WasteDetails:     'waste/:id',
              PaymentHistory:   'payment/history',
            },
          },
          Notifications: 'notifications',
        }
      }
    },
  },
};

const RootStack = createStackNavigator();

const RootNavigator = () => {
  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Main"
    >
      <RootStack.Screen name="Intro"      component={IntroScreen} />
      <RootStack.Screen name="Main"       component={MainTabs} />
      <RootStack.Screen name="Admin"      component={AdminNavigator} />
      <RootStack.Screen name="AuthStack"  component={AuthStack} />
    </RootStack.Navigator>
  );
};

import { PanResponder } from 'react-native';

const AppContent = () => {
  const { user, loading, logout } = useAuth();
  const navigationRef = useRef(null);
  const isNavigatorReady = useRef(false);
  const timerId = useRef(null);

  // ── Navigate to correct screen based on auth state ──
  const navigateByAuthState = (currentUser) => {
    if (!isNavigatorReady.current || !navigationRef.current) return;
    if (currentUser && currentUser.admin_role) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'Admin' }] });
    } else if (currentUser) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'AuthStack' }] });
    }
  };

  // Trigger navigation whenever user state changes
  useEffect(() => {
    if (!loading) {
      navigateByAuthState(user);
    }
  }, [user, loading]);

  // ── Inactivity timeout ───────────────────────────────
  const resetTimer = () => {
    if (timerId.current) clearTimeout(timerId.current);
    if (user) {
      timerId.current = setTimeout(() => { logout(); }, 15 * 60 * 1000);
    }
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerId.current) clearTimeout(timerId.current); };
  }, [user]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => { resetTimer(); return false; },
      onMoveShouldSetPanResponderCapture:  () => { resetTimer(); return false; },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={() => {
          isNavigatorReady.current = true;
          // Run once navigator is mounted with the correct initial route
          if (!loading) navigateByAuthState(user);
        }}
      >
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
};



// ─── Root App ──────────────────────────────────────────────────────────────
export default function App() {
  const [fontsLoaded] = useFonts({
    Pacifico_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <ActivityIndicator size="large" color="#2E7D32" style={{ flex: 1 }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
