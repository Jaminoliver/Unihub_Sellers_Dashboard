'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { NIGERIAN_BANKS } from '@/lib/banks';

interface Bank {
  name: string;
  code: string;
}

export interface UpdateBankDetailsState {
  error?: string | null;
  message?: string | null;
}

/**
 * Compares two names for similarity.
 * Returns true if at least 50% of the profile name words match the bank account name.
 */
function isNameSimilar(profileName: string, bankAccountName: string): boolean {
  // Handle null or undefined inputs
  if (!profileName || !bankAccountName) return false;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 1);

  const profileParts = normalize(profileName);
  const bankParts = normalize(bankAccountName);

  if (profileParts.length === 0 || bankParts.length === 0) return false;

  let matchCount = 0;
  for (const part of profileParts) {
    if (bankParts.some(bankPart => bankPart.includes(part) || part.includes(bankPart))) {
      matchCount++;
    }
  }

  // At least 50% of profile name words must match
  return (matchCount / profileParts.length) >= 0.5;
}

export async function updateBankDetails(
  prevState: UpdateBankDetailsState,
  formData: FormData
): Promise<UpdateBankDetailsState> {
  try {
    const supabase = await createServerSupabaseClient();
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    // 1. Get form data
    const accountNumber = formData.get('account_number') as string;
    const bankCode = formData.get('bank_code') as string;

    // Validation
    if (!accountNumber || !bankCode) {
      return { error: 'Please provide both account number and bank.' };
    }

    if (accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) {
      return { error: 'Account number must be exactly 10 digits.' };
    }

    if (!PAYSTACK_SECRET_KEY) {
      console.error('Paystack secret key is not set.');
      return { error: 'Verification service is temporarily unavailable. Please try again later.' };
    }

    // 2. Get current user/seller info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { error: 'You must be logged in to update bank details.' };
    }

    // Get seller profile to compare names
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return { error: 'Could not find your seller profile.' };
    }

    // 3. Find bank name from local list
    const bank = NIGERIAN_BANKS.find((b: Bank) => b.code === bankCode);
    const localBankName = bank ? bank.name : 'Unknown Bank';

    // 4. Check if we're in test mode
    const isTestMode = PAYSTACK_SECRET_KEY.startsWith('sk_test_');

    let resolvedAccountName: string;
    let resolvedBankName: string;

    if (isTestMode) {
      // --- TEST MODE: NEVER call Paystack API ---
      console.log('🧪 TEST MODE: Skipping ALL Paystack verification');
      console.log(`Account Number: ${accountNumber}, Bank Code: ${bankCode}`);
      
      // Always use the seller's profile name in test mode
      resolvedAccountName = seller.full_name;
      resolvedBankName = localBankName;
      console.log(`✅ Bypassing Paystack, using seller profile name: ${resolvedAccountName}`);

    } else {
      // --- LIVE MODE: Do actual Paystack verification ---
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(
          `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok || !data.status) {
          console.error('Paystack resolve error:', data.message);
          return { 
            error: "Account verification failed. Please check that your account number and bank are correct." 
          };
        }

        resolvedAccountName = data.data.account_name;
        resolvedBankName = data.data.bank_name || localBankName;

      } catch (error: any) {
        if (error.name === 'AbortError') {
          return { error: 'Verification request timed out. Please try again.' };
        }
        console.error('Error calling Paystack:', error);
        return { error: 'Could not connect to verification service. Please check your internet connection and try again.' };
      }
    }

    // 5. Compare names (works for both test and live mode)
    const namesAreSimilar = isNameSimilar(seller.full_name, resolvedAccountName);

    if (!namesAreSimilar) {
      console.warn(`❌ Name mismatch: Profile="${seller.full_name}", Bank="${resolvedAccountName}"`);
      return {
        error: `Account name mismatch: The name on this bank account ("${resolvedAccountName}") doesn't match your profile name ("${seller.full_name}"). Please use an account in your name or update your profile name.`,
      };
    }

    // 6. Names match! Update Supabase
    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        account_name: resolvedAccountName,
        bank_name: resolvedBankName,
        bank_account_number: accountNumber,
        bank_code: bankCode,
        bank_verified: true,
      })
      .eq('id', seller.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return { error: 'Could not save bank details. Please try again.' };
    }

    // 7. Success!
    revalidatePath('/dashboard/account/verification');
    
    const modeLabel = isTestMode ? '(Test Mode)' : '';
    return { 
      message: `Bank account verified successfully! ${modeLabel} Your ${resolvedBankName} account is now linked.` 
    };

  } catch (error) {
    console.error('Unexpected error in updateBankDetails:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}