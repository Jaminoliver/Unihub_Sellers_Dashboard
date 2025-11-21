'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Clock, CheckCircle, XCircle, Eye, Truck, DollarSign, Calendar, MapPin, User, Phone, Hash, X, Mail } from 'lucide-react'
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
  buyer: { full_name: string; email: string; phone_number: string }
  product: { name: string; image_urls: string[] }
  delivery_address: { address_line: string; city: string; state: string; landmark: string; phone_number: string }
}

const STATUS_CONFIG = {
  pending: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  processing: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package },
  shipped: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck },
  delivered: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
}

const PAYMENT_CONFIG = {
  full: { label: 'Full Payment', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  half: { label: 'Half Payment', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  pod: { label: 'Pay on Delivery', color: 'bg-orange-100 text-orange-800 border-orange-200' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const supabase = createClient()

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) return setError('Not authenticated')

      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers').select('id').eq('user_id', user.id).single()
      if (sellerError || !sellerData) return setError('Seller account not found')

      const { data, error: ordersError } = await supabase.from('orders').select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(full_name, email, phone_number),
          product:products(name, image_urls),
          delivery_address:delivery_address_id(address_line, city, state, landmark, phone_number)
        `).eq('seller_id', sellerData.id).order('created_at', { ascending: false })

      if (ordersError) return setError(ordersError.message)
      setOrders(data || [])
    } catch (error: any) {
      setError(error.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelivery = async (orderId: string, code: string) => {
    if (isConfirming) return
    setIsConfirming(true)
    try {
      const { data, error } = await supabase.functions.invoke('release-escrow', {
        body: { orderId, deliveryCode: code }
      })
      if (error) throw error
      alert(data.message || 'Delivery confirmed and payout initiated!')
      setSelectedOrder(null)
      fetchOrders()
    } catch (error: any) {
      alert(`Confirmation failed: ${error.message || 'Unknown error'}`)
    } finally {
      setIsConfirming(false)
    }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
    const Icon = cfg.icon
    return <Badge className={`${cfg.color} flex items-center gap-1.5 px-2.5 py-1 border font-medium`}>
      <Icon className="h-3.5 w-3.5" />{status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  }

  const PaymentBadge = ({ method }: { method: string }) => {
    const cfg = PAYMENT_CONFIG[method as keyof typeof PAYMENT_CONFIG]
    return <Badge className={`${cfg?.color} border px-2 py-0.5 text-xs font-medium`}>{cfg?.label}</Badge>
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const formatCurrency = (amt: number) => `₦${amt.toLocaleString()}`
  const filterOrders = (status: string) => status === 'all' ? orders : orders.filter(o => o.order_status === status)

  // FIXED: Only count delivered orders for revenue
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.order_status === 'pending').length,
    processing: orders.filter(o => o.order_status === 'processing').length,
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    revenue: orders.filter(o => o.order_status === 'delivered').reduce((sum, o) => sum + Number(o.total_amount), 0)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1DA1F2] border-t-transparent mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading orders...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Orders</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={fetchOrders} className="bg-[#1DA1F2] hover:bg-[#1a8cd8]">Try Again</Button>
        </CardContent>
      </Card>
    </div>
  )

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <p className="text-2xl font-bold" style={{ color: color.includes('text-') ? undefined : color }}>{value}</p>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card className="shadow-sm border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900">Orders Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage and track all your orders</p>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Orders" value={stats.total} icon={Package} color="text-gray-400" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="text-amber-600" />
          <StatCard label="Processing" value={stats.processing} icon={Truck} color="text-blue-600" />
          <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle} color="text-emerald-600" />
          <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <DollarSign className="h-6 w-6 text-[#1DA1F2]" />
              </div>
              <p className="text-2xl font-bold text-[#1DA1F2]">{formatCurrency(stats.revenue)}</p>
              <p className="text-xs text-gray-500 mt-1">From delivered orders</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b bg-white">
            <CardTitle>Order Management</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-gray-200 mb-4 overflow-x-auto">
                <TabsList className="flex h-auto p-0 bg-transparent gap-1 sm:gap-2 w-full justify-start">
                  {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                    <TabsTrigger key={s} value={s} className="data-[state=active]:bg-[#1DA1F2] data-[state=active]:text-white rounded-t-lg px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                      {s.charAt(0).toUpperCase() + s.slice(1)} <span className="ml-1 hidden xs:inline">({s === 'all' ? orders.length : filterOrders(s).length})</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                <TabsContent key={status} value={status} className="space-y-4">
                  {filterOrders(status).length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No {status !== 'all' ? status : ''} orders found</p>
                    </div>
                  ) : (
                    filterOrders(status).map(order => (
                      <Card key={order.id} className="hover:shadow-lg transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4 flex-1">
                              <div className="h-24 w-24 rounded-lg bg-gray-100 overflow-hidden border">
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
                                    <h3 className="font-semibold text-lg text-gray-900">{order.product?.name}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                      <Hash className="h-3 w-3" />{order.order_number}
                                    </p>
                                  </div>
                                  <StatusBadge status={order.order_status} />
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-700">{order.buyer?.full_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-700">{formatDate(order.created_at)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-700">Qty: {order.quantity}</span>
                                  </div>
                                  <PaymentBadge method={order.payment_method} />
                                </div>

                                {order.order_status === 'pending' && (
                                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                    <p className="text-sm font-medium text-amber-900 mb-2">Confirm Delivery - Enter 6-digit code:</p>
                                    <input 
                                      type="text" 
                                      maxLength={6}
                                      placeholder="000000"
                                      className="w-full p-3 text-center text-xl font-bold tracking-widest border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                                      onInput={(e: any) => {
                                        const val = e.target.value.replace(/\D/g, '')
                                        e.target.value = val
                                        if (val.length === 6) handleConfirmDelivery(order.id, val)
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-right ml-6">
                              <p className="text-2xl font-bold text-[#1DA1F2]">{formatCurrency(order.total_amount)}</p>
                              <p className="text-sm text-gray-500 mt-1">Unit: {formatCurrency(order.unit_price)}</p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-4 border-[#1DA1F2] text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white" 
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4 mr-2" />View Details
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b bg-gradient-to-r from-[#1DA1F2] to-[#1a8cd8] text-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <CardTitle>Order Details</CardTitle>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full" onClick={() => setSelectedOrder(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="text-lg font-semibold">{selectedOrder.order_number}</p>
                </div>
                <StatusBadge status={selectedOrder.order_status} />
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />Customer Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                  <div className="flex gap-3"><User className="h-5 w-5 text-gray-400" /><div><p className="text-xs text-gray-600">Name</p><p className="font-medium">{selectedOrder.buyer?.full_name}</p></div></div>
                  <div className="flex gap-3"><Mail className="h-5 w-5 text-gray-400" /><div><p className="text-xs text-gray-600">Email</p><p className="font-medium">{selectedOrder.buyer?.email}</p></div></div>
                  <div className="flex gap-3"><Phone className="h-5 w-5 text-gray-400" /><div><p className="text-xs text-gray-600">Phone</p><p className="font-medium">{selectedOrder.buyer?.phone_number}</p></div></div>
                </div>
              </div>

              {selectedOrder.delivery_address && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />Delivery Address
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                    <p className="font-medium">{selectedOrder.delivery_address.address_line}</p>
                    {selectedOrder.delivery_address.landmark && <p className="text-gray-600">Landmark: {selectedOrder.delivery_address.landmark}</p>}
                    <p className="text-gray-600">{selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state}</p>
                    {selectedOrder.delivery_address.phone_number && (
                      <div className="flex items-center gap-2 pt-2 border-t"><Phone className="h-4 w-4 text-gray-400" />{selectedOrder.delivery_address.phone_number}</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-lg mb-3">Product Details</h3>
                <div className="flex gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="h-20 w-20 rounded-lg bg-gray-200 overflow-hidden">
                    {selectedOrder.product?.image_urls?.[0] ? (
                      <img src={selectedOrder.product.image_urls[0]} alt={selectedOrder.product.name} className="h-full w-full object-cover" />
                    ) : <div className="h-full flex items-center justify-center"><Package className="h-8 w-8 text-gray-400" /></div>}
                  </div>
                  <div>
                    <h4 className="font-semibold">{selectedOrder.product?.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">Quantity: {selectedOrder.quantity}</p>
                    <p className="text-sm text-gray-600">Unit Price: {formatCurrency(selectedOrder.unit_price)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#1DA1F2]" />Payment Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Method:</span>
                    <PaymentBadge method={selectedOrder.payment_method} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-semibold capitalize">{selectedOrder.payment_status}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>Total:</span>
                    <span className="text-[#1DA1F2] text-2xl">{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.order_status === 'pending' && (
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#1DA1F2]" />Confirm Delivery
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">Enter the 6-digit verification code from the buyer:</p>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="000000"
                    className="w-full p-4 text-center text-3xl font-bold tracking-widest border-2 border-blue-300 rounded-lg focus:ring-4 focus:ring-blue-400"
                    onInput={(e: any) => {
                      const val = e.target.value.replace(/\D/g, '')
                      e.target.value = val
                      if (val.length === 6) handleConfirmDelivery(selectedOrder.id, val)
                    }}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(null)}>Close</Button>
                <Button className="flex-1 bg-[#1DA1F2] hover:bg-[#1a8cd8]">Print Order</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}