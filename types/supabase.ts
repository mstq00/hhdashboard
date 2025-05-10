export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          option: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          option?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          option?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sheet_mappings: {
        Row: {
          id: string
          product_id: string
          original_name: string | null
          original_option: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          original_name?: string | null
          original_option?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          original_name?: string | null
          original_option?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_mappings_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      channel_pricing: {
        Row: {
          id: string
          product_id: string
          channel: string | null
          fee: number | null
          selling_price: number | null
          supply_price: number | null
          start_date: string | null
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          channel?: string | null
          fee?: number | null
          selling_price?: number | null
          supply_price?: number | null
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          channel?: string | null
          fee?: number | null
          selling_price?: number | null
          supply_price?: number | null
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_pricing_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      memos: {
        Row: {
          id: string
          product_id: string
          content: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          content?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memos_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 