import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  throw new Error(error.message || 'An error occurred while accessing the database')
}

// Example helper for data fetching
export async function fetchFromSupabase(table: string, query: any = {}) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(query.select || '*')
      .match(query.match || {})
      
    if (error) throw error
    return data
  } catch (error) {
    handleSupabaseError(error)
  }
} 