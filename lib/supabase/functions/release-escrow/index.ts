/// <reference lib="deno.ns" />

// supabase/functions/release-escrow/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { orderId, deliveryCode } = await req.json()
    if (!orderId || !deliveryCode) {
      throw new Error('Order ID and Delivery Code are required')
    }

    // Fetch Order and Seller
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        seller:sellers (
          id,
          user_id,
          wallet_balance
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError) throw new Error(`Order not found: ${orderError.message}`)

    // Validation
    if (order.order_status === 'delivered') {
      throw new Error('This order has already been marked as delivered.')
    }
    if (order.delivery_code !== deliveryCode) {
      throw new Error('Invalid delivery code.')
    }
    if (!order.seller || !order.seller.id) {
      throw new Error('Seller not found for this order.')
    }

    // Calculate commission
    const orderTotal = Number(order.total_amount)
    const commission = orderTotal * 0.05
    const sellerPayout = orderTotal - commission

    // Get product name
    const { data: productData } = await supabase
      .from('products')
      .select('name')
      .eq('id', order.product_id)
      .single()
    
    const productName = productData?.name || 'your item'

    // Get current wallet balance
    const currentBalance = Number(order.seller.wallet_balance) || 0
    const newBalance = currentBalance + sellerPayout

    // Update seller wallet balance
    const { error: walletError } = await supabase
      .from('sellers')
      .update({ wallet_balance: newBalance })
      .eq('id', order.seller.id)

    if (walletError) throw new Error(`Failed to update wallet: ${walletError.message}`)

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: 'delivered',
        escrow_released: true,
        delivery_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        commission_amount: commission,
        seller_payout_amount: sellerPayout
      })
      .eq('id', orderId)

    if (updateError) throw new Error(`Failed to update order: ${updateError.message}`)

    // Log wallet transaction
    await supabase.from('wallet_transactions').insert({
      seller_id: order.seller.id,
      order_id: order.id,
      transaction_type: 'credit',
      amount: sellerPayout,
      balance_after: newBalance,
      description: `Payment for order #${order.order_number}`,
      reference: order.payment_reference || `ORDER_${order.order_number}`,
      status: 'completed'
    })

    // Create notifications
    await supabase.from('notifications').insert([
      {
        user_id: order.buyer_id,
        type: 'order_delivered',
        title: 'Order Delivered! 🎉',
        message: `Your order #${order.order_number} (${productName}) has been delivered successfully`,
        order_number: order.order_number,
        is_read: false
      },
      {
        user_id: order.seller.user_id,
        type: 'wallet_credited',
        title: 'Wallet Credited 💰',
        message: `₦${sellerPayout.toFixed(0)} added to your wallet from order #${order.order_number}`,
        order_number: order.order_number,
        amount: sellerPayout.toString(),
        is_read: false
      }
    ])

    return new Response(JSON.stringify({ 
      message: 'Delivery confirmed! Wallet credited.',
      commission: commission,
      sellerPayout: sellerPayout,
      newBalance: newBalance
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, 
    })
  }
})