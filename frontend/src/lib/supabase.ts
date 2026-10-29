import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zbavaliglpbpzonmjuke.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYXZhbGlnbHBicHpvbm1qdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODIwNzksImV4cCI6MjA5OTU1ODA3OX0.dhIu32z9PxhOW5EdGWb3RSdJbGGyH4Ui3WFR8MzwCgc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
