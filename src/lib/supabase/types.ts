export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Replace this placeholder with generated Supabase types after the first schema exists.
 * Keeping it intentionally empty prevents the mock frontend from pretending tables exist.
 */
export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
