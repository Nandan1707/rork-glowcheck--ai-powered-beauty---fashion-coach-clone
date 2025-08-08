import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { CONFIG } from './config';
import { logger } from './logger';

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
  private readonly mockMode: boolean;

  constructor() {
    this.publishableKey = CONFIG.STRIPE.PUBLISHABLE_KEY;
    this.mockMode = CONFIG.FEATURES.USE_MOCK_DATA || !this.publishableKey;
    
    if (!this.publishableKey && !this.mockMode) {
      logger.error('Stripe publishable key not found');
    }
    
    if (this.mockMode) {
      logger.info('Stripe running in mock mode for development');
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

  // Mock implementation for development
  // In production, these operations should be handled by your backend API
  private async mockStripeOperation(operation: string, data: any): Promise<any> {
    logger.info(`Mock Stripe operation: ${operation}`, data);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    switch (operation) {
      case 'createCustomer':
        return {
          id: `cus_mock_${Date.now()}`,
          email: data.email,
          created: Math.floor(Date.now() / 1000),
        };
      
      case 'createPaymentIntent':
        return {
          id: `pi_mock_${Date.now()}`,
          client_secret: `pi_mock_${Date.now()}_secret_mock`,
          amount: data.amount,
          currency: data.currency,
          status: 'requires_payment_method',
        };
      
      case 'createSubscription':
        return {
          id: `sub_mock_${Date.now()}`,
          latest_invoice: {
            payment_intent: {
              client_secret: `pi_mock_${Date.now()}_secret_mock`,
            },
          },
          status: 'active',
        };
      
      default:
        return { success: true };
    }
  }

  async createCustomer(email: string, name?: string): Promise<{ id: string }> {
    try {
      if (this.mockMode) {
        const customer = await this.mockStripeOperation('createCustomer', {
          email,
          name: name || email.split('@')[0],
        });
        logger.info('Mock Stripe customer created', { customerId: customer.id, email });
        return customer;
      }
      
      // In production, this should call your backend API
      // which then makes the actual Stripe API call with the secret key
      throw new Error('Backend API required for production Stripe operations');
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
      if (this.mockMode) {
        const paymentIntent = await this.mockStripeOperation('createPaymentIntent', {
          amount: Math.round(amount * 100),
          currency,
          customer: customerId,
        });
        
        return {
          clientSecret: paymentIntent.client_secret,
          customerId: paymentIntent.customer,
        };
      }
      
      // In production, this should call your backend API
      throw new Error('Backend API required for production Stripe operations');
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
      if (this.mockMode) {
        const subscription = await this.mockStripeOperation('createSubscription', {
          customer: customerId,
          price: priceId,
          trial_period_days: trialPeriodDays,
        });
        
        return {
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice.payment_intent.client_secret,
          customerId,
        };
      }
      
      // In production, this should call your backend API
      throw new Error('Backend API required for production Stripe operations');
    } catch (error) {
      logger.error('Failed to create subscription', { error, customerId, priceId });
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      if (this.mockMode) {
        await this.mockStripeOperation('cancelSubscription', { subscriptionId });
        logger.info('Mock subscription cancelled', { subscriptionId });
        return;
      }
      
      // In production, this should call your backend API
      throw new Error('Backend API required for production Stripe operations');
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, subscriptionId });
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      if (this.mockMode) {
        return {
          id: subscriptionId,
          status: 'active',
          current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
          cancel_at_period_end: false,
        };
      }
      
      // In production, this should call your backend API
      throw new Error('Backend API required for production Stripe operations');
    } catch (error) {
      logger.error('Failed to get subscription', { error, subscriptionId });
      throw error;
    }
  }

  // Create products and prices (run this once to set up your products)
  async createProduct(name: string, description: string): Promise<{ id: string }> {
    try {
      if (this.mockMode) {
        const product = {
          id: `prod_mock_${Date.now()}`,
          name,
          description,
        };
        logger.info('Mock Stripe product created', { productId: product.id, name });
        return product;
      }
      
      // In production, this should call your backend API
      throw new Error('Backend API required for production Stripe operations');
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
      if (this.mockMode) {
        const price = {
          id: `price_mock_${interval}_${Date.now()}`,
          product: productId,
          unit_amount: Math.round(amount * 100),
          currency,
          recurring: { interval },
        };
        logger.info('Mock Stripe price created', { priceId: price.id, amount, interval });
        return price;
      }
      
      // In production, this should call your backend API
      throw new Error('Backend API required for production Stripe operations');
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
      if (this.mockMode) {
        // Return mock price IDs for development
        return {
          monthlyPriceId: 'price_mock_monthly_999',
          yearlyPriceId: 'price_mock_yearly_9999',
        };
      }
      
      // In production, this should call your backend API
      throw new Error('Backend API required for production Stripe operations');
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
    if (!stripe && !CONFIG.FEATURES.USE_MOCK_DATA) {
      throw new Error('Stripe not initialized');
    }

    try {
      if (CONFIG.FEATURES.USE_MOCK_DATA) {
        // Mock payment processing
        logger.info('Mock payment processing', { clientSecret });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
        return { success: true };
      }

      const { error } = await stripe!.confirmPayment(clientSecret, {
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
    if (!stripe && !CONFIG.FEATURES.USE_MOCK_DATA) {
      throw new Error('Stripe not initialized');
    }

    try {
      if (CONFIG.FEATURES.USE_MOCK_DATA) {
        // Mock subscription processing
        logger.info('Mock subscription processing', { clientSecret });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
        return { success: true };
      }

      const { error } = await stripe!.confirmPayment(clientSecret, {
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
    isReady: !!stripe || CONFIG.FEATURES.USE_MOCK_DATA,
  };
}