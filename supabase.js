import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dlyhebypuholvobblaaj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseWhlYnlwdWhvbHZvYmJsYWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzY0OTEsImV4cCI6MjA5NzkxMjQ5MX0.Wd1fnt6fTspMiwWoN31AGJTWOrl2M7fkwWW2XGf2Ymk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
