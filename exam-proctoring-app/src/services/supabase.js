import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://evbhcfznkstyqnxxsckl.supabase.co'; // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmhjZnpua3N0eXFueHhzY2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0Nzk4NDEsImV4cCI6MjA2MzA1NTg0MX0.6pjHctFXNw99KNROnUwKQKLDm6mZ3PIZYFlcUMGp9Fo'; // Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
