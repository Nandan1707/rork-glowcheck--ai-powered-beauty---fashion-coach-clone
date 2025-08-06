import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables with fallbacks for development
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  'https://uimtqaqgdqiytyqfyyzj.supabase.co';
  
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbXRxYXFnZGRpeXR5cWZ5eXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MjU0NzQsImV4cCI6MjA0OTAwMTQ3NH0.Gc5IlgEzndGmWjl8C3F8CZYYB52qrUmaqGnMSmWZpKk';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Using fallback values for development.');
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Supabase sign in error:', error);
      
      // Handle specific error types
      if (error.message.includes('Invalid login credentials')) {
        return { data: null, error: { ...error, message: 'Invalid email or password' } };
      }
      
      if (error.message.includes('Email not confirmed')) {
        return { data: null, error: { ...error, message: 'Please check your email and confirm your account' } };
      }
      
      // Network or other errors
      return { data: null, error: { ...error, message: 'Network error, please try again later' } };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Network error during sign in:', err);
    return { 
      data: null, 
      error: { 
        message: 'Network error, please try again later',
        details: err 
      } 
    };
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}