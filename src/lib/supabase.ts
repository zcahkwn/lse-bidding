import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database types
export interface Database {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string
          name: string
          password: string
          reward_title: string
          reward_description: string
          capacity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          password: string
          reward_title?: string
          reward_description?: string
          capacity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          password?: string
          reward_title?: string
          reward_description?: string
          capacity?: number
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          class_id: string
          name: string
          email: string
          has_used_token: boolean
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          name: string
          email: string
          has_used_token?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          name?: string
          email?: string
          has_used_token?: boolean
          created_at?: string
        }
      }
      bid_opportunities: {
        Row: {
          id: string
          class_id: string
          title: string
          description: string
          dinner_date: string
          bid_open_date: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          title: string
          description: string
          dinner_date: string
          bid_open_date: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          title?: string
          description?: string
          dinner_date?: string
          bid_open_date?: string
          is_active?: boolean
          created_at?: string
        }
      }
      bids: {
        Row: {
          id: string
          student_id: string
          opportunity_id: string
          bid_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          opportunity_id: string
          bid_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          opportunity_id?: string
          bid_amount?: number
          created_at?: string
        }
      }
      selections: {
        Row: {
          id: string
          opportunity_id: string
          student_id: string
          selected_at: string
        }
        Insert: {
          id?: string
          opportunity_id: string
          student_id: string
          selected_at?: string
        }
        Update: {
          id?: string
          opportunity_id?: string
          student_id?: string
          selected_at?: string
        }
      }
    }
  }
}