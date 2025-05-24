import 'react-native-url-polyfill/auto'; // MUST be at the top for Supabase Auth to work on native
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Import environment variables using react-native-dotenv
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Basic check to ensure variables are loaded
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const message = `Supabase URL or Anon Key is missing from .env file.
  Current URL: ${SUPABASE_URL}
  Current Key: ${SUPABASE_ANON_KEY ? 'Exists (not logged for security)' : 'MISSING'}`;
  console.error(message);
  // In a real app, you might throw an error or have a fallback
  // For now, we'll let it proceed, but createClient will likely fail
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage, // Use AsyncStorage for session persistence in React Native
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Crucial for React Native: disable URL-based session detection
  },
});