export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// This is a simple type for your category data
export type Category = {
  id: string;
  name: string;
};

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
          // Suspension fields
          suspended_until: string | null
          suspension_reason: string | null
          is_suspended: boolean // Computed field: true if suspended_until > NOW()
          // Approval field
          approval_status: string
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
          // Suspension fields (is_suspended is computed, don't insert)
          suspended_until?: string | null
          suspension_reason?: string | null
          // Approval field
          approval_status?: string
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
          // Suspension fields (is_suspended is computed, don't update directly)
          suspended_until?: string | null
          suspension_reason?: string | null
          // Approval field
          approval_status?: string
        }
      }
      sellers: {
        Row: {
          id: string
          user_id: string
          university_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          university_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          university_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_suspensions: {
        Args: {}
        Returns: void
      }
      is_product_available: {
        Args: {
          p_stock_quantity: number
          p_suspended_until: string | null
          p_is_available: boolean
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Enhanced Product type with computed suspension info and approval status
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  seller_id: string;
  university_id: string;
  image_urls: string[];
  is_available: boolean;
  created_at: string;
  updated_at: string;
  
  // Suspension fields
  suspended_until: string | null;
  suspension_reason: string | null;
  is_suspended: boolean; // Computed field from database or frontend logic
  
  // Approval field
  approval_status: string; 
}

// Helper type for suspension status
export interface SuspensionInfo {
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  days_remaining?: number; // Calculated on frontend
}

// Helper functions for working with suspension
export const SuspensionHelpers = {
  /**
   * Calculate days remaining until suspension ends
   */
  getDaysRemaining(suspendedUntil: string | null): number {
    if (!suspendedUntil) return 0;
    const now = new Date();
    const until = new Date(suspendedUntil);
    const diffTime = until.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  },

  /**
   * Check if product is currently suspended (client-side check)
   */
  isSuspended(suspendedUntil: string | null): boolean {
    if (!suspendedUntil) return false;
    return new Date(suspendedUntil) > new Date();
  },

  /**
   * Get suspension end date formatted for display
   */
  getUnsuspendDate(suspendedUntil: string | null): string {
    if (!suspendedUntil) return '';
    return new Date(suspendedUntil).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /**
   * Check if product should be available to buyers
   * Now includes check for approval status
   */
  isAvailableToBuyers(product: Product): boolean {
    return (
      product.stock_quantity > 0 &&
      !product.is_suspended &&
      product.is_available &&
      product.approval_status === 'approved'
    );
  },
};