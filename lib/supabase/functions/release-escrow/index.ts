/// <reference lib="deno.ns" />

// supabase/functions/release-escrow/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper function to call Paystack API
const paystackFetch = (secretKey: string, endpoint: string, body: object) => {
  return fetch(`https://api.paystack.co/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

serve(async (req: Request) => {
  // 1. Setup CORS and Admin Client
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
    
    // 2. Get secrets
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) throw new Error('Paystack secret key not set')

    // 3. Get data from app
    const { orderId, deliveryCode } = await req.json()
    if (!orderId || !deliveryCode) {
      throw new Error('Order ID and Delivery Code are required')
    }

    // 4. Fetch Order and Seller Bank Details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        seller:sellers (
          user_id,
          bank_account_number,
          bank_code,
          account_name
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError) throw new Error(`Order not found: ${orderError.message}`)

    // 5. --- VALIDATION CHECKS ---
    if (order.order_status === 'delivered') {
      throw new Error('This order has already been marked as delivered.')
    }
    if (order.delivery_code !== deliveryCode) {
      throw new Error('Invalid delivery code.')
    }
    if (!order.seller || !order.seller.user_id) {
      throw new Error('Seller account or seller user_id not found for this order.')
    }

    // 6. Calculate commission
    const orderTotal = Number(order.total_amount)
    const commission = orderTotal * 0.05
    const sellerPayout = orderTotal - commission

    // Get product name for notifications
    const { data: productData } = await supabase
      .from('products')
      .select('name')
      .eq('id', order.product_id)
      .single()
    
    const productName = productData?.name || 'your item'

    // --- PAY ON DELIVERY (POD) LOGIC ---
    if (order.payment_method === 'pod') {
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

      if (updateError) throw new Error(`Failed to update POD order: ${updateError.message}`)

      // Log transaction
      await supabase.from('transactions').insert({
        order_id: order.id,
        user_id: order.seller.user_id,
        transaction_type: 'payout',
        amount: sellerPayout,
        payment_provider: 'pod',
        payment_reference: `POD_${order.order_number}`,
        status: 'completed'
      })

      // Create notifications
      // 1. Buyer notification
      await supabase.from('notifications').insert({
        user_id: order.buyer_id,
        type: 'order_delivered',
        title: 'Order Delivered! 🎉',
        message: `Your order #${order.order_number} (${productName}) has been delivered successfully`,
        order_number: order.order_number,
        is_read: false
      })

      // 2. Seller notification
      await supabase.from('notifications').insert({
        user_id: order.seller.user_id,
        type: 'wallet_credited',
        title: 'Payment Received 💰',
        message: `₦${sellerPayout.toFixed(0)} from order #${order.order_number} (Pay on Delivery)`,
        order_number: order.order_number,
        amount: sellerPayout.toString(),
        is_read: false
      })
      
      return new Response(JSON.stringify({ 
        message: 'Delivery confirmed for Pay on Delivery order.',
        commission: commission,
        sellerPayout: sellerPayout
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // --- ONLINE PAYMENT (ESCROW) LOGIC ---
    const { bank_account_number, bank_code, account_name } = order.seller
    if (!bank_account_number || !bank_code || !account_name) {
      throw new Error('Seller bank details are incomplete. Cannot process payout.')
    }

    const payoutAmountKobo = Math.floor(sellerPayout * 100)

    if (payoutAmountKobo <= 1000) {
      throw new Error('Payout amount is too low after commission (min ₦10).')
    }

    // 7. --- PAYSTACK PAYOUT ---
    // Step 7a: Create Transfer Recipient
    const recipientRes = await paystackFetch(paystackSecret, 'transferrecipient', {
      type: 'nuban',
      name: account_name,
      account_number: bank_account_number,
      bank_code: bank_code,
      currency: 'NGN',
    })
    
    const recipientData = await recipientRes.json()
    if (!recipientData.status) throw new Error(`Paystack recipient error: ${recipientData.message}`)
    
    const recipientCode = recipientData.data.recipient_code

    // Step 7b: Initiate Transfer
    const transferRes = await paystackFetch(paystackSecret, 'transfer', {
      source: 'balance',
      amount: payoutAmountKobo,
      recipient: recipientCode,
      reason: `Payout for UniHub Order #${order.order_number}`,
    })

    const transferData = await transferRes.json()
    if (!transferData.status) throw new Error(`Paystack transfer error: ${transferData.message}`)
    
    const transferReference = transferData.data.transfer_code
    const transferStatus = transferData.data.status

    // 8. --- UPDATE DATABASE (FINAL STEP) ---
    // Step 8a: Update the order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_status: 'delivered',
        escrow_released: true,
        delivery_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        commission_amount: commission,
        seller_payout_amount: sellerPayout,
      })
      .eq('id', orderId)
    
    if (updateError) throw new Error(`DB update failed: ${updateError.message}`)

    // Step 8b: Log in transactions table
    await supabase.from('transactions').insert({
      order_id: order.id,
      user_id: order.seller.user_id,
      transaction_type: 'payout',
      amount: sellerPayout,
      payment_provider: 'paystack',
      payment_reference: transferReference,
      status: transferStatus,
    })

    // Step 8c: Create notifications
    // 1. Buyer notification
    await supabase.from('notifications').insert({
      user_id: order.buyer_id,
      type: 'order_delivered',
      title: 'Order Delivered! 🎉',
      message: `Your order #${order.order_number} (${productName}) has been delivered successfully`,
      order_number: order.order_number,
      is_read: false
    })

    // 2. Seller notification
    await supabase.from('notifications').insert({
      user_id: order.seller.user_id,
      type: 'escrow_released',
      title: 'Escrow Released 💰',
      message: `₦${sellerPayout.toFixed(0)} has been released from escrow for order #${order.order_number}`,
      order_number: order.order_number,
      amount: sellerPayout.toString(),
      is_read: false
    })

    // 9. Return Success
    const successMessage = transferStatus === 'success' 
      ? `Delivery confirmed! Payout of ₦${sellerPayout.toFixed(2)} sent to seller.`
      : `Delivery confirmed! Payout of ₦${sellerPayout.toFixed(2)} is processing.`

    return new Response(JSON.stringify({ 
      message: successMessage,
      transferStatus: transferStatus,
      commission: commission,
      sellerPayout: sellerPayout,
      orderTotal: orderTotal
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('Edge function error:', err)
    // 10. Handle all errors
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, 
    })
  }
})