import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://qznxqgavwemplturysql.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bnhxZ2F2d2VtcGx0dXJ5c3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Mjk2NzEsImV4cCI6MjA4NTQwNTY3MX0.MZGdVpbIw6vfLYHcCsTelWzTsp2CR2rjeOWbuTRu77Y";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
