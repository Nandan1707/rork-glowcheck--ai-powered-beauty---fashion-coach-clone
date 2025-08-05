import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AppState } from "react-native";

import { AuthContext } from "@/hooks/auth-store";
import ErrorBoundary from "@/components/ErrorBoundary";
import { analyticsService } from "@/lib/analytics";
import { errorHandler } from "@/lib/error-handler";
import { storageService } from "@/lib/storage";
import { logger } from "@/lib/logger";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('App: Initializing production services');
        
        // Initialize error handler with additional safety
        try {
          await errorHandler.initialize();
          logger.info('App: Error handler initialized');
        } catch (errorHandlerError) {
          console.warn('App: Error handler initialization failed', errorHandlerError);
        }
        
        // Initialize analytics
        try {
          await analyticsService.initialize();
          await analyticsService.appLaunched();
          logger.info('App: Analytics initialized');
        } catch (analyticsError) {
          console.warn('App: Analytics initialization failed', analyticsError);
        }
        
        // Clean up old cached data
        try {
          await storageService.cleanup();
          logger.info('App: Storage cleanup completed');
        } catch (storageError) {
          console.warn('App: Storage cleanup failed', storageError);
        }
        
        logger.info('App: Production services initialized successfully');
      } catch (error) {
        console.error('App: Failed to initialize services', error);
        // Don't let initialization errors crash the app
      } finally {
        // Always hide splash screen
        try {
          await SplashScreen.hideAsync();
        } catch (splashError) {
          console.warn('App: Failed to hide splash screen', splashError);
        }
      }
    };

    initializeApp();

    // Handle app state changes for analytics
    const handleAppStateChange = (nextAppState: string) => {
      try {
        if (nextAppState === 'background') {
          analyticsService.appBackgrounded();
        } else if (nextAppState === 'active') {
          analyticsService.appForegrounded();
        }
      } catch (error) {
        console.warn('App: App state change handling failed', error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      try {
        subscription?.remove();
        analyticsService.destroy();
      } catch (error) {
        console.warn('App: Cleanup failed', error);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthContext>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <RootLayoutNav />
          </GestureHandlerRootView>
        </AuthContext>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}