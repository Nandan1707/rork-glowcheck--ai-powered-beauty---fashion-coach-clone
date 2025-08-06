import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { errorHandler } from './error-handler';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: 'monthly' | 'yearly';
  features: string[];
  trialDays?: number;
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan?: SubscriptionPlan;
  expiresAt?: Date;
  isTrialActive?: boolean;
  trialExpiresAt?: Date;
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

  async startFreeTrial(planId: string = 'premium_monthly'): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Starting free trial', { planId });
      
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
      if (!plan || !plan.trialDays) {
        return {
          success: false,
          error: 'Trial not available for this plan.'
        };
      }
      
      // Simulate subscription API call
      await this.simulateSubscriptionAPI('start_trial', { planId });
      
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + plan.trialDays);
      
      // Store trial status
      const trialStatus = {
        planId,
        startedAt: new Date().toISOString(),
        expiresAt: trialExpiresAt.toISOString(),
        used: true
      };
      
      await AsyncStorage.setItem(this.TRIAL_STORAGE_KEY, JSON.stringify(trialStatus));
      
      logger.info('Free trial started successfully', { planId, expiresAt: trialExpiresAt });
      
      return { success: true };
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

  async subscribeToPlan(planId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Starting subscription', { planId });
      
      const plan = this.plans.find(p => p.id === planId);
      if (!plan) {
        return {
          success: false,
          error: 'Plan not found.'
        };
      }
      
      // Simulate subscription API call
      await this.simulateSubscriptionAPI('subscribe', { planId });
      
      const expiresAt = new Date();
      if (plan.duration === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      
      const subscriptionStatus: SubscriptionStatus = {
        isActive: true,
        plan,
        expiresAt
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        ...subscriptionStatus,
        expiresAt: expiresAt.toISOString()
      }));
      
      logger.info('Subscription successful', { planId, expiresAt });
      
      return { success: true };
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
      
      // Simulate API call
      await this.simulateSubscriptionAPI('cancel', {});
      
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

  private async simulateSubscriptionAPI(action: string, data: any): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error(`Simulated ${action} API failure`);
    }
    
    logger.info('Subscription API call successful', { action, data });
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
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;