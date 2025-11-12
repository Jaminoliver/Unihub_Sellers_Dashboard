// supabase/functions/release-escrow/index.ts
import { serve, Request } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Status } from 'https://deno.land/std@0.168.0/http/http_status.ts'

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
    if (!order.seller) {
      throw new Error('Seller account not found for this order.')
    }

    // --- PAY ON DELIVERY (POD) LOGIC ---
    if (order.payment_method === 'pod' || order.escrow_amount <= 0) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          order_status: 'delivered',
          escrow_released: true,
          delivery_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (updateError) throw new Error(`Failed to update POD order: ${updateError.message}`)
      
      return new Response(JSON.stringify({ message: 'Delivery confirmed for Pay on Delivery order.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: Status.OK,
      })
    }

    // --- ONLINE PAYMENT (ESCROW) LOGIC ---
    const { bank_account_number, bank_code, account_name } = order.seller
    if (!bank_account_number || !bank_code || !account_name) {
      throw new Error('Seller bank details are incomplete. Cannot process payout.')
    }

    // 6. Calculate Payout (5% commission)
    const commission = order.escrow_amount * 0.05 
    const payoutAmount = Math.floor((order.escrow_amount - commission) * 100) // in kobo

    if (payoutAmount <= 10000) { // Paystack minimum is 100 kobo (₦1)
      throw new Error('Payout amount is too low after commission.')
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
      amount: payoutAmount,
      recipient: recipientCode,
      reason: `Payout for UniHub Order #${order.order_number}`,
    })

    const transferData = await transferRes.json()
    if (!transferData.status) throw new Error(`Paystack transfer error: ${transferData.message}`)
    
    const transferReference = transferData.data.transfer_code

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
        seller_payout_amount: payoutAmount / 100, // store in Naira
      })
      .eq('id', orderId)
    
    if (updateError) throw new Error(`DB update failed: ${updateError.message}`)

    // Step 8b: Log in transactions table
    await supabase.from('transactions').insert({
      order_id: order.id,
      user_id: order.seller_id, 
      transaction_type: 'payout',
      amount: payoutAmount / 100,
      payment_provider: 'paystack',
      payment_reference: transferReference,
      status: 'completed',
    })

    // 9. Return Success
    return new Response(JSON.stringify({ message: 'Delivery confirmed! Payout is processing.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: Status.OK,
    })

  } catch (err) {
    // 10. Handle all errors
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: Status.BadRequest, 
    })
  }
})