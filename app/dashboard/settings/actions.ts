// app/dashboard/settings/actions.ts
'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Fetch universities filtered by state
 */
export async function getUniversitiesByState(stateId: string) {
  if (!stateId) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('universities')
    .select('id, name')
    .eq('state_id', stateId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching universities:', error);
    return [];
  }

  return data || [];
}

// --- SELLER PROFILE SECTION ---

// Zod schema for the seller profile
const sellerProfileSchema = z.object({
  business_name: z.string().min(3, 'Business name is required'),
  full_name: z.string().min(3, 'Full name is required'),
  phone_number: z
    .string()
    .min(11, 'A valid phone number is required')
    .regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid phone number format'),
  pickup_address: z.string().min(10, 'Pickup address is required'),
  university_id: z.string().uuid('Please select your university'),
  lga: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_name: z.string().optional(),
});

// State type for the form
export type SellerProfileState = {
  error: string | null;
  message: string | null;
};

// Update seller profile action
export async function updateSellerProfile(
  prevState: SellerProfileState,
  formData: FormData
): Promise<SellerProfileState> {
  const supabase = await createServerSupabaseClient();

  // 1. Get user and seller ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'You must be logged in.', message: null };

  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    return { error: 'Could not find seller profile.', message: null };
  }

  // 2. Validate the form data
  const validatedFields = sellerProfileSchema.safeParse({
    business_name: formData.get('business_name'),
    full_name: formData.get('full_name'),
    phone_number: formData.get('phone_number'),
    pickup_address: formData.get('pickup_address'),
    university_id: formData.get('university_id'),
    lga: formData.get('lga'),
    bank_name: formData.get('bank_name'),
    account_number: formData.get('account_number'),
    account_name: formData.get('account_name'),
  });

  if (!validatedFields.success) {
    console.error('Profile validation errors:', validatedFields.error.flatten().fieldErrors);
    const firstError = Object.values(
      validatedFields.error.flatten().fieldErrors
    )[0]?.[0];
    return { error: firstError || 'Invalid data.', message: null };
  }

  // Get the validated data
  const {
    business_name,
    full_name,
    phone_number,
    pickup_address,
    university_id,
    lga,
    bank_name,
    account_number,
    account_name,
  } = validatedFields.data;

  // 3. Get state from the chosen university
  let stateName: string | null = null;
  
  if (university_id) {
    const { data: uniData } = await supabase
      .from('universities')
      .select('state_id, states(name)')
      .eq('id', university_id)
      .single();

    if (uniData && uniData.states) {
      stateName = (uniData.states as any).name;
    }
  }

  // 4. Update the seller's profile
  const updateData: any = {
    business_name,
    full_name,
    phone_number,
    pickup_address,
    university_id,
    state: stateName || null,
    lga: lga || null,
    updated_at: new Date().toISOString(),
  };

  // Only update bank details if they were provided
  if (bank_name) updateData.bank_name = bank_name;
  if (account_number) updateData.bank_account_number = account_number;
  if (account_name) updateData.account_name = account_name;

  const { error: updateError } = await supabase
    .from('sellers')
    .update(updateData)
    .eq('id', seller.id);

  if (updateError) {
    console.error('Database update error:', updateError);
    return { error: 'Failed to update profile: ' + updateError.message, message: null };
  }

  // 5. Revalidate path and return success
  revalidatePath('/seller/settings');
  revalidatePath('/dashboard/settings');
  return { error: null, message: 'Profile updated successfully!' };
}