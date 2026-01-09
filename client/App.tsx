import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView as SafeAreaContextView } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { FontsProvider, useFontsReady } from './src/providers/FontsProvider';
import HomeScreen from './src/screens/Home';
import DetailScreen from './src/screens/DetailScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SubmitScreen from './src/screens/SubmitScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminAnalyticsScreen from './src/screens/AdminAnalyticsScreen';
import StoresScreen from './src/screens/StoresScreen';
import StoreDetailScreen from './src/screens/StoreDetailScreen';
import { useFavoriteStore } from './src/store/favoriteStore';
import { useTheme } from './src/theme';
import LoadingOverlay from './src/components/LoadingOverlay';
import { requestNotificationPermissions } from './src/services/notifications';
import { HealthProvider } from './src/contexts/HealthContext';
import { bootstrapStores } from './src/lib/bootstrapStores'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

const HomeStackNavigator = createNativeStackNavigator();
const StoresStackNavigator = createNativeStackNavigator();
const SubmitStackNavigator = createNativeStackNavigator();
const SavedStackNavigator = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();
const MIN_OVERLAY_MS = 7000;
const navigationRef = createNavigationContainerRef();

const renderWithProviders = (children: ReactNode) => (
  <QueryClientProvider client={queryClient}>
    <SafeAreaProvider>{children}</SafeAreaProvider>
  </QueryClientProvider>
);

const HomeStack = () => (
  <HomeStackNavigator.Navigator screenOptions={{ headerShown: false }}>
    <HomeStackNavigator.Screen name="Home" component={HomeScreen} />
    <HomeStackNavigator.Screen name="Detail" component={DetailScreen} />
    <HomeStackNavigator.Screen name="Settings" component={SettingsScreen} />
    <HomeStackNavigator.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
  </HomeStackNavigator.Navigator>
);

const StoresStack = () => (
  <StoresStackNavigator.Navigator screenOptions={{ headerShown: false }}>
    <StoresStackNavigator.Screen name="Stores" component={StoresScreen} />
    <StoresStackNavigator.Screen name="StoreDetail" component={StoreDetailScreen} />
    <StoresStackNavigator.Screen name="Settings" component={SettingsScreen} />
    <StoresStackNavigator.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
  </StoresStackNavigator.Navigator>
);

const SubmitStack = () => (
  <SubmitStackNavigator.Navigator screenOptions={{ headerShown: false }}>
    <SubmitStackNavigator.Screen name="Submit" component={SubmitScreen} />
  </SubmitStackNavigator.Navigator>
);

const SavedStack = () => (
  <SavedStackNavigator.Navigator screenOptions={{ headerShown: false }}>
    <SavedStackNavigator.Screen name="Saved" component={FavoritesScreen} />
    <SavedStackNavigator.Screen name="Detail" component={DetailScreen} />
  </SavedStackNavigator.Navigator>
);

const AppNavigator = () => {
  const theme = useTheme();
  const savedLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedLongPressRef.current) {
        clearTimeout(savedLongPressRef.current);
      }
    };
  }, []);

  const startSavedLongPress = () => {
    if (savedLongPressRef.current) {
      clearTimeout(savedLongPressRef.current);
    }
    savedLongPressRef.current = setTimeout(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('AdminAnalytics');
      }
    }, 5000);
  };

  const clearSavedLongPress = () => {
    if (savedLongPressRef.current) {
      clearTimeout(savedLongPressRef.current);
      savedLongPressRef.current = null;
    }
  };

  const renderSavedTabButton = (props: BottomTabBarButtonProps) => (
    <Pressable
      {...props}
      onPress={(event) => {
        clearSavedLongPress();
        props.onPress?.(event);
      }}
      onPressIn={startSavedLongPress}
      onPressOut={clearSavedLongPress}
    />
  );
  const renderTabIcon =
    (name: React.ComponentProps<typeof Ionicons>['name']) =>
    ({ color, size }: { color: string; size: number }) => (
      <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: -6 }}>
        <Ionicons name={name} size={size} color={color} />
      </View>
    );

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 4
        },
        tabBarItemStyle: {
          borderLeftWidth: 1,
          borderLeftColor: theme.border
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.subtext,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: theme.typography.bodySemiBold,
          marginTop: -4,
          paddingBottom: 2
        }
      }}
    >
      <Tab.Screen
        name="StoresTab"
        component={StoresStack}
        options={{
          tabBarLabel: 'Stores',
          tabBarIcon: renderTabIcon('cart-outline')
          ,
          tabBarItemStyle: { borderLeftWidth: 0 }
        }}
      />
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
        tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: -6 }}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
            </View>
          )
        }}
      />
      <Tab.Screen
        name="SavedTab"
        component={SavedStack}
        options={{
          tabBarLabel: 'Saved',
          tabBarIcon: renderTabIcon('bookmark-outline'),
          tabBarButton: renderSavedTabButton
        }}
      />
    </Tab.Navigator>
  );
};

const AppContent = () => {
  const theme = useTheme();
  const fontsLoaded = useFontsReady();
  const loadFavorites = useFavoriteStore((state) => state.loadFavorites);
  const [minOverlayVisible, setMinOverlayVisible] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    requestNotificationPermissions().catch(() => {});
  }, []);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    overlayTimer.current = setTimeout(() => {
      setMinOverlayVisible(false);
    }, MIN_OVERLAY_MS);
    return () => {
      if (overlayTimer.current) {
        clearTimeout(overlayTimer.current);
        overlayTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && !minOverlayVisible && !overlayHidden) {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true
      }).start(() => {
        setOverlayHidden(true);
      });
    }
  }, [fontsLoaded, minOverlayVisible, overlayHidden, overlayOpacity]);

  const navigationTheme = {
    dark: theme.mode === 'dark',
    colors: {
      primary: theme.accent,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      notification: theme.accent
    }
  };

  const isAppReady = fontsLoaded && !minOverlayVisible && overlayHidden;
  const statusBarStyle = theme.mode === 'dark' ? 'light' : 'dark';

  return (
    <>
      <StatusBar style={statusBarStyle} backgroundColor={theme.background} />
      {isAppReady ? (
        <SafeAreaContextView
          edges={['top', 'left', 'right']}
          style={{ flex: 1, backgroundColor: theme.background }}
        >
          <NavigationContainer theme={navigationTheme} ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaContextView>
      ) : (
        <Animated.View
          style={[
            overlayStyles.wrapper,
            { backgroundColor: theme.background, opacity: overlayOpacity }
          ]}
        >
          <LoadingOverlay />
        </Animated.View>
      )}
    </>
  );
};

const overlayStyles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

const App = () => {
  useEffect(() => {
    bootstrapStores().catch(console.error);
  }, []);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  return (
    <FontsProvider>
      {renderWithProviders(
        <HealthProvider>
          <AppContent />
        </HealthProvider>
      )}
    </FontsProvider>
  );
};

export default App;
