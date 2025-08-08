import { Platform } from 'react-native';
import { initStripe, useStripe, PaymentSheet } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { logger } from './logger';
import { errorHandler } from './error-handler';

export interface PaymentIntentResponse {
  clientSecret: string;
  customerId?: string;
}

export interface SubscriptionResponse {
  subscriptionId: string;
  clientSecret: string;
  customerId: string;
}

class StripeService {
  private isInitialized = false;
  private readonly publishableKey: string;
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor() {
    this.publishableKey = Constants.expoConfig?.extra?.stripePublishableKey || 
                        process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    this.secretKey = process.env.STRIPE_SECRET_KEY || '';
    
    if (!this.publishableKey) {
      logger.error('Stripe publishable key not found');
    }
    if (!this.secretKey) {
      logger.error('Stripe secret key not found');
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || !this.publishableKey) {
      return;
    }

    try {
      await initStripe({
        publishableKey: this.publishableKey,
        merchantIdentifier: 'merchant.com.glowapp', // Replace with your merchant ID
        urlScheme: 'glowapp', // Replace with your app's URL scheme
      });
      
      this.isInitialized = true;
      logger.info('Stripe initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Stripe', { error });
      throw error;
    }
  }

  private async makeStripeRequest(endpoint: string, data: Record<string, any>): Promise<any> {
    try {
      const formData = new URLSearchParams();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key].toString());
        }
      });

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Stripe API error');
      }

      return result;
    } catch (error) {
      logger.error('Stripe API request failed', { endpoint, error });
      throw error;
    }
  }

  async createCustomer(email: string, name?: string): Promise<{ id: string }> {
    try {
      const customer = await this.makeStripeRequest('/customers', {
        email,
        name: name || email.split('@')[0],
        metadata: {
          app: 'glow-app',
          created_at: new Date().toISOString(),
        },
      });

      logger.info('Stripe customer created', { customerId: customer.id, email });
      return customer;
    } catch (error) {
      logger.error('Failed to create Stripe customer', { error, email });
      throw error;
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    customerId?: string
  ): Promise<PaymentIntentResponse> {
    try {
      const paymentIntent = await this.makeStripeRequest('/payment_intents', {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          app: 'glow-app',
          type: 'one-time-payment',
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        customerId: paymentIntent.customer,
      };
    } catch (error) {
      logger.error('Failed to create payment intent', { error, amount, currency });
      throw error;
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    trialPeriodDays?: number
  ): Promise<SubscriptionResponse> {
    try {
      const subscriptionData: any = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          app: 'glow-app',
          created_at: new Date().toISOString(),
        },
      };

      if (trialPeriodDays && trialPeriodDays > 0) {
        subscriptionData.trial_period_days = trialPeriodDays;
      }

      const subscription = await this.makeStripeRequest('/subscriptions', subscriptionData);

      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        customerId,
      };
    } catch (error) {
      logger.error('Failed to create subscription', { error, customerId, priceId });
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.makeStripeRequest(`/subscriptions/${subscriptionId}`, {
        cancel_at_period_end: true,
      });
      
      logger.info('Subscription cancelled', { subscriptionId });
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, subscriptionId });
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get subscription', { error, subscriptionId });
      throw error;
    }
  }

  // Create products and prices (run this once to set up your products)
  async createProduct(name: string, description: string): Promise<{ id: string }> {
    try {
      const product = await this.makeStripeRequest('/products', {
        name,
        description,
        metadata: {
          app: 'glow-app',
        },
      });

      logger.info('Stripe product created', { productId: product.id, name });
      return product;
    } catch (error) {
      logger.error('Failed to create product', { error, name });
      throw error;
    }
  }

  async createPrice(
    productId: string,
    amount: number,
    currency: string = 'usd',
    interval: 'month' | 'year' = 'month'
  ): Promise<{ id: string }> {
    try {
      const price = await this.makeStripeRequest('/prices', {
        product: productId,
        unit_amount: Math.round(amount * 100), // Convert to cents
        currency,
        recurring: {
          interval,
        },
        metadata: {
          app: 'glow-app',
        },
      });

      logger.info('Stripe price created', { priceId: price.id, amount, interval });
      return price;
    } catch (error) {
      logger.error('Failed to create price', { error, productId, amount });
      throw error;
    }
  }

  // Setup method to create all necessary products and prices
  async setupProducts(): Promise<{
    monthlyPriceId: string;
    yearlyPriceId: string;
  }> {
    try {
      // Create the main product
      const product = await this.createProduct(
        'Glow Premium',
        'Premium access to personalized AI beauty coaching and advanced skin analysis'
      );

      // Create monthly price
      const monthlyPrice = await this.createPrice(product.id, 9.99, 'usd', 'month');
      
      // Create yearly price
      const yearlyPrice = await this.createPrice(product.id, 99.99, 'usd', 'year');

      logger.info('Stripe products and prices set up successfully', {
        productId: product.id,
        monthlyPriceId: monthlyPrice.id,
        yearlyPriceId: yearlyPrice.id,
      });

      return {
        monthlyPriceId: monthlyPrice.id,
        yearlyPriceId: yearlyPrice.id,
      };
    } catch (error) {
      logger.error('Failed to setup products', { error });
      throw error;
    }
  }
}

export const stripeService = new StripeService();
export default stripeService;

// Hook for using Stripe in components
export function useStripePayment() {
  const stripe = useStripe();
  
  const processPayment = async (clientSecret: string) => {
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const { error } = await stripe.confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      logger.error('Payment processing failed', { error });
      throw error;
    }
  };

  const processSubscription = async (clientSecret: string) => {
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const { error } = await stripe.confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      logger.error('Subscription processing failed', { error });
      throw error;
    }
  };

  return {
    processPayment,
    processSubscription,
    isReady: !!stripe,
  };
}