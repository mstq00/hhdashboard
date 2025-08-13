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
      orders: {
        Row: {
          id: number
          channel: string
          order_number: string
          order_date: string | null
          status: string | null
          quantity: number
          product_name: string | null
          product_option: string | null
          customer_name: string | null
          customer_phone: string | null
          unit_price: number | null
          total_price: number | null
          product_id: string | null
          option_id: string | null
          recipient_name: string | null
          recipient_phone: string | null
          recipient_address: string | null
          recipient_zipcode: string | null
          shipping_cost: number | null
          assembly_cost: number | null
          settlement_amount: number | null
          tracking_number: string | null
          courier_company: string | null
          claim_status: string | null
          delivery_message: string | null
          purchase_confirmation_date: string | null
          shipment_date: string | null
          payment_completion_date: string | null
          buyer_id: string | null
          payment_method: string | null
          customs_clearance_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          channel: string
          order_number: string
          order_date?: string | null
          status?: string | null
          quantity?: number
          product_name?: string | null
          product_option?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          unit_price?: number | null
          total_price?: number | null
          product_id?: string | null
          option_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_address?: string | null
          recipient_zipcode?: string | null
          shipping_cost?: number | null
          assembly_cost?: number | null
          settlement_amount?: number | null
          tracking_number?: string | null
          courier_company?: string | null
          claim_status?: string | null
          delivery_message?: string | null
          purchase_confirmation_date?: string | null
          shipment_date?: string | null
          payment_completion_date?: string | null
          buyer_id?: string | null
          payment_method?: string | null
          customs_clearance_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          channel?: string
          order_number?: string
          order_date?: string | null
          status?: string | null
          quantity?: number
          product_name?: string | null
          product_option?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          unit_price?: number | null
          total_price?: number | null
          product_id?: string | null
          option_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_address?: string | null
          recipient_zipcode?: string | null
          shipping_cost?: number | null
          assembly_cost?: number | null
          settlement_amount?: number | null
          tracking_number?: string | null
          courier_company?: string | null
          claim_status?: string | null
          delivery_message?: string | null
          purchase_confirmation_date?: string | null
          shipment_date?: string | null
          payment_completion_date?: string | null
          buyer_id?: string | null
          payment_method?: string | null
          customs_clearance_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      channel_default_passwords: {
        Row: {
          id: number
          channel: string
          password: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          channel: string
          password: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          channel?: string
          password?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_channel_passwords: {
        Row: {
          id: number
          user_id: string
          channel: string
          password: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          channel: string
          password: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          channel?: string
          password?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_uploads: {
        Row: {
          id: number
          user_id: string
          channel: string
          file_name: string
          file_size: number
          total_rows: number
          new_rows: number
          duplicate_rows: number
          upload_status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          channel: string
          file_name: string
          file_size: number
          total_rows: number
          new_rows: number
          duplicate_rows: number
          upload_status?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          channel?: string
          file_name?: string
          file_size?: number
          total_rows?: number
          new_rows?: number
          duplicate_rows?: number
          upload_status?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      channel_mappings: {
        Row: {
          id: number
          channel: string
          excel_column: string
          database_column: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          channel: string
          excel_column: string
          database_column: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          channel?: string
          excel_column?: string
          database_column?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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