// full contents copied from music-app-ui/js/supabase.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://your-project-ref.supabase.co";
const supabaseAnonKey = "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
