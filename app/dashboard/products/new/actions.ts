'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(5, 'Product name must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.coerce.number().min(1, 'Price must be greater than 0'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  category: z.string().min(1, 'Invalid category'),
  university_id: z.string().min(1, 'Invalid university').optional(),
  condition: z.string().optional(),
  sku: z.string().optional(),
  original_price: z.coerce.number().optional(),
  discount_percentage: z.coerce.number().optional(),
  brand: z.string().optional(),
  colors: z.string().optional(),
  sizes: z.string().optional(),
});

const bankDetailsSchema = z.object({
  bank_code: z.string().min(3, 'Bank code is required'),
  account_number: z.string().min(10, 'Account number must be 10 digits').max(10, 'Account number must be 10 digits').regex(/^\d+$/, 'Account number must only contain digits'),
});

export async function addProduct(prevState: { error: string | null }, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'You must be logged in to add a product.' };

  const { data: seller, error: sellerError } = await supabase.from('sellers').select('id, university_id').eq('user_id', user.id).single();
  if (sellerError || !seller) return { error: 'Could not find seller profile.' };

  const validatedFields = productSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    stock: formData.get('stock'),
    category: formData.get('category'),
    university_id: formData.get('university_id'),
    condition: formData.get('condition'),
    sku: formData.get('sku') || undefined,
    original_price: formData.get('original_price') || undefined,
    discount_percentage: formData.get('discount_percentage') || undefined,
    brand: formData.get('brand') || undefined,
    colors: formData.get('colors') || undefined,
    sizes: formData.get('sizes') || undefined,
  });

  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return { error: firstError || 'Invalid data. Please check the form.' };
  }

  const { name, description, price, stock, category, university_id, condition, sku, original_price, discount_percentage, brand, colors, sizes } = validatedFields.data;

  const images = formData.getAll('images') as File[];
  const imageUrls: string[] = [];

  if (images.length < 1) return { error: 'You must upload at least 1 image.' };
  if (images.length > 5) return { error: 'You can upload a maximum of 5 images.' };

  for (const image of images) {
    if (image.size > 0) {
      const filePath = `products/${seller.id}/${Date.now()}-${image.name}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, image);
      if (uploadError) return { error: 'Failed to upload one or more images.' };

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
      imageUrls.push(urlData.publicUrl);
    }
  }

  const sizesArray = sizes ? JSON.parse(sizes) : [];
  const colorsArray = colors ? JSON.parse(colors) : [];
  
  const { data: newProduct, error: insertError } = await supabase.from('products').insert({
    name, description, price, stock_quantity: stock, category_id: category, seller_id: seller.id,
    university_id, image_urls: imageUrls, is_available: false, approval_status: 'pending',
    condition: condition || 'new', sku: sku || null, original_price: original_price || null,
    discount_percentage: discount_percentage || 0, brand: brand || null, colors: colorsArray, sizes: sizesArray,
  }).select().single();

  if (insertError) return { error: `Failed to save product: ${insertError.message}` };

  if (newProduct) {
    await supabase.from('product_approvals').insert({ product_id: newProduct.id, status: 'pending', created_at: new Date().toISOString() });
    await supabase.from('notifications').insert({
      user_id: seller.id, type: 'product_pending', title: 'Product Submitted for Review',
      message: `Your product "${name}" has been submitted and is awaiting admin approval.`, is_read: false,
    });
  }

  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
  return { error: null };
}

export async function updateProduct(productId: string, prevState: { error: string | null }, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'You must be logged in to update a product.' };

  const { data: seller, error: sellerError } = await supabase.from('sellers').select('id').eq('user_id', user.id).single();
  if (sellerError || !seller) return { error: 'Could not find seller profile.' };

  const { data: product, error: fetchError } = await supabase.from('products')
    .select('seller_id, image_urls, approval_status, admin_suspended, is_banned')
    .eq('id', productId).single();

  if (fetchError || !product) return { error: 'Product not found.' };
  if (product.seller_id !== seller.id) return { error: 'You do not have permission to update this product.' };

  const universityIdValue = formData.get('university_id');
  const validatedFields = productSchema.safeParse({
    name: formData.get('name'), description: formData.get('description'), price: formData.get('price'),
    stock: formData.get('stock'), category: formData.get('category'),
    university_id: universityIdValue && universityIdValue !== '' ? universityIdValue : undefined,
    condition: formData.get('condition'), sku: formData.get('sku') || undefined,
    original_price: formData.get('original_price') || undefined,
    discount_percentage: formData.get('discount_percentage') || undefined,
    brand: formData.get('brand') || undefined, colors: formData.get('colors') || undefined,
    sizes: formData.get('sizes') || undefined,
  });

  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return { error: firstError || 'Invalid data. Please check the form.' };
  }

  const { name, description, price, stock, category, university_id, condition, sku, original_price, discount_percentage, brand, colors, sizes } = validatedFields.data;

  const newImages = formData.getAll('images') as File[];
  let imageUrls = product.image_urls || [];
  const keepOldImages = formData.get('keepOldImages') === 'true';

  if (newImages.length > 0 && newImages[0].size > 0) {
    if (!keepOldImages) {
      for (const url of imageUrls) {
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/product-images/');
          if (pathParts[1]) await supabase.storage.from('product-images').remove([pathParts[1]]);
        } catch (err) { console.error('Error deleting old image:', err); }
      }
      imageUrls = [];
    }

    for (const image of newImages) {
      if (image.size > 0) {
        const filePath = `products/${seller.id}/${Date.now()}-${image.name}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, image);
        if (uploadError) return { error: 'Failed to upload one or more images.' };

        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
        imageUrls.push(urlData.publicUrl);
      }
    }
  }

  // ✅ FIX: Only set available if approved and not suspended
  const is_available = product.approval_status === 'approved' && !product.admin_suspended && !product.is_banned && stock > 0;

  const sizesArray = sizes ? JSON.parse(sizes) : [];
  const colorsArray = colors ? JSON.parse(colors) : [];
  
  const { error: updateError } = await supabase.from('products').update({
    name, description, price, stock_quantity: stock, category_id: category, university_id: university_id || null,
    image_urls: imageUrls, is_available, condition: condition || 'new', sku: sku || null,
    original_price: original_price || null, discount_percentage: discount_percentage || 0,
    brand: brand || null, colors: colorsArray, sizes: sizesArray, updated_at: new Date().toISOString(),
  }).eq('id', productId);

  if (updateError) return { error: 'Failed to update product in database.' };

  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
  return { error: null };
}

export async function deleteProduct(productId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'You must be logged in to delete a product.' };

  const { data: seller } = await supabase.from('sellers').select('id').eq('user_id', user.id).single();
  if (!seller) return { error: 'Could not find seller profile.' };

  const { data: product } = await supabase.from('products').select('seller_id, image_urls').eq('id', productId).single();
  if (!product) return { error: 'Product not found.' };
  if (product.seller_id !== seller.id) return { error: 'You do not have permission to delete this product.' };

  if (product.image_urls && Array.isArray(product.image_urls)) {
    for (const url of product.image_urls) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/product-images/');
        if (pathParts[1]) await supabase.storage.from('product-images').remove([pathParts[1]]);
      } catch (err) { console.error('Error deleting image:', err); }
    }
  }

  const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);
  if (deleteError) return { error: 'Failed to delete product: ' + deleteError.message };

  revalidatePath('/dashboard/products');
  return { error: null };
}

export async function updateBankDetails(prevState: any, formData: FormData) {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET_KEY) return { error: 'Server configuration error.', message: null };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in.', message: null };

  const { data: seller } = await supabase.from('sellers').select('id').eq('user_id', user.id).single();
  if (!seller) return { error: 'Could not find seller profile.', message: null };

  const validatedFields = bankDetailsSchema.safeParse({
    bank_code: formData.get('bank_code'),
    account_number: formData.get('account_number'),
  });

  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return { error: firstError || 'Invalid data.', message: null };
  }

  const { bank_code, account_number } = validatedFields.data;

  try {
    const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    });

    const result = await response.json();
    if (!result.status || !result.data?.account_name) return { error: result.message || 'Invalid account details.', message: null };

    const { error: updateError } = await supabase.from('sellers').update({
      bank_name: result.data.bank_name,
      account_name: result.data.account_name,
      bank_account_number: account_number,
      bank_code: bank_code,
      bank_verified: true,
      updated_at: new Date().toISOString(),
    }).eq('id', seller.id);

    if (updateError) return { error: 'Failed to save bank details: ' + updateError.message, message: null };

    revalidatePath('/dashboard/account/verification');
    return { error: null, message: 'Bank account verified and saved!' };
  } catch (error) {
    return { error: 'Could not connect to verification service.', message: null };
  }
}

export async function suspendProduct(productId: string, days: number, reason?: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in to suspend a product.' };

  const { data: seller } = await supabase.from('sellers').select('id').eq('user_id', user.id).single();
  if (!seller) return { error: 'Could not find seller profile.' };

  const { data: product } = await supabase.from('products').select('seller_id').eq('id', productId).single();
  if (!product || product.seller_id !== seller.id) return { error: 'Product not found or no permission.' };

  const suspendedUntil = new Date();
  suspendedUntil.setDate(suspendedUntil.getDate() + days);

  const { error } = await supabase.from('products').update({
    suspended_until: suspendedUntil.toISOString(),
    suspension_reason: reason || null,
    is_available: false,
    updated_at: new Date().toISOString(),
  }).eq('id', productId);

  if (error) return { error: 'Failed to suspend product.' };

  revalidatePath('/dashboard/products');
  return { success: true, message: `Product suspended for ${days} day${days !== 1 ? 's' : ''}` };
}

export async function unsuspendProduct(productId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in to unsuspend a product.' };

  const { data: seller } = await supabase.from('sellers').select('id').eq('user_id', user.id).single();
  if (!seller) return { error: 'Could not find seller profile.' };

  const { data: product } = await supabase.from('products').select('seller_id, stock_quantity').eq('id', productId).single();
  if (!product || product.seller_id !== seller.id) return { error: 'Product not found or no permission.' };

  const { error } = await supabase.from('products').update({
    suspended_until: null,
    suspension_reason: null,
    is_available: product.stock_quantity > 0,
    updated_at: new Date().toISOString(),
  }).eq('id', productId);

  if (error) return { error: 'Failed to unsuspend product.' };

  revalidatePath('/dashboard/products');
  return { success: true, message: 'Product unsuspended successfully' };
}