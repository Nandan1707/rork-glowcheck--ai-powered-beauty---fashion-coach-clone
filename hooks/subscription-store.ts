import { useState, useEffect, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Alert } from 'react-native';
import subscriptionService, { SubscriptionStatus, SubscriptionPlan } from '@/lib/subscription-service';
import { useStripePayment } from '@/lib/stripe-service';
import { logger } from '@/lib/logger';
import { errorHandler } from '@/lib/error-handler';

export const [SubscriptionContext, useSubscription] = createContextHook(() => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({ isActive: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingTrialDays, setRemainingTrialDays] = useState(0);
  
  const { processSubscription, isReady: stripeReady } = useStripePayment();

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await subscriptionService.getSubscriptionStatus();
      setSubscriptionStatus(status);
      logger.info('Subscription status loaded', { status });
    } catch (err) {
      const errorMessage = 'Failed to load subscription status';
      logger.error(errorMessage, { error: err });
      setError(errorMessage);
      errorHandler.handleError(err as Error, {
        component: 'subscription-store',
        action: 'load_status'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateRemainingTrialDays = useCallback(async () => {
    try {
      const days = await subscriptionService.getRemainingTrialDays();
      setRemainingTrialDays(days);
    } catch (err) {
      logger.error('Failed to update remaining trial days', { error: err });
    }
  }, []);

  // Load initial subscription status
  useEffect(() => {
    loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  // Update remaining trial days when status changes
  useEffect(() => {
    updateRemainingTrialDays();
  }, [subscriptionStatus, updateRemainingTrialDays]);

  const startFreeTrial = useCallback(async (planId: string = 'premium_monthly') => {
    if (!stripeReady) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      logger.info('Starting free trial', { planId });
      
      const result = await subscriptionService.startFreeTrial(planId);
      
      if (!result.success) {
        setError(result.error || 'Failed to start trial');
        return;
      }

      if (result.clientSecret) {
        // Process payment with Stripe
        await processSubscription(result.clientSecret);
        
        // Confirm payment and update status
        await subscriptionService.confirmPayment(result.clientSecret);
      }

      // Refresh subscription status
      await loadSubscriptionStatus();
      
      Alert.alert(
        'Trial Started!',
        'Your 7-day free trial has started. Enjoy premium features!',
        [{ text: 'OK' }]
      );
      
      logger.info('Free trial started successfully', { planId });
    } catch (err) {
      const errorMessage = 'Failed to start free trial. Please try again.';
      logger.error(errorMessage, { error: err, planId });
      setError(errorMessage);
      errorHandler.handleError(err as Error, {
        component: 'subscription-store',
        action: 'start_trial',
        props: { planId }
      });
    } finally {
      setIsLoading(false);
    }
  }, [stripeReady, processSubscription, loadSubscriptionStatus]);

  const subscribeToPlan = useCallback(async (planId: string) => {
    if (!stripeReady) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      logger.info('Starting subscription', { planId });
      
      const result = await subscriptionService.subscribeToPlan(planId);
      
      if (!result.success) {
        setError(result.error || 'Failed to subscribe');
        return;
      }

      if (result.clientSecret) {
        // Process payment with Stripe
        await processSubscription(result.clientSecret);
        
        // Confirm payment and update status
        await subscriptionService.confirmPayment(result.clientSecret);
      }

      // Refresh subscription status
      await loadSubscriptionStatus();
      
      Alert.alert(
        'Subscription Active!',
        'Welcome to premium! You now have access to all premium features.',
        [{ text: 'OK' }]
      );
      
      logger.info('Subscription successful', { planId });
    } catch (err) {
      const errorMessage = 'Failed to subscribe. Please try again.';
      logger.error(errorMessage, { error: err, planId });
      setError(errorMessage);
      errorHandler.handleError(err as Error, {
        component: 'subscription-store',
        action: 'subscribe',
        props: { planId }
      });
    } finally {
      setIsLoading(false);
    }
  }, [stripeReady, processSubscription, loadSubscriptionStatus]);

  const cancelSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      logger.info('Cancelling subscription');
      
      const result = await subscriptionService.cancelSubscription();
      
      if (!result.success) {
        setError(result.error || 'Failed to cancel subscription');
        return;
      }

      // Refresh subscription status
      await loadSubscriptionStatus();
      
      Alert.alert(
        'Subscription Cancelled',
        'Your subscription has been cancelled. You can continue using premium features until the end of your billing period.',
        [{ text: 'OK' }]
      );
      
      logger.info('Subscription cancelled successfully');
    } catch (err) {
      const errorMessage = 'Failed to cancel subscription. Please try again.';
      logger.error(errorMessage, { error: err });
      setError(errorMessage);
      errorHandler.handleError(err as Error, {
        component: 'subscription-store',
        action: 'cancel_subscription'
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadSubscriptionStatus]);

  const refreshStatus = useCallback(async () => {
    await loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const hasPremiumAccess = subscriptionStatus.isActive;
  const isTrialActive = subscriptionStatus.isTrialActive || false;
  const availablePlans = subscriptionService.getAvailablePlans();

  return {
    // State
    subscriptionStatus,
    isLoading,
    error,
    
    // Actions
    startFreeTrial,
    subscribeToPlan,
    cancelSubscription,
    refreshStatus,
    clearError,
    
    // Helpers
    hasPremiumAccess,
    isTrialActive,
    remainingTrialDays,
    availablePlans,
  };
});

// Helper hook for checking premium access
export function usePremiumAccess() {
  const { hasPremiumAccess, isLoading } = useSubscription();
  return { hasPremiumAccess, isLoading };
}

// Helper hook for trial status
export function useTrialStatus() {
  const { isTrialActive, remainingTrialDays, isLoading } = useSubscription();
  return { isTrialActive, remainingTrialDays, isLoading };
}