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
          // Seller suspension fields
          suspended_until: string | null
          suspension_reason: string | null
          is_suspended: boolean
          // Admin suspension fields
          admin_suspended: boolean
          admin_suspended_at: string | null
          admin_suspension_reason: string | null
          // Ban fields
          is_banned: boolean
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
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
          suspended_until?: string | null
          suspension_reason?: string | null
          admin_suspended?: boolean
          admin_suspended_at?: string | null
          admin_suspension_reason?: string | null
          is_banned?: boolean
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
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
          suspended_until?: string | null
          suspension_reason?: string | null
          admin_suspended?: boolean
          admin_suspended_at?: string | null
          admin_suspension_reason?: string | null
          is_banned?: boolean
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
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
  
  // Seller suspension fields
  suspended_until: string | null;
  suspension_reason: string | null;
  is_suspended: boolean;
  
  // Admin suspension fields
  admin_suspended: boolean;
  admin_suspended_at: string | null;
  admin_suspension_reason: string | null;
  is_admin_suspended: boolean;
  
  // Ban fields
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  
  // Approval field
  approval_status: 'pending' | 'approved' | 'rejected' | 'disapproved';
  rejection_reason?: string | null;
}

// Helper type for suspension status
export interface SuspensionInfo {
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  days_remaining?: number;
}

// Helper functions for working with suspension
export const SuspensionHelpers = {
  getDaysRemaining(suspendedUntil: string | null): number {
    if (!suspendedUntil) return 0;
    const now = new Date();
    const until = new Date(suspendedUntil);
    const diffTime = until.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  },

  isSuspended(suspendedUntil: string | null): boolean {
    if (!suspendedUntil) return false;
    return new Date(suspendedUntil) > new Date();
  },

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

  isAvailableToBuyers(product: Product): boolean {
    return (
      product.stock_quantity > 0 &&
      !product.is_suspended &&
      !product.is_admin_suspended &&
      !product.is_banned &&
      product.is_available &&
      product.approval_status === 'approved'
    );
  },
};