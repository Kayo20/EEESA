import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://umkvxtuuqodyhrbtehma.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVta3Z4dHV1cW9keWhyYnRlaG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MjU2OTAsImV4cCI6MjA4ODUwMTY5MH0.C3S848uVhDwJmQ2FtlwV59iRlE39CPAtybSs_zzCaWw';

// Validate credentials
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing!');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'studentconnect'
    }
  }
});

// Test connection
supabase.auth.getSession().then(({ error }) => {
  if (error) {
    console.error('Supabase connection error:', error.message);
  } else {
    console.log('Supabase connected successfully');
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tables = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Enums = any;
