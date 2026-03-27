import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xgruezbenfvnlrvnxyng.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncnVlemJlbmZ2bmxydm54eW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjI4MzUsImV4cCI6MjA5MDE5ODgzNX0.me3Wib7WTqzMie5uj8z97pqTdx8wEZZS7EwyKqCPhgA'

export const supabase = createClient(supabaseUrl, supabaseKey)