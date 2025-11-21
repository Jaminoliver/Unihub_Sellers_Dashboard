'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { TrendingUp, Package, ShoppingCart, DollarSign } from 'lucide-react'

interface AnalyticsData {
  revenueData: { date: string; revenue: number }[]
  topProducts: { name: string; sales: number; revenue: number; image?: string }[]
  orderStatusData: { status: string; count: number }[]
  totalStats: {
    totalRevenue: number
    totalOrders: number
    totalSoldItems: number
    avgOrderValue: number
    topSellingProduct: string
  }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    revenueData: [],
    topProducts: [],
    orderStatusData: [],
    totalStats: {
      totalRevenue: 0,
      totalOrders: 0,
      totalSoldItems: 0,
      avgOrderValue: 0,
      topSellingProduct: 'N/A',
    },
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const getDaysFromRange = () => {
    switch (timeRange) {
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      case '1y': return 365
      default: return 30
    }
  }

  async function fetchAnalytics() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get seller ID
      const { data: seller } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!seller) return

      const days = getDaysFromRange()
      const startDate = startOfDay(subDays(new Date(), days))

      // Fetch all orders within date range
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          order_status,
          created_at,
          quantity,
          unit_price,
          product:products (
            id,
            name,
            image_urls
          )
        `)
        .eq('seller_id', seller.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (!orders) {
        setLoading(false)
        return
      }

      // ✅ FILTER: Only count delivered orders for revenue calculations
      const deliveredOrders = orders.filter(o => o.order_status === 'delivered')

      // Process revenue by date (only delivered orders)
      const revenueByDate: { [key: string]: number } = {}
      deliveredOrders.forEach(order => {
        const date = format(new Date(order.created_at), 'MMM dd')
        const amount = parseFloat(order.total_amount || '0')
        revenueByDate[date] = (revenueByDate[date] || 0) + amount
      })

      const revenueData = Object.entries(revenueByDate).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue),
      }))

      // ✅ FIXED: Process top products based on DELIVERED orders only
      const productSales: { 
        [key: string]: { 
          name: string
          sales: number
          revenue: number
          image?: string 
        } 
      } = {}

      deliveredOrders.forEach((order: any) => {
        if (order.product) {
          const productId = order.product.id
          const productName = order.product.name
          const quantity = order.quantity || 1
          const price = parseFloat(order.unit_price || '0')
          const image = order.product.image_urls?.[0]

          if (!productSales[productId]) {
            productSales[productId] = {
              name: productName,
              sales: 0,
              revenue: 0,
              image,
            }
          }
          productSales[productId].sales += quantity
          productSales[productId].revenue += price * quantity
        }
      })

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)

      // Process order status distribution (ALL orders for status breakdown)
      const statusCount: { [key: string]: number } = {}
      orders.forEach(order => {
        const status = order.order_status || 'unknown'
        statusCount[status] = (statusCount[status] || 0) + 1
      })

      const orderStatusData = Object.entries(statusCount).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
      }))

      // ✅ FIXED: Calculate stats based on DELIVERED orders only
      const totalRevenue = deliveredOrders.reduce((sum, order) => 
        sum + parseFloat(order.total_amount || '0'), 0
      )
      
      // ✅ NEW: Calculate total sold items (sum of quantities from delivered orders)
      const totalSoldItems = deliveredOrders.reduce((sum, order) => 
        sum + (order.quantity || 0), 0
      )

      const avgOrderValue = deliveredOrders.length > 0 
        ? totalRevenue / deliveredOrders.length 
        : 0

      setData({
        revenueData,
        topProducts,
        orderStatusData,
        totalStats: {
          totalRevenue,
          totalOrders: orders.length, // All orders count
          totalSoldItems, // ✅ NEW: Only delivered items
          avgOrderValue,
          topSellingProduct: topProducts[0]?.name || 'N/A',
        },
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Sales</h1>
          <p className="text-gray-500 mt-1">Track your business performance</p>
        </div>
        
        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{data.totalStats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">From delivered orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStats.totalOrders}</div>
            <p className="text-xs text-gray-500 mt-1">All statuses</p>
          </CardContent>
        </Card>

        {/* ✅ NEW: Total Items Sold Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Items Sold
            </CardTitle>
            <Package className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStats.totalSoldItems}</div>
            <p className="text-xs text-gray-500 mt-1">Delivered items only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Order Value
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{Math.round(data.totalStats.avgOrderValue).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per delivered order</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <p className="text-sm text-gray-500">Only includes delivered orders</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `₦${value.toLocaleString()}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Revenue (₦)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Products</CardTitle>
            <p className="text-sm text-gray-500">Based on delivered orders</p>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No delivered sales yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-300 w-8">
                      #{index + 1}
                    </div>
                    {product.image && (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {product.sales} units sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        ₦{product.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
            <p className="text-sm text-gray-500">All orders by status</p>
          </CardHeader>
          <CardContent>
            {data.orderStatusData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.orderStatusData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.status}: {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}