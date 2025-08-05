import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { supabase, signIn, signUp, signOut, getCurrentUser } from '@/lib/supabase';
import { User } from '@/types';

export const [AuthContext, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          // Fetch additional user data from the database
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
          setUser({
            id: currentUser.id,
            email: currentUser.email || '',
            name: data?.name,
            avatar_url: data?.avatar_url,
            subscription_tier: data?.subscription_tier || 'free',
          });
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
        if (event === 'SIGNED_IN' && session?.user) {
          // Fetch user data from the database
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: data?.name,
            avatar_url: data?.avatar_url,
            subscription_tier: data?.subscription_tier || 'free',
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
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
      const { data, error } = await signUp(email, password);
      if (error) throw error;
      
      // Create user profile in the database
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          name,
          subscription_tier: 'free',
        });
      }
      
      return data;
    },
    onSuccess: () => {
      router.replace('/(tabs)');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await signOut();
      if (error) throw error;
      return null;
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      router.replace('/onboarding');
    },
  });

  const upgradeToPremium = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ subscription_tier: 'premium' })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setUser({ ...user, subscription_tier: 'premium' });
      Alert.alert('Success', 'Welcome to Premium! Enjoy unlimited access to all features.');
    } catch (error) {
      console.error('Error upgrading to premium:', error);
      Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
    }
  };
  
  const checkPremiumAccess = (feature: string, allowDemo: boolean = true): boolean => {
    if (!user) return false;
    if (user.subscription_tier === 'premium') return true;
    
    // Allow demo access for coaching plans to test functionality
    if (allowDemo && feature === 'Personalized Coaching Plans') {
      Alert.alert(
        'Demo Mode',
        'You\'re using the demo version of this premium feature. Upgrade to Premium for unlimited access and advanced AI features.',
        [
          { text: 'Continue Demo', style: 'default' },
          { text: 'Upgrade Now', onPress: upgradeToPremium },
        ]
      );
      return true; // Allow demo access
    }
    
    Alert.alert(
      'Premium Feature',
      `${feature} is a premium feature. Upgrade to Premium to unlock unlimited access to personalized coaching plans and advanced AI features.`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Upgrade Now', onPress: upgradeToPremium },
      ]
    );
    return false;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isPremium: user?.subscription_tier === 'premium',
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    upgradeToPremium,
    checkPremiumAccess,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
});