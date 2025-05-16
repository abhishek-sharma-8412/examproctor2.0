import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dabnsahtfsxmcwnfbtpo.supabase.co'; // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhYm5zYWh0ZnN4bWN3bmZidHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNDgxMjgsImV4cCI6MjA1ODYyNDEyOH0.MfNt_vRqTsGx39q5LEMyGEkhRYy6QcBm2LrDxH-wpuQ'; // Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
