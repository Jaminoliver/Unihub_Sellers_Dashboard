import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Helper for clean JSON responses
function jsonResponse(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized - Please log in' }, 401);
    }

    const body = await request.json();
    const { productId, message } = body;

    // 2. Validate input
    if (!productId) return jsonResponse({ error: 'Product ID is required' }, 400);
    if (!message || message.trim().length === 0) return jsonResponse({ error: 'Appeal message is required' }, 400);
    if (message.length < 10) return jsonResponse({ error: 'Message must be at least 10 characters' }, 400);
    if (message.length > 1000) return jsonResponse({ error: 'Message must be less than 1000 characters' }, 400);

    // 3. Verify the product exists and check ban/suspension status
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('seller_id, admin_suspended, is_banned')  // ← ADDED is_banned check
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return jsonResponse({ error: 'Product not found' }, 404);
    }

    // 4. BLOCK APPEALS FOR BANNED PRODUCTS
    if (product.is_banned) {
      return jsonResponse({ 
        error: 'This product has been permanently banned and cannot be appealed. Please contact support for assistance.' 
      }, 403);
    }

    // 5. Get seller record
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id') 
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return jsonResponse({ error: 'Seller account not found.' }, 403);
    }

    // 6. Verify Ownership
    if (product.seller_id !== seller.id) {
      return jsonResponse({ error: 'You do not own this product' }, 403);
    }

    // 7. Check if product is actually admin suspended
    if (!product.admin_suspended) {
      return jsonResponse({ error: 'This product is not currently suspended by an admin' }, 400);
    }

    // 8. Check for existing pending appeals
    const { data: existingAppeal } = await supabase
      .from('appeals')
      .select('id')
      .eq('product_id', productId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingAppeal) {
      return jsonResponse({ error: 'An appeal is already pending for this product' }, 400);
    }

    // 9. Create the appeal
    const { data: appeal, error: appealError } = await supabase
      .from('appeals')
      .insert({
        product_id: productId,
        seller_id: seller.id,
        message: message.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (appealError) {
      console.error('Error creating appeal:', appealError);
      return jsonResponse({ error: 'Failed to create appeal.' }, 500);
    }

    return jsonResponse({ success: true, appeal, message: 'Appeal submitted successfully' }, 201);

  } catch (error: any) {
    console.error('Appeal submission error:', error);
    return jsonResponse({ error: error.message || 'Internal server error.' }, 500);
  }
}

// --- PATCH METHOD (For Admin Dashboard) ---

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check Auth & Admin Status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', user.id).single();
    if (!admin) return jsonResponse({ error: 'Admin access required' }, 403);

    const { appealId, status, reason, action } = await request.json();

    if (!appealId || !status) return jsonResponse({ error: 'Missing fields' }, 400);

    // Get the appeal to find the product_id
    const { data: appeal, error: appealError } = await supabase
      .from('appeals')
      .select('*, products(id)')
      .eq('id', appealId)
      .single();

    if (appealError || !appeal) return jsonResponse({ error: 'Appeal not found' }, 404);

    // Update appeal status
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (reason) updateData.admin_reason = reason;

    const { error: updateError } = await supabase
      .from('appeals')
      .update(updateData)
      .eq('id', appealId);

    if (updateError) return jsonResponse({ error: 'Failed to update appeal' }, 500);

    // If approved, unsuspend the product
    if (status === 'approved' && action === 'unsuspend') {
      const { error: productError } = await supabase
        .from('products')
        .update({ 
          admin_suspended: false,
          admin_suspension_reason: null,
          admin_suspended_at: null,
          admin_suspended_by: null,
          is_available: true,
        })
        .eq('id', appeal.product_id);

      if (productError) {
        console.error('Error unsuspending product:', productError);
        return jsonResponse({ error: 'Appeal approved but failed to unsuspend product' }, 500);
      }
    }

    return jsonResponse({ success: true, message: `Appeal ${status} successfully` }, 200);

  } catch (error: any) {
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}