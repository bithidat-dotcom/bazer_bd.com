import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  "https://jtpdctskvcaxbnmffrst.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cGRjdHNrdmNheGJubWZmcnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDExNjYsImV4cCI6MjA5NTI3NzE2Nn0.p5GZvXwyDPvxOlc-GTj9HccfYEX6YXDy0Ztu7v_hoFQ"
);
