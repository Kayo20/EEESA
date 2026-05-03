import { createClient } from '@supabase/supabase-js';

const url = 'https://umkvxtuuqodyhrbtehma.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJzYSIsInJlZiI6InVta3Z4dHV1cW9keWhyYnRlaG1hIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NzI5MjU2OTAsImV4cCI6MjA4ODUwMTY5MH0.C3S848uVhDwJmQ2FtlwV59iRlE39CPAtybSs_zzCaWw';
const supabase = createClient(url, key);

const main = async () => {
  const { data, error } = await supabase.from('profiles').select('id, username, full_name, created_at').limit(20);
  console.log('error:', error);
  console.log('count:', data?.length);
  console.log(JSON.stringify(data, null, 2));
};

main().catch((err) => {
  console.error('script error:', err);
  process.exit(1);
});
