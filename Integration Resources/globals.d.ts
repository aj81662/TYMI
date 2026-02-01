// Minimal ambient module declarations to allow local typechecking of Integration Resources
declare module '@supabase/supabase-js' {
  export type Session = any;
  export type User = any;
  export type AuthChangeEvent = string;
  export type SupabaseClient<T = any> = any;
  export function createClient<T = any>(url: string, key: string, opts?: any): SupabaseClient<T>;
  export function SupabaseClient(...args: any[]): any;
}
declare module '@react-native-async-storage/async-storage';
declare module 'expo-secure-store';
declare module 'expo-constants';
declare module 'react-native';

// Provide basic DOM/ES types if not present
interface PromiseConstructor {
  all<T>(values: (T | Promise<T>)[]): Promise<T[]>;
}
