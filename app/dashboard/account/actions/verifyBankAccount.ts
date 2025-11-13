'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
// --- NEW: Import your local bank list ---
// Make sure this path matches the one in your page.tsx
import { NIGERIAN_BANKS } from '@/lib/banks';

// --- NEW: Define Bank type (matching the one in page.tsx) ---
interface Bank {
  name: string;
  code: string;
}

// --- NEW: Helper function for name comparison ---
/**
 * Compares two names for similarity.
 * This is a simple check that normalizes and splits names.
 * e.g. "John K. Doe" and "DOE, JOHN KEHINDE" will be seen as a match.
 */
function isNameSimilar(profileName: string, bankAccountName: string): boolean {
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
      .split(' ')
      .filter(Boolean); // Remove empty strings

  const profileNameParts = normalize(profileName);
  const bankNameParts = normalize(bankAccountName);

  // Check if at least two name parts match
  let matchCount = 0;
  for (const part of profileNameParts) {
    if (bankNameParts.includes(part)) {
      matchCount++;
    }
  }

  // You can adjust this logic.
  // Requiring 2 matches is good for "Firstname Lastname".
  // If you only store one name, you might change this to 1.
  return matchCount >= 2;
}

// --- NEW: Server Action for verification ---

export interface VerifyBankAccountState {
  error?: string;
  accountName?: string | null;
  success?: boolean;
}

export async function verifyBankAccount(
  sellerId: string,
  sellerProfileName: string,
  prevState: VerifyBankAccountState,
  formData: FormData
): Promise<VerifyBankAccountState> {
  const supabase = await createServerSupabaseClient();
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

  const accountNumber = formData.get('accountNumber') as string;
  const bankCode = formData.get('bankCode') as string;

  if (!accountNumber || !bankCode) {
    return { error: 'Please provide both account number and bank.' };
  }

  if (!PAYSTACK_SECRET_KEY) {
    console.error('Paystack secret key is not set.');
    return { error: 'Verification service is down. Please try again later.' };
  }

  let resolvedAccountName: string;
  let resolvedBankName: string;
  
  // 1. Find the bank name from the local constant for the update
  // --- FIX: Added explicit type for 'b' ---
  const bank = NIGERIAN_BANKS.find((b: Bank) => b.code === bankCode);
  const localBankName = bank ? bank.name : 'Unknown Bank';


  // 2. Call Paystack to resolve the account
  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('Paystack resolve error:', data.message);
      // This is the error you requested
      return { error: "Verification failed: Make sure your account number and bank are correct." };
    }

    resolvedAccountName = data.data.account_name;
    // We use the resolved name from Paystack if available, otherwise our local one
    resolvedBankName = data.data.bank_name || localBankName;

  } catch (error) {
    console.error('Error calling Paystack:', error);
    return { error: 'Could not connect to verification service. Please try again.' };
  }

  // 3. --- NEW: Compare names ---
  const namesAreSimilar = isNameSimilar(sellerProfileName, resolvedAccountName);

  if (!namesAreSimilar) {
    console.warn(`Name mismatch: Profile="${sellerProfileName}", Bank="${resolvedAccountName}"`);
    return {
      error: `Bank verification failed: The name on the bank account ("${resolvedAccountName}") does not match your profile name. Please update your bank details or your profile name.`,
      accountName: null, // Clear the account name
    };
  }

  // 4. Names match! Update Supabase
  try {
    const { error: updateError } = await supabase
      .from('sellers')
    .update({
        account_name: resolvedAccountName,
        bank_name: resolvedBankName, // Use the resolved name
        bank_account_number: accountNumber,
        bank_code: bankCode,
        bank_verified: true,
      })
      .eq('id', sellerId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath('/dashboard/account/verification'); // Re-fetch data on the page
    return { success: true, accountName: resolvedAccountName };

  } catch (error) {
    console.error('Error updating seller record:', error);
    return { error: 'Could not save bank details. Please try again.' };
  }
}