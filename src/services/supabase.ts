import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fgmkoopmlbkyibxkqpbi.supabase.co'
const supabaseKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnbWtvb3BtbGJreWlieGtxcGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyODM2NzksImV4cCI6MjA3Mzg1OTY3OX0.5eEeA-XZLdvPvqsEq6_wtj6z6nkjwXfoOdGs6Gvzty4"

export const supabase = createClient(supabaseUrl, supabaseKey)
