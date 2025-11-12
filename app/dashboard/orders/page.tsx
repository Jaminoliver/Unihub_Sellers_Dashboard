'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Clock, CheckCircle, XCircle, Eye, Truck, DollarSign, Calendar, MapPin, User, Phone, Hash, X, Mail, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Order {
  id: string
  order_number: string
  quantity: number
  unit_price: number
  total_amount: number
  payment_method: 'full' | 'half' | 'pod'
  payment_status: string
  order_status: string
  delivery_code: string
  created_at: string
  buyer: {
    full_name: string
    email: string
    phone_number: string
  }
  product: {
    name: string
    image_urls: string[]
  }
  delivery_address: {
    address_line: string
    city: string
    state: string
    landmark: string
    phone_number: string
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmStatus, setConfirmStatus] = useState<string>('')
  const [confirmError, setConfirmError] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Not authenticated')
        return
      }

      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (sellerError || !sellerData) {
        setError('Seller account not found')
        return
      }

      const { data, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(full_name, email, phone_number),
          product:products(name, image_urls),
          delivery_address:delivery_address_id(address_line, city, state, landmark, phone_number)
        `)
        .eq('seller_id', sellerData.id)
        .order('created_at', { ascending: false })

      if (ordersError) {
        setError(ordersError.message)
        return
      }

      setOrders(data || [])
    } catch (error: any) {
      setError(error.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package },
      shipped: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck },
      delivered: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    }
    const c = config[status] || config.pending
    const Icon = c.icon
    return (
      <Badge className={`${c.color} flex items-center gap-1.5 px-2.5 py-1 border font-medium`}>
        <Icon className="h-3.5 w-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getPaymentMethodBadge = (method: string) => {
    const config: any = {
      full: { label: 'Full Payment', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      half: { label: 'Half Payment', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      pod: { label: 'Pay on Delivery', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    }
    return <Badge className={`${config[method]?.color} border px-2 py-0.5 text-xs font-medium`}>{config[method]?.label}</Badge>
  }

  const filterOrders = (status: string) => {
    if (status === 'all') return orders
    return orders.filter(order => order.order_status === status)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`

  const handleConfirmDelivery = async (orderId: string, code: string) => {
    if (isConfirming) return
    setIsConfirming(true)
    setConfirmStatus('Validating delivery code...')
    setConfirmError('')
    
    try {
      console.log('🔄 Starting delivery confirmation...')
      console.log('Order ID:', orderId)
      console.log('Delivery Code:', code)
      
      setConfirmStatus('Connecting to server...')
      
      const { data, error } = await supabase.functions.invoke('release-escrow', {
        body: { orderId, deliveryCode: code }
      })

      console.log('📥 Response received:', { data, error })

      if (error) {
        console.error('❌ Function invocation error:', error)
        throw new Error(error.message || 'Failed to confirm delivery')
      }

      // Check if data contains an error
      if (data?.error) {
        console.error('❌ Server returned error:', data.error)
        throw new Error(data.error)
      }

      console.log('✅ Success:', data)
      setConfirmStatus('Success! Delivery confirmed and payout initiated.')
      
      // Show success message
      setTimeout(() => {
        alert(data.message || 'Delivery confirmed successfully!')
        setSelectedOrder(null)
        setConfirmStatus('')
        fetchOrders()
      }, 1000)

    } catch (error: any) {
      console.error('💥 Confirmation failed:', error)
      const errorMsg = error.message || 'An unknown error occurred'
      setConfirmError(errorMsg)
      setConfirmStatus('')
      
      // Show detailed error in alert
      alert(`❌ Confirmation Failed\n\n${errorMsg}\n\nCheck console for more details.`)
    } finally {
      setIsConfirming(false)
    }
  }

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.order_status === 'pending').length,
    processing: orders.filter(o => o.order_status === 'processing').length,
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    revenue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1DA1F2] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Orders</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={fetchOrders} className="bg-[#1DA1F2] hover:bg-[#1a8cd8]">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage and track all your orders</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Orders</p>
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Processing</p>
                  <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.processing}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Delivered</p>
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.delivered}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow col-span-2 sm:col-span-3 lg:col-span-1">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Revenue</p>
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-[#1DA1F2]" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[#1DA1F2]">{formatCurrency(stats.revenue)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b border-gray-200 bg-white">
            <CardTitle className="text-lg sm:text-xl">Order Management</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-gray-200 px-4 sm:px-0 overflow-x-auto">
                <TabsList className="inline-flex h-auto p-0 bg-transparent gap-1 sm:gap-2 min-w-full sm:min-w-0">
                  <TabsTrigger value="all" className="data-[state=active]:bg-[#1DA1F2] data-[state=active]:text-white rounded-t-lg px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                    All <span className="ml-1 hidden xs:inline">({orders.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="data-[state=active]:bg-[#1DA1F2] data-[state=active]:text-white rounded-t-lg px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                    Pending <span className="ml-1 hidden xs:inline">({stats.pending})</span>
                  </TabsTrigger>
                  <TabsTrigger value="processing" className="data-[state=active]:bg-[#1DA1F2] data-[state=active]:text-white rounded-t-lg px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                    Processing
                  </TabsTrigger>
                  <TabsTrigger value="shipped" className="data-[state=active]:bg-[#1DA1F2] data-[state=active]:text-white rounded-t-lg px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                    Shipped
                  </TabsTrigger>
                  <TabsTrigger value="delivered" className="data-[state=active]:bg-[#1DA1F2] data-[state=active]:text-white rounded-t-lg px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                    Delivered
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" className="data-[state=active]:bg-[#1DA1F2] data-[state=active]:text-white rounded-t-lg px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                    Cancelled
                  </TabsTrigger>
                </TabsList>
              </div>

              {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                <TabsContent key={status} value={status} className="mt-0 p-4 sm:p-6 space-y-4">
                  {filterOrders(status).length === 0 ? (
                    <div className="text-center py-12 sm:py-16 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium text-sm sm:text-base">No {status !== 'all' ? status : ''} orders found</p>
                      <p className="text-gray-500 text-xs sm:text-sm mt-1">Orders will appear here once available</p>
                    </div>
                  ) : (
                    filterOrders(status).map(order => (
                      <Card key={order.id} className="hover:shadow-lg transition-all duration-200 border-gray-200">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4 flex-1">
                              <div className="h-20 w-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                                {order.product?.image_urls?.[0] ? (
                                  <img src={order.product.image_urls[0]} alt={order.product.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Package className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h3 className="font-semibold text-lg text-gray-900">{order.product?.name || 'Product'}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                      <Hash className="h-3 w-3" />
                                      {order.order_number}
                                    </p>
                                  </div>
                                  {getStatusBadge(order.order_status)}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-700">{order.buyer?.full_name || 'Customer'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-700">Qty: {order.quantity}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right ml-6">
                              <p className="text-2xl font-bold text-[#1DA1F2]">{formatCurrency(order.total_amount)}</p>
                              <Button variant="outline" size="sm" className="mt-4 border-[#1DA1F2] text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white" onClick={() => setSelectedOrder(order)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="min-h-screen w-full flex items-center justify-center py-8">
            <Card className="max-w-3xl w-full shadow-2xl my-8">
              <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-[#1DA1F2] to-[#1a8cd8] text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl sm:text-2xl">Order Details</CardTitle>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full" onClick={() => setSelectedOrder(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-4 sm:p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Status Messages */}
                {(confirmStatus || confirmError) && (
                  <div className={`p-4 rounded-lg border-2 ${confirmError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start gap-3">
                      {confirmError ? (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
                      )}
                      <div className="flex-1">
                        <p className={`font-semibold ${confirmError ? 'text-red-900' : 'text-blue-900'}`}>
                          {confirmError ? 'Error' : 'Processing...'}
                        </p>
                        <p className={`text-sm mt-1 ${confirmError ? 'text-red-700' : 'text-blue-700'}`}>
                          {confirmError || confirmStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Confirmation */}
                {selectedOrder.order_status === 'pending' && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-[#1DA1F2]" />
                      Confirm Delivery
                    </h3>
                    <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                      <p className="text-sm font-medium text-gray-900 mb-2">Enter Verification Code</p>
                      <p className="text-xs text-gray-600 mb-4">Ask the buyer to provide their 6-digit delivery code to confirm order completion.</p>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        disabled={isConfirming}
                        className="w-full p-3 sm:p-4 text-center text-2xl sm:text-3xl font-bold tracking-widest border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400 focus:border-blue-500 bg-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        onInput={(e: any) => {
                          const val = e.target.value.replace(/\D/g, '')
                          e.target.value = val
                          if (val.length === 6 && !isConfirming) {
                            handleConfirmDelivery(selectedOrder.id, val)
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        {isConfirming ? 'Processing confirmation...' : 'Code will auto-submit when 6 digits are entered'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rest of order details */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-base sm:text-lg mb-4">Order Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium">{selectedOrder.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      {getStatusBadge(selectedOrder.order_status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-[#1DA1F2] text-lg">{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}