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
 * IMPROVED: Compares two names for similarity with stricter rules.
 */
function isNameSimilar(profileName: string, bankAccountName: string): boolean {
  if (!profileName || !bankAccountName) return false;

  // Normalize: lowercase, remove special chars, split into words > 1 char
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 1);

  const profileParts = normalize(profileName);
  const bankParts = normalize(bankAccountName);

  if (profileParts.length === 0 || bankParts.length === 0) return false;

  let matchCount = 0;
  for (const part of profileParts) {
    // Check if the word exists in the other name
    if (bankParts.some((bankPart) => bankPart.includes(part) || part.includes(bankPart))) {
      matchCount++;
    }
  }

  const matchPercentage = matchCount / profileParts.length;

  // STRICT RULE:
  // If the profile name is short (2 words or less, e.g. "John Doe"), require 100% match.
  // This prevents "John Doe" from verifying "John Smith".
  if (profileParts.length <= 2) {
    return matchPercentage === 1.0;
  }

  // LOOSER RULE:
  // For long names (3+ words), allow ~60% match to account for missing middle names.
  // e.g. "John Jacob Jingleheim Smith" vs "John Smith"
  return matchPercentage >= 0.6;
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

    if (!accountNumber || !bankCode) {
      return { error: 'Please provide both account number and bank.' };
    }

    if (accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) {
      return { error: 'Account number must be exactly 10 digits.' };
    }

    if (!PAYSTACK_SECRET_KEY) {
      console.error('Paystack secret key is not set.');
      return { error: 'Verification service unavailable.' };
    }

    // 2. Get current user & seller profile
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { error: 'You must be logged in.' };
    }

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return { error: 'Could not find your seller profile.' };
    }

    // 3. Find bank name locally
    const bank = NIGERIAN_BANKS.find((b: Bank) => b.code === bankCode);
    const localBankName = bank ? bank.name : 'Unknown Bank';

    // 4. Resolve Bank Account (Test Mode vs Live Mode)
    const isTestMode = PAYSTACK_SECRET_KEY.startsWith('sk_test_');
    let resolvedAccountName: string;
    let resolvedBankName: string;

    if (isTestMode) {
      console.log('🧪 TEST MODE ACTIVE');
      
      // LOGIC UPGRADE: Simulate Failure vs Success
      if (accountNumber === '0000000000') {
        // Magic Number 0000000000 -> Force Success
        console.log('✅ Magic Number used: Simulating exact match.');
        resolvedAccountName = seller.full_name;
        resolvedBankName = localBankName;
      } else {
        // Any other number -> Return a dummy name to force mismatch
        console.log('❌ Standard Number used: Simulating mismatch.');
        resolvedAccountName = 'Opay Test User'; 
        resolvedBankName = localBankName;
      }

    } else {
      // --- LIVE MODE: Paystack API Call ---
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(
          `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
          {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok || !data.status) {
          console.error('Paystack resolve error:', data.message);
          return { error: "Could not resolve account details. Check the number and bank." };
        }

        resolvedAccountName = data.data.account_name;
        resolvedBankName = data.data.bank_name || localBankName;

      } catch (error: any) {
        if (error.name === 'AbortError') return { error: 'Request timed out.' };
        return { error: 'Connection error. Please try again.' };
      }
    }

    // 5. Compare names
    console.log(`🔍 Comparing: Profile[${seller.full_name}] vs Bank[${resolvedAccountName}]`);
    
    const namesAreSimilar = isNameSimilar(seller.full_name, resolvedAccountName);

    if (!namesAreSimilar) {
      return {
        error: `Name Mismatch! Your profile says "${seller.full_name}", but this bank account belongs to "${resolvedAccountName}". The names must match to verify.`,
      };
    }

    // 6. Update Database
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
      return { error: 'Database save failed.' };
    }

    // 7. Success
    revalidatePath('/dashboard/account/verification');
    const modeLabel = isTestMode ? '(Test Mode)' : '';
    
    return { 
      message: `Verified! ${modeLabel} Account linked: ${resolvedBankName} - ${resolvedAccountName}` 
    };

  } catch (error) {
    console.error('Unexpected error:', error);
    return { error: 'An unexpected system error occurred.' };
  }
}