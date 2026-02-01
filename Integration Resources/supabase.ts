/**
 * Supabase Configuration
 * 
 * This file initializes the Supabase client for database operations and authentication.
 * Using Supabase Auth provides secure password hashing (bcrypt), JWT sessions, and more.
 * 
 * SECURITY: Uses SecureStore (Keychain/Keystore) for session storage instead of AsyncStorage.
 * AsyncStorage is unencrypted and should NOT be used for tokens or sensitive data.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Database } from './supabase.types';

// Supabase project credentials
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || 'https://sxucfwshtvskoqvisbeu.supabase.co';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || 'sb_publishable_asZW_2Wkn-ofTq_LsqUxhw_GvSv0J_K';

/**
 * SecureStore adapter for Supabase Auth (native only)
 * Stores JWT tokens in encrypted platform storage (Keychain on iOS, Keystore on Android)
 * On web, falls back to localStorage (less secure but functional)
 */
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        // Web uses localStorage (less secure but functional)
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

// Create Supabase client with SecureStore for encrypted session persistence
export const supabase: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable URL detection on web for OAuth callbacks
  },
});

// Export URLs for reference
export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

export default supabase;
