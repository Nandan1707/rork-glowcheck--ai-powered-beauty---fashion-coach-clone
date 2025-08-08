import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { errorHandler } from './error-handler';
import stripeService from './stripe-service';
import { supabase } from './supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: 'monthly' | 'yearly';
  features: string[];
  trialDays?: number;
  stripePriceId?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan?: SubscriptionPlan;
  expiresAt?: Date;
  isTrialActive?: boolean;
  trialExpiresAt?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

class SubscriptionService {
  private readonly STORAGE_KEY = 'subscription_status';
  private readonly TRIAL_STORAGE_KEY = 'trial_status';
  
  private readonly plans: SubscriptionPlan[] = [
    {
      id: 'premium_monthly',
      name: 'Premium Monthly',
      price: 9.99,
      currency: 'USD',
      duration: 'monthly',
      trialDays: 7,
      stripePriceId: 'price_monthly_premium', // Will be set after Stripe setup
      features: [
        'Personalized AI Plans',
        'Advanced Analysis',
        'Unlimited Access',
        'Premium Features',
        'Priority Support'
      ]
    },
    {
      id: 'premium_yearly',
      name: 'Premium Yearly',
      price: 99.99,
      currency: 'USD',
      duration: 'yearly',
      trialDays: 7,
      stripePriceId: 'price_yearly_premium', // Will be set after Stripe setup
      features: [
        'Personalized AI Plans',
        'Advanced Analysis',
        'Unlimited Access',
        'Premium Features',
        'Priority Support',
        '2 months free'
      ]
    }
  ];

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      const trialStored = await AsyncStorage.getItem(this.TRIAL_STORAGE_KEY);
      
      let status: SubscriptionStatus = { isActive: false };
      
      if (stored) {
        const parsed = JSON.parse(stored);
        status = {
          ...parsed,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
        };
      }
      
      // Check trial status
      if (trialStored) {
        const trialData = JSON.parse(trialStored);
        const trialExpiresAt = new Date(trialData.expiresAt);
        const isTrialActive = trialExpiresAt > new Date();
        
        status.isTrialActive = isTrialActive;
        status.trialExpiresAt = trialExpiresAt;
        
        // If trial is active and no paid subscription, consider as active
        if (isTrialActive && !status.isActive) {
          status.isActive = true;
        }
      }
      
      // Check if paid subscription is expired
      if (status.expiresAt && status.expiresAt <= new Date()) {
        status.isActive = false;
      }
      
      return status;
    } catch (error) {
      logger.error('Error getting subscription status', { error });
      return { isActive: false };
    }
  }

  async startFreeTrial(planId: string = 'premium_monthly'): Promise<{ success: boolean; error?: string; clientSecret?: string }> {
    try {
      logger.info('Starting free trial with Stripe', { planId });
      
      // Check if trial was already used
      const existingTrial = await AsyncStorage.getItem(this.TRIAL_STORAGE_KEY);
      if (existingTrial) {
        const trialData = JSON.parse(existingTrial);
        if (trialData.used) {
          return {
            success: false,
            error: 'Free trial has already been used. Please subscribe to continue using premium features.'
          };
        }
      }
      
      const plan = this.plans.find(p => p.id === planId);
      if (!plan || !plan.trialDays || !plan.stripePriceId) {
        return {
          success: false,
          error: 'Trial not available for this plan.'
        };
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        return {
          success: false,
          error: 'User not authenticated. Please log in to start trial.'
        };
      }

      // Initialize Stripe
      await stripeService.initialize();
      
      // Create or get Stripe customer
      let customerId = await this.getStoredCustomerId();
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.user_metadata?.name);
        customerId = customer.id;
        await this.storeCustomerId(customerId);
      }

      // Create subscription with trial
      const subscription = await stripeService.createSubscription(
        customerId,
        plan.stripePriceId,
        plan.trialDays
      );
      
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + plan.trialDays);
      
      // Store trial status
      const trialStatus = {
        planId,
        startedAt: new Date().toISOString(),
        expiresAt: trialExpiresAt.toISOString(),
        used: true,
        stripeSubscriptionId: subscription.subscriptionId,
        stripeCustomerId: customerId
      };
      
      await AsyncStorage.setItem(this.TRIAL_STORAGE_KEY, JSON.stringify(trialStatus));
      
      logger.info('Free trial started successfully with Stripe', { 
        planId, 
        expiresAt: trialExpiresAt,
        subscriptionId: subscription.subscriptionId
      });
      
      return { 
        success: true, 
        clientSecret: subscription.clientSecret 
      };
    } catch (error) {
      const errorMessage = 'Failed to start free trial. Please try again.';
      logger.error('Error starting free trial', { error, planId });
      errorHandler.handleError(error as Error, {
        component: 'subscription-service',
        action: 'start_free_trial',
        props: { planId }
      });
      return { success: false, error: errorMessage };
    }
  }

  async subscribeToPlan(planId: string): Promise<{ success: boolean; error?: string; clientSecret?: string }> {
    try {
      logger.info('Starting subscription with Stripe', { planId });
      
      const plan = this.plans.find(p => p.id === planId);
      if (!plan || !plan.stripePriceId) {
        return {
          success: false,
          error: 'Plan not found or not configured properly.'
        };
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        return {
          success: false,
          error: 'User not authenticated. Please log in to subscribe.'
        };
      }

      // Initialize Stripe
      await stripeService.initialize();
      
      // Create or get Stripe customer
      let customerId = await this.getStoredCustomerId();
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.user_metadata?.name);
        customerId = customer.id;
        await this.storeCustomerId(customerId);
      }

      // Create subscription
      const subscription = await stripeService.createSubscription(
        customerId,
        plan.stripePriceId
      );
      
      const expiresAt = new Date();
      if (plan.duration === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      
      const subscriptionStatus: SubscriptionStatus = {
        isActive: true,
        plan,
        expiresAt,
        stripeSubscriptionId: subscription.subscriptionId,
        stripeCustomerId: customerId
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        ...subscriptionStatus,
        expiresAt: expiresAt.toISOString()
      }));
      
      logger.info('Subscription created successfully with Stripe', { 
        planId, 
        expiresAt,
        subscriptionId: subscription.subscriptionId
      });
      
      return { 
        success: true, 
        clientSecret: subscription.clientSecret 
      };
    } catch (error) {
      const errorMessage = 'Subscription failed. Please try again.';
      logger.error('Error subscribing to plan', { error, planId });
      errorHandler.handleError(error as Error, {
        component: 'subscription-service',
        action: 'subscribe',
        props: { planId }
      });
      return { success: false, error: errorMessage };
    }
  }

  async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Cancelling subscription');
      
      const status = await this.getSubscriptionStatus();
      if (status.stripeSubscriptionId) {
        await stripeService.cancelSubscription(status.stripeSubscriptionId);
      }
      
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      
      logger.info('Subscription cancelled successfully');
      
      return { success: true };
    } catch (error) {
      const errorMessage = 'Failed to cancel subscription. Please try again.';
      logger.error('Error cancelling subscription', { error });
      errorHandler.handleError(error as Error, {
        component: 'subscription-service',
        action: 'cancel_subscription'
      });
      return { success: false, error: errorMessage };
    }
  }

  getAvailablePlans(): SubscriptionPlan[] {
    return this.plans;
  }

  getPlan(planId: string): SubscriptionPlan | undefined {
    return this.plans.find(p => p.id === planId);
  }

  private async getStoredCustomerId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('stripe_customer_id');
    } catch (error) {
      logger.error('Error getting stored customer ID', { error });
      return null;
    }
  }

  private async storeCustomerId(customerId: string): Promise<void> {
    try {
      await AsyncStorage.setItem('stripe_customer_id', customerId);
    } catch (error) {
      logger.error('Error storing customer ID', { error });
    }
  }

  async syncSubscriptionStatus(): Promise<void> {
    try {
      const status = await this.getSubscriptionStatus();
      if (status.stripeSubscriptionId) {
        const stripeSubscription = await stripeService.getSubscription(status.stripeSubscriptionId);
        
        // Update local status based on Stripe data
        const isActive = stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing';
        const expiresAt = new Date(stripeSubscription.current_period_end * 1000);
        
        const updatedStatus: SubscriptionStatus = {
          ...status,
          isActive,
          expiresAt
        };
        
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          ...updatedStatus,
          expiresAt: expiresAt.toISOString()
        }));
        
        logger.info('Subscription status synced with Stripe', { 
          subscriptionId: status.stripeSubscriptionId,
          isActive,
          expiresAt
        });
      }
    } catch (error) {
      logger.error('Error syncing subscription status', { error });
    }
  }

  async setupStripeProducts(): Promise<void> {
    try {
      const { monthlyPriceId, yearlyPriceId } = await stripeService.setupProducts();
      
      // Update plans with actual Stripe price IDs
      this.plans[0].stripePriceId = monthlyPriceId;
      this.plans[1].stripePriceId = yearlyPriceId;
      
      logger.info('Stripe products set up and plans updated', {
        monthlyPriceId,
        yearlyPriceId
      });
    } catch (error) {
      logger.error('Error setting up Stripe products', { error });
      throw error;
    }
  }

  // Helper method to check if user has premium access
  async hasPremiumAccess(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    return status.isActive;
  }

  // Helper method to get remaining trial days
  async getRemainingTrialDays(): Promise<number> {
    const status = await this.getSubscriptionStatus();
    if (!status.isTrialActive || !status.trialExpiresAt) {
      return 0;
    }
    
    const now = new Date();
    const diffTime = status.trialExpiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  // Method to confirm payment after Stripe payment succeeds
  async confirmPayment(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Confirming payment', { subscriptionId });
      
      // Sync with Stripe to get latest status
      await this.syncSubscriptionStatus();
      
      const status = await this.getSubscriptionStatus();
      if (status.isActive) {
        logger.info('Payment confirmed and subscription activated', { subscriptionId });
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Payment confirmation failed. Please contact support.'
        };
      }
    } catch (error) {
      logger.error('Error confirming payment', { error, subscriptionId });
      return {
        success: false,
        error: 'Failed to confirm payment. Please try again.'
      };
    }
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;