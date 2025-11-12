import { createClient } from '@/lib/supabase/client'

type PaymentMethod = 'full' | 'half' | 'pod'
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

interface Order {
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

interface OrderWithRelations extends Order {
  buyer: {
    full_name: string
    email: string
    phone_number: string | null
  }
  product: {
    name: string
    image_urls: string[]
  }
  delivery_address: {
    address: string
    city: string
    state: string
    zip_code: string | null
  }
}

interface OrderStats {
  total: number
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
  totalRevenue: number
  averageOrderValue: number
}

export class OrdersService {
  private supabase = createClient()

  async fetchSellerOrders(sellerId: string): Promise<OrderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(full_name, email, phone_number),
        product:products(name, image_urls),
        delivery_address:delivery_addresses(address, city, state, zip_code)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as OrderWithRelations[]
  }

  async getSellerId(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (error) return null
    return data?.id || null
  }

  async getCurrentSellerId(): Promise<string | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return null
    return this.getSellerId(user.id)
  }

  async fetchOrdersByStatus(sellerId: string, status: OrderStatus): Promise<OrderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(full_name, email, phone_number),
        product:products(name, image_urls),
        delivery_address:delivery_addresses(address, city, state, zip_code)
      `)
      .eq('seller_id', sellerId)
      .eq('order_status', status)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as OrderWithRelations[]
  }

  async getOrderById(orderId: string): Promise<OrderWithRelations | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(full_name, email, phone_number),
        product:products(name, image_urls),
        delivery_address:delivery_addresses(address, city, state, zip_code)
      `)
      .eq('id', orderId)
      .single()

    if (error) return null
    return data as OrderWithRelations
  }

  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<boolean> {
    const { error } = await this.supabase
      .from('orders')
      .update({ 
        order_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    return !error
  }

  async markAsShipped(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'shipped')
  }

  async confirmDelivery(orderId: string, deliveryCode: string): Promise<{ success: boolean; message: string }> {
    const { data: order, error: fetchError } = await this.supabase
      .from('orders')
      .select('delivery_code, order_status')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) return { success: false, message: 'Order not found' }
    if (order.delivery_code !== deliveryCode) return { success: false, message: 'Invalid delivery code' }

    const { error: updateError } = await this.supabase
      .from('orders')
      .update({
        order_status: 'delivered',
        delivery_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) return { success: false, message: 'Failed to confirm delivery' }
    return { success: true, message: 'Delivery confirmed successfully' }
  }

  async getOrderStats(sellerId: string): Promise<OrderStats> {
    const orders = await this.fetchSellerOrders(sellerId)

    const stats: OrderStats = {
      total: orders.length,
      pending: orders.filter(o => o.order_status === 'pending').length,
      processing: orders.filter(o => o.order_status === 'processing').length,
      shipped: orders.filter(o => o.order_status === 'shipped').length,
      delivered: orders.filter(o => o.order_status === 'delivered').length,
      cancelled: orders.filter(o => o.order_status === 'cancelled').length,
      totalRevenue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0),
      averageOrderValue: 0
    }

    stats.averageOrderValue = stats.total > 0 ? stats.totalRevenue / stats.total : 0
    return stats
  }

  async getRecentOrders(sellerId: string, limit: number = 5): Promise<OrderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(full_name, email, phone_number),
        product:products(name, image_urls),
        delivery_address:delivery_addresses(address, city, state, zip_code)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as OrderWithRelations[]
  }

  async searchOrders(sellerId: string, searchTerm: string): Promise<OrderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(full_name, email, phone_number),
        product:products(name, image_urls),
        delivery_address:delivery_addresses(address, city, state, zip_code)
      `)
      .eq('seller_id', sellerId)
      .or(`order_number.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false})

    if (error) throw error

    const filtered = (data as OrderWithRelations[]).filter(order => 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return filtered
  }

  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('orders')
      .update({
        order_status: 'cancelled',
        notes: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    return !error
  }

  async getTodaysOrders(sellerId: string): Promise<OrderWithRelations[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(full_name, email, phone_number),
        product:products(name, image_urls),
        delivery_address:delivery_addresses(address, city, state, zip_code)
      `)
      .eq('seller_id', sellerId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as OrderWithRelations[]
  }
}

export const ordersService = new OrdersService()