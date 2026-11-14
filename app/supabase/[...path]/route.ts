import { proxySupabase } from "@/lib/supabase/proxy";

// Supabase no mesmo endereço do site (ver lib/supabase/proxy.ts).
export const dynamic = "force-dynamic";

export const GET = proxySupabase;
export const HEAD = proxySupabase;
export const POST = proxySupabase;
export const PUT = proxySupabase;
export const PATCH = proxySupabase;
export const DELETE = proxySupabase;
export const OPTIONS = proxySupabase;
