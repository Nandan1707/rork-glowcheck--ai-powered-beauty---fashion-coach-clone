import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { supabase, signIn, signUp, signOut, getCurrentUser, getUserProfile, updateUserProfile } from '@/lib/supabase';
import { subscriptionService, SubscriptionStatus } from '@/lib/subscription-service';
import { User, UserProfile } from '@/types';

export const [AuthContext, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({ isActive: false });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const queryClient = useQueryClient();

  // Check for existing session and subscription status on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          // Fetch user profile from the database
          const { data: profile } = await getUserProfile(currentUser.id);
          
          // Fallback to users table if profile doesn't exist
          let userData = null;
          if (!profile) {
            const { data } = await supabase
              .from('users')
              .select('*')
              .eq('id', currentUser.id)
              .single();
            userData = data;
          }
            
          setUser({
            id: currentUser.id,
            email: currentUser.email || '',
            name: profile?.name || userData?.name || currentUser.user_metadata?.name,
            avatar_url: profile?.avatar_url || userData?.avatar_url,
            subscription_tier: userData?.subscription_tier || 'free',
            profile: profile || undefined,
          });
          
          // Check subscription status
          const subStatus = await subscriptionService.getSubscriptionStatus();
          setSubscriptionStatus(subStatus);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log('Auth state changed:', event, !!session?.user);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Fetch user profile from the database
          const { data: profile } = await getUserProfile(session.user.id);
          
          // Fallback to users table if profile doesn't exist
          let userData = null;
          if (!profile) {
            const { data } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
            userData = data;
          }
            
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.name || userData?.name || session.user.user_metadata?.name,
            avatar_url: profile?.avatar_url || userData?.avatar_url,
            subscription_tier: userData?.subscription_tier || 'free',
            profile: profile || undefined,
          });
          
          // Check subscription status
          const subStatus = await subscriptionService.getSubscriptionStatus();
          setSubscriptionStatus(subStatus);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSubscriptionStatus({ isActive: false });
          // Clear any cached data
          await AsyncStorage.multiRemove(['userProfile', 'lastScanData', 'glowPlanProgress']);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      router.replace('/(tabs)');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      const { data, error } = await signUp(email, password, { name });
      if (error) throw error;
      
      // Create user profile in the database
      if (data.user) {
        // Create entry in users table for subscription management
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          name,
          subscription_tier: 'free',
        });
        
        // Create detailed profile
        await updateUserProfile(data.user.id, {
          name,
          onboarding_completed: false,
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Check if user needs onboarding
      if (data?.user?.email_confirmed_at) {
        router.replace('/(tabs)');
      } else {
        // Show email confirmation message
        Alert.alert(
          'Check Your Email',
          'We\'ve sent you a confirmation link. Please check your email and click the link to activate your account.',
          [{ text: 'OK' }]
        );
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await signOut();
      if (error) throw error;
      return null;
    },
    onSuccess: async () => {
      setUser(null);
      setSubscriptionStatus({ isActive: false });
      queryClient.clear();
      
      // Clear all stored data
      try {
        await AsyncStorage.multiRemove([
          'userProfile',
          'lastScanData', 
          'glowPlanProgress',
          'userSettings',
          'cachedAnalyses'
        ]);
      } catch (error) {
        console.warn('Error clearing storage on logout:', error);
      }
      
      router.replace('/onboarding');
    },
  });

  const startFreeTrial = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Please log in to start your free trial.' };
    }
    
    setSubscriptionLoading(true);
    
    try {
      const result = await subscriptionService.startFreeTrial();
      
      if (result.success) {
        // Update subscription status
        const newStatus = await subscriptionService.getSubscriptionStatus();
        setSubscriptionStatus(newStatus);
        
        // Update user in database
        await supabase
          .from('users')
          .update({ subscription_tier: 'premium' })
          .eq('id', user.id);
          
        setUser({ ...user, subscription_tier: 'premium' });
      }
      
      return result;
    } catch (error) {
      console.error('Error starting free trial:', error);
      return { success: false, error: 'Failed to start free trial. Please try again.' };
    } finally {
      setSubscriptionLoading(false);
    }
  };
  
  const subscribeToPlan = async (planId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Please log in to subscribe.' };
    }
    
    setSubscriptionLoading(true);
    
    try {
      const result = await subscriptionService.subscribeToPlan(planId);
      
      if (result.success) {
        // Update subscription status
        const newStatus = await subscriptionService.getSubscriptionStatus();
        setSubscriptionStatus(newStatus);
        
        // Update user in database
        await supabase
          .from('users')
          .update({ subscription_tier: 'premium' })
          .eq('id', user.id);
          
        setUser({ ...user, subscription_tier: 'premium' });
      }
      
      return result;
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      return { success: false, error: 'Subscription failed. Please try again.' };
    } finally {
      setSubscriptionLoading(false);
    }
  };
  
  const upgradeToPremium = async () => {
    const result = await startFreeTrial();
    
    if (result.success) {
      const remainingDays = await subscriptionService.getRemainingTrialDays();
      Alert.alert(
        'Free Trial Started! 🎉',
        `Welcome to Premium! You have ${remainingDays} days of free access to all premium features.`,
        [{ text: 'Get Started', style: 'default' }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to start free trial. Please try again.');
    }
  };
  
  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      const { data, error } = await updateUserProfile(user.id, updates);
      if (error) throw error;
      
      // Update local user state
      setUser({
        ...user,
        name: updates.name || user.name,
        avatar_url: updates.avatar_url || user.avatar_url,
        profile: { ...user.profile, ...data } as UserProfile,
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  };
  
  const hasCompletedScan = (): boolean => {
    return !!user?.profile?.last_scan_date;
  };
  
  const requiresOnboarding = (): boolean => {
    return !user?.profile?.onboarding_completed;
  };
  
  const checkPremiumAccess = (feature: string, allowDemo: boolean = false): boolean => {
    if (!user) return false;
    
    // For preview/demo purposes, always grant premium access
    // This allows testing all premium features without subscription
    return true;
    
    // Original logic (commented out for demo)
    // if (subscriptionStatus.isActive) return true;
    // 
    // // Allow demo access for coaching plans to test functionality
    // if (allowDemo && feature === 'Personalized Coaching Plans') {
    //   Alert.alert(
    //     'Demo Mode',
    //     'You\'re using the demo version of this premium feature. Upgrade to Premium for unlimited access and advanced AI features.',
    //     [
    //       { text: 'Continue Demo', style: 'default' },
    //       { text: 'Start Free Trial', onPress: upgradeToPremium },
    //     ]
    //   );
    //   return true; // Allow demo access
    // }
    // 
    // return false; // Don't show alert here, let the calling component handle it
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isPremium: true, // Always premium for demo purposes
    subscriptionStatus,
    subscriptionLoading,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    updateProfile,
    hasCompletedScan,
    requiresOnboarding,
    startFreeTrial,
    subscribeToPlan,
    upgradeToPremium,
    checkPremiumAccess,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
});