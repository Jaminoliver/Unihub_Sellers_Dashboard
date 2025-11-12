'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
// REMOVED: import { NIGERIAN_BANKS } from '@/lib/banks';

// Define the schema for our form data using Zod
const productSchema = z.object({
  name: z.string().min(5, 'Product name must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.coerce.number().min(1, 'Price must be greater than 0'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  category: z.string().uuid('Invalid category'),
  university_id: z.string().uuid('Invalid university').optional(),
  condition: z.string().optional(),
  sku: z.string().optional(),
  original_price: z.coerce.number().optional(),
  discount_percentage: z.coerce.number().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
});

// --- (FIXED) Zod schema for bank details ---
// We only validate what the user provides.
// 'account_name' is removed because we fetch it from Paystack.
const bankDetailsSchema = z.object({
  bank_code: z.string().min(3, 'Bank code is required'),
  account_number: z
    .string()
    .min(10, 'Account number must be 10 digits')
    .max(10, 'Account number must be 10 digits')
    .regex(/^\d+$/, 'Account number must only contain digits'),
});

// ADD PRODUCT ACTION (Original - Unchanged)
export async function addProduct(
  prevState: { error: string | null },
  formData: FormData
) {
  const supabase = await createServerSupabaseClient();

  // 1. Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to add a product.' };
  }

  // 2. Get the seller ID from the user ID
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, university_id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    return { error: 'Could not find seller profile.' };
  }

  // 3. Validate the form data
  const validatedFields = productSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    stock: formData.get('stock'),
    category: formData.get('category'),
    condition: formData.get('condition'),
    sku: formData.get('sku'),
    original_price: formData.get('original_price'),
    discount_percentage: formData.get('discount_percentage'),
    brand: formData.get('brand'),
    color: formData.get('color'),
  });

  if (!validatedFields.success) {
    console.error(
      'Validation errors:',
      validatedFields.error.flatten().fieldErrors
    );
    const firstError = Object.values(
      validatedFields.error.flatten().fieldErrors
    )[0]?.[0];
    return { error: firstError || 'Invalid data. Please check the form.' };
  }

  const {
    name,
    description,
    price,
    stock,
    category,
    condition,
    sku,
    original_price,
    discount_percentage,
    brand,
    color,
  } = validatedFields.data;

  // 4. Handle Image Uploads
  const images = formData.getAll('images') as File[];
  const imageUrls: string[] = [];

  if (images.length < 3) {
    return { error: 'You must upload at least 3 images.' };
  }

  if (images.length > 8) {
    return { error: 'You can upload a maximum of 8 images.' };
  }

  for (const image of images) {
    if (image.size > 0) {
      const filePath = `products/${seller.id}/${Date.now()}-${image.name}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, image);

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        return { error: 'Failed to upload one or more images.' };
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      imageUrls.push(urlData.publicUrl);
    }
  }

  // 5. Insert the new product into the database
  const { error: insertError } = await supabase.from('products').insert({
    name,
    description,
    price,
    stock_quantity: stock,
    category_id: category,
    seller_id: seller.id,
    university_id: seller.university_id,
    image_urls: imageUrls,
    is_available: stock > 0,
    condition: condition || 'new',
    sku: sku || null,
    original_price: original_price || null,
    discount_percentage: discount_percentage || 0,
    brand: brand || null,
    color: color || null,
  });

  if (insertError) {
    console.error('Database insert error:', insertError);
    return { error: 'Failed to save product to database.' };
  }

  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');

  return { error: null };
}

// UPDATE PRODUCT ACTION (Original - Unchanged)
export async function updateProduct(
  productId: string,
  prevState: { error: string | null },
  formData: FormData
) {
  const supabase = await createServerSupabaseClient();

  // 1. Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to update a product.' };
  }

  // 2. Get the seller ID
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    return { error: 'Could not find seller profile.' };
  }

  // 3. Verify product ownership
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('seller_id, image_urls')
    .eq('id', productId)
    .single();

  if (fetchError || !product) {
    return { error: 'Product not found.' };
  }

  if (product.seller_id !== seller.id) {
    return { error: 'You do not have permission to update this product.' };
  }

  // 4. Validate the form data
  const universityIdValue = formData.get('university_id');
  
  const validatedFields = productSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    stock: formData.get('stock'),
    category: formData.get('category'),
    university_id: universityIdValue && universityIdValue !== '' ? universityIdValue : undefined,
    condition: formData.get('condition'),
    sku: formData.get('sku'),
    original_price: formData.get('original_price'),
    discount_percentage: formData.get('discount_percentage'),
    brand: formData.get('brand'),
    color: formData.get('color'),
  });

  if (!validatedFields.success) {
    console.error(
      'Validation errors:',
      validatedFields.error.flatten().fieldErrors
    );
    const firstError = Object.values(
      validatedFields.error.flatten().fieldErrors
    )[0]?.[0];
    return { error: firstError || 'Invalid data. Please check the form.' };
  }

  const {
    name,
    description,
    price,
    stock,
    category,
    university_id,
    condition,
    sku,
    original_price,
    discount_percentage,
    brand,
    color,
  } = validatedFields.data;

  // 5. Handle new image uploads (if any)
  const newImages = formData.getAll('images') as File[];
  let imageUrls = product.image_urls || [];

  const keepOldImages = formData.get('keepOldImages') === 'true';

  if (newImages.length > 0 && newImages[0].size > 0) {
    if (!keepOldImages) {
      for (const url of imageUrls) {
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/product-images/');
          if (pathParts[1]) {
            await supabase.storage.from('product-images').remove([pathParts[1]]);
          }
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
      imageUrls = [];
    }

    for (const image of newImages) {
      if (image.size > 0) {
        const filePath = `products/${seller.id}/${Date.now()}-${image.name}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, image);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          return { error: 'Failed to upload one or more images.' };
        }

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrls.push(urlData.publicUrl);
      }
    }
  }

  // 6. Update the product in the database
  const { error: updateError } = await supabase
    .from('products')
    .update({
      name,
      description,
      price,
      stock_quantity: stock,
      category_id: category,
      university_id: university_id || null,
      image_urls: imageUrls,
      is_available: stock > 0,
      condition: condition || 'new',
      sku: sku || null,
      original_price: original_price || null,
      discount_percentage: discount_percentage || 0,
      brand: brand || null,
      color: color || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (updateError) {
    console.error('Database update error:', updateError);
    return { error: 'Failed to update product in database.' };
  }

  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');

  return { error: null };
}

// DELETE PRODUCT ACTION (Original - Unchanged)
export async function deleteProduct(productId: string) {
  console.log('=== DELETE PRODUCT STARTED ===');
  console.log('Product ID:', productId);

  const supabase = await createServerSupabaseClient();

  // 1. Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to delete a product.' };
  }

  // 2. Get the seller ID
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    return { error: 'Could not find seller profile.' };
  }

  // 3. Get product to verify ownership and get image URLs
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('seller_id, image_urls')
    .eq('id', productId)
    .single();

  if (fetchError || !product) {
    return { error: 'Product not found.' };
  }

  // 4. Verify the product belongs to this seller
  if (product.seller_id !== seller.id) {
    return { error: 'You do not have permission to delete this product.' };
  }

  // 5. Delete images from storage
  if (product.image_urls && Array.isArray(product.image_urls)) {
    for (const url of product.image_urls) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/product-images/');
        if (pathParts[1]) {
          await supabase.storage.from('product-images').remove([pathParts[1]]);
        }
      } catch (err) {
        console.error('Error parsing/deleting image URL:', err);
      }
    }
  }

  // 6. Delete the product from database
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (deleteError) {
    return {
      error: 'Failed to delete product from database: ' + deleteError.message,
    };
  }

  // 7. Revalidate the products page
  revalidatePath('/dashboard/products');
  return { error: null };
}

// --- BANK DETAILS SECTION ---

// 1. Define a single, consistent state type for the form
type BankDetailsState = {
  error: string | null;
  message: string | null;
};

// 2. REMOVED: NIGERIAN_BANKS_MAP - No longer needed

// --- (FIXED) UPDATE BANK DETAILS ACTION ---
export async function updateBankDetails(
  prevState: BankDetailsState,
  formData: FormData
): Promise<BankDetailsState> {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

  if (!PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY is not set.');
    return { error: 'Server configuration error.', message: null };
  }

  const supabase = await createServerSupabaseClient();

  // 1. Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in.', message: null };
  }

  // 2. Get the seller ID
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    return { error: 'Could not find seller profile.', message: null };
  }

  // 3. Validate the form data (using new schema)
  const validatedFields = bankDetailsSchema.safeParse({
    bank_code: formData.get('bank_code'),
    account_number: formData.get('account_number'),
  });

  if (!validatedFields.success) {
    const firstError = Object.values(
      validatedFields.error.flatten().fieldErrors
    )[0]?.[0];
    return { error: firstError || 'Invalid data.', message: null };
  }

  const { bank_code, account_number } = validatedFields.data;

  // 4. VERIFY WITH PAYSTACK
  let verifiedAccountName: string;
  let verifiedBankName: string;

  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (!result.status || !result.data || !result.data.account_name) {
      console.error('Paystack error:', result.message);
      return { error: result.message || 'Invalid account details.', message: null };
    }

    // --- SUCCESS ---
    // Get the official, verified names from Paystack
    verifiedAccountName = result.data.account_name;
    verifiedBankName = result.data.bank_name;

  } catch (error) {
    console.error('Failed to fetch Paystack API:', error);
    return { error: 'Could not connect to verification service.', message: null };
  }

  // 5. REMOVED: Complex name matching logic

  // 6. UPDATE DATABASE
  // Use the verified details from Paystack
  console.log('Attempting to update seller:', seller.id);
  console.log('Bank details:', {
    bank_name: verifiedBankName,
    account_name: verifiedAccountName,
    bank_account_number: account_number,
    bank_code: bank_code,
    bank_verified: true,
  });

  const { data: updateData, error: updateError } = await supabase
    .from('sellers')
    .update({
      bank_name: verifiedBankName,
      account_name: verifiedAccountName,
      bank_account_number: account_number,
      bank_code: bank_code,
      bank_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seller.id)
    .select();

  console.log('Update result:', { updateData, updateError });

  if (updateError) {
    console.error('Database update error:', updateError);
    return { error: 'Failed to save bank details: ' + updateError.message, message: null };
  }

  if (!updateData || updateData.length === 0) {
    console.error('No rows were updated');
    return { error: 'Failed to update seller record.', message: null };
  }

  // 7. Revalidate the path and return success
  revalidatePath('/dashboard/account/verification');
  return { error: null, message: 'Bank account verified and saved!' };
}

// --- SUSPENSION ACTIONS ---

// SUSPEND PRODUCT ACTION (Original - Unchanged)
export async function suspendProduct(
  productId: string,
  days: number,
  reason?: string
) {
  const supabase = await createServerSupabaseClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to suspend a product.' };
  }

  // 2. Get seller ID
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    return { error: 'Could not find seller profile.' };
  }

  // 3. Verify product ownership
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('seller_id')
    .eq('id', productId)
    .single();

  if (fetchError || !product) {
    return { error: 'Product not found.' };
  }

  if (product.seller_id !== seller.id) {
    return { error: 'You do not have permission to suspend this product.' };
  }

  // 4. Calculate suspension end date
  const suspendedUntil = new Date();
  suspendedUntil.setDate(suspendedUntil.getDate() + days);

  // 5. Update product with suspension
  const { error: updateError } = await supabase
    .from('products')
    .update({
      suspended_until: suspendedUntil.toISOString(),
      suspension_reason: reason || null,
      is_available: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (updateError) {
    console.error('Error suspending product:', updateError);
    return { error: 'Failed to suspend product.' };
  }

  revalidatePath('/dashboard/products');
  return { 
    success: true, 
    message: `Product suspended for ${days} day${days !== 1 ? 's' : ''}` 
  };
}

// UNSUSPEND PRODUCT ACTION (Original - Unchanged)
export async function unsuspendProduct(productId: string) {
  const supabase = await createServerSupabaseClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to unsuspend a product.' };
  }

  // 2. Get seller ID
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    return { error: 'Could not find seller profile.' };
  }

  // 3. Verify product ownership
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('seller_id, stock_quantity')
    .eq('id', productId)
    .single();

  if (fetchError || !product) {
    return { error: 'Product not found.' };
  }

  if (product.seller_id !== seller.id) {
    return { error: 'You do not have permission to unsuspend this product.' };
  }

  // 4. Remove suspension and restore availability (if in stock)
  const { error: updateError } = await supabase
    .from('products')
    .update({
      suspended_until: null,
      suspension_reason: null,
      is_available: product.stock_quantity > 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (updateError) {
    console.error('Error unsuspending product:', updateError);
    return { error: 'Failed to unsuspend product.' };
  }

  revalidatePath('/dashboard/products');
  return { success: true, message: 'Product unsuspended successfully' };
}