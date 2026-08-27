import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xzghqzczdjmujcevcvnz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Z2hxemN6ZGptdWpjZXZjdm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MjQzODAsImV4cCI6MjEwMzQwMDM4MH0.2dcWBOEnlAr0hKIPjD_HklqcffiOqSzcF2KTmY_qLlk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
