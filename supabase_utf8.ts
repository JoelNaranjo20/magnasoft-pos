export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activation_codes: {
        Row: {
          activated_at: string | null
          business_id: string | null
          code: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          hwid: string | null
          id: string
          max_devices: number | null
          status: string | null
        }
        Insert: {
          activated_at?: string | null
          business_id?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          hwid?: string | null
          id?: string
          max_devices?: number | null
          status?: string | null
        }
        Update: {
          activated_at?: string | null
          business_id?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          hwid?: string | null
          id?: string
          max_devices?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_req_logs: {
        Row: {
          attempt_at: string | null
          id: string
          ip: string | null
          serial: string
        }
        Insert: {
          attempt_at?: string | null
          id?: string
          ip?: string | null
          serial: string
        }
        Update: {
          attempt_at?: string | null
          id?: string
          ip?: string | null
          serial?: string
        }
        Relationships: []
      }
      business: {
        Row: {
          address: string | null
          business_type: string | null
          created_at: string | null
          email: string | null
          id: string
          location: string | null
          logo_url: string | null
          module_analytics: boolean | null
          module_inventory: boolean | null
          module_pos: boolean | null
          name: string
          owner_id: string | null
          phone: string | null
          pin: string | null
          plan: string | null
          slug: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          module_analytics?: boolean | null
          module_inventory?: boolean | null
          module_pos?: boolean | null
          name: string
          owner_id?: string | null
          phone?: string | null
          pin?: string | null
          plan?: string | null
          slug?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          module_analytics?: boolean | null
          module_inventory?: boolean | null
          module_pos?: boolean | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          pin?: string | null
          plan?: string | null
          slug?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          business_id: string
          created_at: string | null
          description: string | null
          id: string
          session_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          session_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          session_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          business_id: string
          cash_counts: Json | null
          closed_at: string | null
          closing_balance: number | null
          difference: number | null
          end_amount: number | null
          id: string
          manual_end_amount: number | null
          notes: string | null
          opened_at: string | null
          opening_balance: number | null
          start_amount: number | null
          status: string | null
          user_id: string | null
          worker_id: string | null
          worker_name: string | null
        }
        Insert: {
          business_id: string
          cash_counts?: Json | null
          closed_at?: string | null
          closing_balance?: number | null
          difference?: number | null
          end_amount?: number | null
          id?: string
          manual_end_amount?: number | null
          notes?: string | null
          opened_at?: string | null
          opening_balance?: number | null
          start_amount?: number | null
          status?: string | null
          user_id?: string | null
          worker_id?: string | null
          worker_name?: string | null
        }
        Update: {
          business_id?: string
          cash_counts?: Json | null
          closed_at?: string | null
          closing_balance?: number | null
          difference?: number | null
          end_amount?: number | null
          id?: string
          manual_end_amount?: number | null
          notes?: string | null
          opened_at?: string | null
          opening_balance?: number | null
          start_amount?: number | null
          status?: string | null
          user_id?: string | null
          worker_id?: string | null
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      central_cash_movements: {
        Row: {
          amount: number
          business_id: string
          created_at: string | null
          description: string | null
          id: string
          type: string
          user_id: string | null
          worker_name: string | null
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          type: string
          user_id?: string | null
          worker_name?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          type?: string
          user_id?: string | null
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "central_cash_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_debts: {
        Row: {
          amount: number
          business_id: string
          created_at: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          notes: string | null
          remaining_amount: number
          sale_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          remaining_amount: number
          sale_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          remaining_amount?: number
          sale_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_debts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_debts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_debts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_id: string
          created_at: string | null
          email: string | null
          id: string
          last_visit: string | null
          loyalty_points: number | null
          name: string
          phone: string | null
          total_visits: number | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          last_visit?: string | null
          loyalty_points?: number | null
          name: string
          phone?: string | null
          total_visits?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          last_visit?: string | null
          loyalty_points?: number | null
          name?: string
          phone?: string | null
          total_visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          business_id: string
          cash_session_id: string | null
          created_at: string | null
          created_by: string | null
          debt_id: string | null
          id: string
          notes: string | null
          payment_method: string
        }
        Insert: {
          amount: number
          business_id: string
          cash_session_id?: string | null
          created_at?: string | null
          created_by?: string | null
          debt_id?: string | null
          id?: string
          notes?: string | null
          payment_method: string
        }
        Update: {
          amount?: number
          business_id?: string
          cash_session_id?: string | null
          created_at?: string | null
          created_by?: string | null
          debt_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "customer_debts"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          business_id: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: string | null
          status: string | null
          token: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          token: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          barcode: string | null
          business_id: string
          category: string | null
          cost_price: number | null
          created_at: string | null
          id: string
          name: string
          price: number
          stock: number | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          business_id: string
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          name: string
          price: number
          stock?: number | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          business_id?: string
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
          stock?: number | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          saas_role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          saas_role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          saas_role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          business_id: string
          follower_id: string | null
          id: string
          name: string | null
          product_id: string | null
          quantity: number | null
          sale_id: string | null
          service_id: string | null
          service_type: string | null
          total_price: number | null
          unit_price: number
          worker_id: string | null
        }
        Insert: {
          business_id: string
          follower_id?: string | null
          id?: string
          name?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_id?: string | null
          service_id?: string | null
          service_type?: string | null
          total_price?: number | null
          unit_price: number
          worker_id?: string | null
        }
        Update: {
          business_id?: string
          follower_id?: string | null
          id?: string
          name?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_id?: string | null
          service_id?: string | null
          service_type?: string | null
          total_price?: number | null
          unit_price?: number
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          business_id: string
          created_at: string | null
          customer_id: string | null
          id: string
          payment_method: string | null
          session_id: string | null
          status: string | null
          total_amount: number
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          payment_method?: string | null
          session_id?: string | null
          status?: string | null
          total_amount: number
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          payment_method?: string | null
          session_id?: string | null
          status?: string | null
          total_amount?: number
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_queue: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          license_plate: string
          status: string
          updated_at: string | null
          worker_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          license_plate: string
          status?: string
          updated_at?: string | null
          worker_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          license_plate?: string
          status?: string
          updated_at?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_queue_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_queue_items: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number | null
          queue_id: string | null
          service_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          queue_id?: string | null
          service_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          queue_id?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_queue_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_queue_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_queue_items_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "service_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_queue_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          business_id: string
          category: string | null
          code: string | null
          color: string | null
          commission_percentage: number | null
          created_at: string | null
          description: string | null
          id: string
          is_variable_price: boolean | null
          name: string
          price: number
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          category?: string | null
          code?: string | null
          color?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_variable_price?: boolean | null
          name: string
          price: number
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          category?: string | null
          code?: string | null
          color?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_variable_price?: boolean | null
          name?: string
          price?: number
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          business_id: string
          color: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          license_plate: string
          model: string | null
          type: string | null
        }
        Insert: {
          brand?: string | null
          business_id: string
          color?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          license_plate: string
          model?: string | null
          type?: string | null
        }
        Update: {
          brand?: string | null
          business_id?: string
          color?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          license_plate?: string
          model?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_commissions: {
        Row: {
          base_amount: number | null
          business_id: string
          commission_amount: number | null
          commission_percentage: number | null
          created_at: string | null
          id: number
          paid_at: string | null
          sale_id: string | null
          sale_item_id: string | null
          service_type: string | null
          status: string | null
          worker_id: string | null
        }
        Insert: {
          base_amount?: number | null
          business_id: string
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string | null
          id?: number
          paid_at?: string | null
          sale_id?: string | null
          sale_item_id?: string | null
          service_type?: string | null
          status?: string | null
          worker_id?: string | null
        }
        Update: {
          base_amount?: number | null
          business_id?: string
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string | null
          id?: number
          paid_at?: string | null
          sale_id?: string | null
          sale_item_id?: string | null
          service_type?: string | null
          status?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_commissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_commissions_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_commissions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_loan_payments: {
        Row: {
          amount: number
          business_id: string
          cash_session_id: string | null
          created_at: string | null
          id: string
          loan_id: string | null
          notes: string | null
          type: string | null
        }
        Insert: {
          amount: number
          business_id: string
          cash_session_id?: string | null
          created_at?: string | null
          id?: string
          loan_id?: string | null
          notes?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          cash_session_id?: string | null
          created_at?: string | null
          id?: string
          loan_id?: string | null
          notes?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_loan_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_loan_payments_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "worker_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_loans: {
        Row: {
          amount: number
          business_id: string
          created_at: string | null
          id: string
          notes: string | null
          pending_deduction_amount: number | null
          reason: string | null
          request_date: string | null
          status: string | null
          total_paid: number | null
          updated_at: string | null
          worker_id: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          pending_deduction_amount?: number | null
          reason?: string | null
          request_date?: string | null
          status?: string | null
          total_paid?: number | null
          updated_at?: string | null
          worker_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          pending_deduction_amount?: number | null
          reason?: string | null
          request_date?: string | null
          status?: string | null
          total_paid?: number | null
          updated_at?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_loans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_loans_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          active: boolean | null
          business_id: string
          created_at: string | null
          id: string
          name: string
          phone: string | null
          pin: string | null
          role: string | null
          role_id: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          pin?: string | null
          role?: string | null
          role_id?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          pin?: string | null
          role?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_business_access: {
        Args: { row_business_id: string }
        Returns: boolean
      }
      create_saas_policy: {
        Args: { policy_name: string; tbl: string }
        Returns: undefined
      }
      deduct_product_stock: {
        Args: { p_id: string; p_quantity: number }
        Returns: undefined
      }
      get_auth_business_id: { Args: never; Returns: string }
      get_my_business_id: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
      process_debt_payment: {
        Args: {
          p_amount: number
          p_cash_session_id: string
          p_created_by?: string
          p_debt_id: string
          p_notes?: string
          p_payment_method: string
        }
        Returns: {
          message: string
          new_remaining_amount: number
          new_status: string
          payment_id: string
          result_debt_id: string
          success: boolean
        }[]
      }
      provision_device_user: {
        Args: { p_hwid: string; p_serial: string }
        Returns: Json
      }
      request_loan_deduction: {
        Args: { p_amount: number; p_loan_id: string }
        Returns: Json
      }
    }
    Enums: {
      user_role: "super_admin" | "owner" | "admin" | "worker"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["super_admin", "owner", "admin", "worker"],
    },
  },
} as const
