'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, ShoppingCart, Package, TrendingUp, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  totalRevenue: number
  revenueChange: string
  activeOrders: number
  ordersChange: string
  totalProducts: number
  productsChange: string
  conversionRate: number
  conversionChange: string
}

interface RecentOrder {
  id: string
  order_number: string
  buyer_id: string
  total_amount: string
  order_status: string
  created_at: string
  buyer_name?: string
  buyer_location?: string
  products?: { name: string }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    revenueChange: '+0%',
    activeOrders: 0,
    ordersChange: '+0',
    totalProducts: 0,
    productsChange: '+0',
    conversionRate: 0,
    conversionChange: '+0%',
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get seller ID
        const { data: seller, error: sellerError } = await supabase
          .from('sellers')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (sellerError || !seller) {
          console.error('Seller not found:', sellerError)
          setLoading(false)
          return
        }

        // Fetch all orders for this seller
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            buyer_id,
            total_amount,
            order_status,
            created_at,
            profiles:buyer_id (
              full_name,
              delivery_address
            ),
            products (
              name
            )
          `)
          .eq('seller_id', seller.id)
          .order('created_at', { ascending: false })

        if (ordersError) {
          console.error('Error fetching orders:', ordersError)
        }

        // Fetch all products
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, stock_quantity, is_available')
          .eq('seller_id', seller.id)

        if (productsError) {
          console.error('Error fetching products:', productsError)
        }

        // Calculate stats
        const allOrders = orders || []
        const allProducts = products || []

        // Total Revenue (all completed/delivered orders)
        const completedOrders = allOrders.filter(o => 
          ['delivered', 'completed'].includes(o.order_status)
        )
        const totalRevenue = completedOrders.reduce((sum, order) => 
          sum + parseFloat(order.total_amount || '0'), 0
        )

        // Active Orders (pending, processing, shipped)
        const activeOrders = allOrders.filter(o => 
          ['pending', 'processing', 'shipped'].includes(o.order_status)
        ).length

        // Total Products
        const totalProducts = allProducts.length

        // Mock conversion rate (you can calculate properly later)
        const conversionRate = allOrders.length > 0 ? 
          (completedOrders.length / allOrders.length) * 100 : 0

        // Get recent orders (last 3)
        const recent = allOrders.slice(0, 3).map(order => ({
          ...order,
          buyer_name: (order.profiles as any)?.full_name || 'Unknown Buyer',
          buyer_location: (order.profiles as any)?.delivery_address || 'No address'
        }))

        setStats({
          totalRevenue,
          revenueChange: '+15.3%', // Calculate based on previous period
          activeOrders,
          ordersChange: `+${activeOrders > 0 ? '2' : '0'} today`,
          totalProducts,
          productsChange: `+${Math.floor(totalProducts * 0.1)} this week`,
          conversionRate: parseFloat(conversionRate.toFixed(1)),
          conversionChange: '+0.5%',
        })

        setRecentOrders(recent)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    // Set up real-time subscription for orders
    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          // Refetch data when orders change
          fetchDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'processing':
        return 'text-blue-600 bg-blue-50'
      case 'shipped':
        return 'text-purple-600 bg-purple-50'
      case 'delivered':
        return 'text-green-600 bg-green-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total Revenue',
      value: `₦${stats.totalRevenue.toLocaleString()}`,
      change: stats.revenueChange,
      icon: DollarSign,
      positive: true,
    },
    {
      title: 'Active Orders',
      value: stats.activeOrders.toString(),
      change: stats.ordersChange,
      icon: ShoppingCart,
      positive: true,
    },
    {
      title: 'Total Products',
      value: stats.totalProducts.toString(),
      change: stats.productsChange,
      icon: Package,
      positive: true,
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      change: stats.conversionChange,
      icon: TrendingUp,
      positive: true,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs mt-1 ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sales Overview Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-400">Chart will go here (integrate Recharts or similar)</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <button
            onClick={() => router.push('/dashboard/orders')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all
          </button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 hover:bg-gray-50 p-3 rounded-lg transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/orders?search=${order.order_number}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-gray-900">#{order.order_number}</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.order_status)}`}>
                        {getStatusText(order.order_status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span>{order.buyer_name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {order.products && order.products.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {order.products[0].name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₦{parseFloat(order.total_amount).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}