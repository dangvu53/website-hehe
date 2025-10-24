import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://vwuqhyugnebddgjtsyln.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dXFoeXVnbmViZGRnanRzeWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxODM5NTcsImV4cCI6MjA1Nzc1OTk1N30.9_cx9vR1fvHKdqDLhFKsxozNlC4CkS90nQAXu54tiyk";
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
