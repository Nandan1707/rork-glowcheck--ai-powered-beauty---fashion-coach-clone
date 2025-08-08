import Constants from 'expo-constants';

// Production-ready configuration management
export const CONFIG = {
  // Supabase Configuration
  SUPABASE: {
    URL: Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    ANON_KEY: Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  
  // AI Service Configuration
  AI: {
    OPENAI_API_KEY: Constants.expoConfig?.extra?.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    GOOGLE_VISION_API_KEY: Constants.expoConfig?.extra?.googleVisionApiKey || process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '',
    RORK_AI_BASE_URL: 'https://toolkit.rork.com',
  },
  
  // AWS Configuration
  AWS: {
    REGION: Constants.expoConfig?.extra?.awsRegion || process.env.EXPO_PUBLIC_AWS_REGION || 'eu-north-1',
    S3_BUCKET_NAME: Constants.expoConfig?.extra?.awsS3BucketName || process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME || '',
    ACCESS_KEY_ID: Constants.expoConfig?.extra?.awsAccessKeyId || process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID || '',
    SECRET_ACCESS_KEY: Constants.expoConfig?.extra?.awsSecretAccessKey || process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
  
  // App Configuration
  APP: {
    NAME: 'GlowCheck',
    VERSION: Constants.expoConfig?.version || '1.0.0',
    IS_DEV: __DEV__,
    IS_PRODUCTION: !__DEV__,
    BUILD_NUMBER: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
    BUNDLE_ID: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package || 'com.glowcheck.app',
  },
  
  // Feature Flags
  FEATURES: {
    ENABLE_ANALYTICS: !__DEV__,
    ENABLE_CRASH_REPORTING: !__DEV__,
    ENABLE_PERFORMANCE_MONITORING: !__DEV__,
    USE_MOCK_DATA: __DEV__ && !process.env.EXPO_PUBLIC_USE_REAL_APIS,
    ENABLE_OFFLINE_MODE: true,
    ENABLE_BIOMETRIC_AUTH: true,
    ENABLE_PUSH_NOTIFICATIONS: true,
  },
  
  // API Configuration
  API: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },
  
  // Storage Configuration
  STORAGE: {
    MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Stripe Configuration
  STRIPE: {
    PUBLISHABLE_KEY: Constants.expoConfig?.extra?.stripePublishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    // Note: Secret key should never be used in client-side code
    // For server-side operations, use a backend API
  },
};

// Validation function to check required configuration
export const validateConfig = () => {
  const errors: string[] = [];
  
  if (!CONFIG.SUPABASE.URL) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is required');
  }
  
  if (!CONFIG.SUPABASE.ANON_KEY) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  
  if (!CONFIG.AI.GOOGLE_VISION_API_KEY && !CONFIG.FEATURES.USE_MOCK_DATA) {
    errors.push('EXPO_PUBLIC_GOOGLE_VISION_API_KEY is required for production');
  }
  
  if (!CONFIG.AWS.S3_BUCKET_NAME && !CONFIG.FEATURES.USE_MOCK_DATA) {
    errors.push('EXPO_PUBLIC_AWS_S3_BUCKET_NAME is required for production');
  }
  
  if (errors.length > 0 && CONFIG.APP.IS_PRODUCTION) {
    throw new Error('Configuration errors: ' + errors.join(', '));
  }
  
  if (errors.length > 0 && CONFIG.APP.IS_DEV) {
    console.warn('Configuration warnings:', errors.join(', '));
    console.warn('Using mock data for development');
  }
  
  return errors.length === 0;
};

// Initialize configuration validation
validateConfig();