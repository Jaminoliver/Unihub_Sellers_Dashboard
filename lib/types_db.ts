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
          description: string
          price: number
          stock_quantity: number
          category_id: string
          seller_id: string
          university_id: string
          image_urls: string[]
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          price: number
          stock_quantity: number
          category_id: string
          seller_id: string
          university_id: string
          image_urls: string[]
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          stock_quantity?: number
          category_id?: string
          seller_id?: string
          university_id?: string
          image_urls?: string[]
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sellers: {
        Row: {
          id: string
          user_id: string
          university_id: string
          created_at: string
          // New Ledger Fields
          available_balance: number
          pending_balance: number
          // Legacy field (kept for compatibility)
          wallet_balance?: number
          // Bank Fields
          bank_name?: string | null
          account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          bank_verified?: boolean
        }
        Insert: {
          id?: string
          user_id: string
          university_id: string
          created_at?: string
          available_balance?: number
          pending_balance?: number
          wallet_balance?: number
          bank_name?: string | null
          account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          bank_verified?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          university_id?: string
          created_at?: string
          available_balance?: number
          pending_balance?: number
          wallet_balance?: number
          bank_name?: string | null
          account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          bank_verified?: boolean
        }
      }
      wallet_transactions: {
        Row: {
          id: string
          seller_id: string
          amount: number
          // Corrected to match your DB column 'transaction_type'
          transaction_type: 'credit' | 'debit' | 'withdrawal' | 'release' | 'refund'
          status: 'pending' | 'cleared' | 'failed' | 'cancelled' | 'completed'
          description: string | null
          // Corrected to match your DB column 'reference'
          reference: string | null
          // New fields
          clears_at: string | null
          balance_after: number | null
          created_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          amount: number
          transaction_type: 'credit' | 'debit' | 'withdrawal' | 'release' | 'refund'
          status: 'pending' | 'cleared' | 'failed' | 'cancelled' | 'completed'
          description?: string | null
          reference?: string | null
          clears_at?: string | null
          balance_after?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          amount?: number
          transaction_type?: 'credit' | 'debit' | 'withdrawal' | 'release' | 'refund'
          status?: 'pending' | 'cleared' | 'failed' | 'cancelled' | 'completed'
          description?: string | null
          reference?: string | null
          clears_at?: string | null
          balance_after?: number | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      withdrawal_requests: {
        Row: {
          id: string
          seller_id: string
          amount: number
          bank_name: string
          account_number: string
          account_name: string
          bank_code: string
          status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'processing' | 'failed' | 'on_hold'
          failure_reason?: string | null
          rejected_reason?: string | null
          admin_notes?: string | null
          processed_at?: string | null
          rejected_at?: string | null
          paystack_transfer_code?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          amount: number
          bank_name: string
          account_number: string
          account_name: string
          bank_code: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'processing' | 'failed' | 'on_hold'
          failure_reason?: string | null
          rejected_reason?: string | null
          admin_notes?: string | null
          processed_at?: string | null
          rejected_at?: string | null
          paystack_transfer_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          amount?: number
          bank_name?: string
          account_number?: string
          account_name?: string
          bank_code?: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'processing' | 'failed' | 'on_hold'
          failure_reason?: string | null
          rejected_reason?: string | null
          admin_notes?: string | null
          processed_at?: string | null
          rejected_at?: string | null
          paystack_transfer_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_pending_balance: {
        Args: {
          p_seller_id: string
          p_amount: number
          p_reference_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}