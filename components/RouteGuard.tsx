import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';

import { useAuth } from '@/hooks/auth-store';
import { usePremiumAccess } from '@/hooks/subscription-store';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import PremiumModal from '@/components/PremiumModal';
import { COLORS } from '@/constants/colors';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireScan?: boolean;
  requirePremium?: boolean;
  fallbackRoute?: Href;
}

export default function RouteGuard({
  children,
  requireAuth = true,
  requireScan = false,
  requirePremium = false,
  fallbackRoute = '/auth/login' as Href,
}: RouteGuardProps) {
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    hasCompletedScan, 
    user: _user 
  } = useAuth();
  
  const { hasPremiumAccess, isLoading: premiumLoading } = usePremiumAccess();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  const isLoading = authLoading || premiumLoading;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    return (
      <View style={styles.guardContainer}>
        <Text style={styles.guardTitle}>Authentication Required</Text>
        <Text style={styles.guardMessage}>
          Please sign in to access this feature.
        </Text>
        <Button
          title="Sign In"
          onPress={() => router.replace(fallbackRoute)}
          style={styles.guardButton}
        />
      </View>
    );
  }

  // Check scan requirement
  if (requireScan && !hasCompletedScan()) {
    return (
      <View style={styles.guardContainer}>
        <Text style={styles.guardTitle}>Glow Scan Required</Text>
        <Text style={styles.guardMessage}>
          Complete your first glow scan to access personalized features.
        </Text>
        <Button
          title="Start Glow Scan"
          onPress={() => router.push('/(tabs)/glow-analysis')}
          style={styles.guardButton}
        />
      </View>
    );
  }

  // Check premium requirement
  if (requirePremium && !hasPremiumAccess) {
    return (
      <>
        <View style={styles.guardContainer}>
          <Text style={styles.guardTitle}>Premium Feature</Text>
          <Text style={styles.guardMessage}>
            Upgrade to Premium to access this feature and unlock your full glow potential.
          </Text>
          <Button
            title="Upgrade to Premium"
            onPress={() => setShowPremiumModal(true)}
            style={styles.guardButton}
          />
        </View>
        
        <PremiumModal
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onSuccess={() => {
            setShowPremiumModal(false);
            // The component will re-render and show children once premium access is granted
          }}
        />
      </>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  guardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  guardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 16,
    textAlign: 'center',
  },
  guardMessage: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  guardButton: {
    minWidth: 200,
  },
});