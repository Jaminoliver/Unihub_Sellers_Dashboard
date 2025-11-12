// Order Types
export interface Order {
  id: string
  order_number: string
  buyer_id: string
  seller_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  order_status: OrderStatus
  delivery_address_id: string
  delivery_code: string | null
  delivery_confirmed_at: string | null
  escrow_amount: number
  escrow_released: boolean
  commission_amount: number
  seller_payout_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
  payment_reference: string
  payment_verified_at: string | null
  transaction_id: string | null
}

export type PaymentMethod = 'full' | 'half' | 'pod'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

// Order with related data
export interface OrderWithRelations extends Order {
  buyer: {
    full_name: string
    email: string
    phone_number: string | null
  }
  product: {
    name: string
    image_url: string | null
    description: string | null
  }
  delivery_address: {
    address: string
    city: string
    state: string
    zip_code: string | null
  }
}

// Seller Types
export interface Seller {
  id: string
  user_id: string
  business_name: string
  full_name: string
  email: string
  phone_number: string
  state: string
  university_id: string
  lga: string | null
  pickup_address: string
  bank_account_number: string | null
  bank_name: string | null
  account_name: string | null
  bank_verified: boolean
  email_verified: boolean
  phone_verified: boolean
  nin: string | null
  rating: number
  total_sales: number
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  bank_code: string | null
}

// Profile Types
export interface Profile {
  id: string
  full_name: string
  email: string
  phone_number: string | null
  profile_image_url: string | null
  university_id: string | null
  campus_location: string | null
  is_verified: boolean
  is_seller: boolean
  seller_rating: number | null
  total_sales: number
  created_at: string
  state: string | null
  delivery_address: string | null
  updated_at: string
  department: string | null
  student_id: string | null
  response_time: string | null
  referral_code: string | null
  referred_by: string | null
}

// Product Types
export interface Product {
  id: string
  seller_id: string
  name: string
  description: string
  price: number
  category: string
  condition: string
  image_url: string | null
  images: string[]
  stock_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Delivery Address Types
export interface DeliveryAddress {
  id: string
  user_id: string
  address: string
  city: string
  state: string
  zip_code: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

// Order Statistics
export interface OrderStats {
  total: number
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
  totalRevenue: number
  averageOrderValue: number
}

// Email Notification Types
export interface OrderEmailData {
  orderNumber: string
  buyerName: string
  buyerEmail: string
  sellerName: string
  sellerEmail: string
  productName: string
  quantity: number
  totalAmount: number
  paymentMethod: PaymentMethod
  deliveryCode: string
  deliveryAddress: string
}

export interface EmailNotificationType {
  type: 'new_order_seller' | 'order_confirmation_buyer' | 'delivery_code' | 'payment_released'
  to: string
  data: OrderEmailData
}