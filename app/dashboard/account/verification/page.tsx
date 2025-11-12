import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BankVerificationPage } from '@/components/features/sellers/BankVerificationPage';
import { redirect } from 'next/navigation';

// Define the type for a single bank
interface Bank {
  name: string;
  code: string;
}

// Helper function to get the seller's data
async function getSellerData(supabase: any, userId: string) {
  const { data: seller, error } = await supabase
    .from('sellers')
    .select(
      'id, bank_name, account_name, bank_account_number, bank_verified, bank_code'
    )
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching seller data:', error);
    return null;
  }
  return seller;
}

// --- (FIXED) HELPER FUNCTION ---
// This function now de-duplicates and sorts the bank list.
async function getPaystackBankList(): Promise<Bank[]> {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

  if (!PAYSTACK_SECRET_KEY) {
    console.error('Paystack secret key is not set.');
    return [];
  }

  try {
    const response = await fetch(
      'https://api.paystack.co/bank?currency=NGN',
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
        next: { revalidate: 86400 },
      } as any
    );

    if (!response.ok) {
      console.error('Failed to fetch Paystack bank list');
      return [];
    }

    const data = await response.json();
    
    // Map all banks from the API response
    const allBanks: Bank[] = data.data.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
    }));

    // --- THIS IS THE FIX ---
    // Use a Map to automatically remove duplicates based on bank.code
    // The Map constructor takes [key, value] pairs.
    const bankMap = new Map(allBanks.map(bank => [bank.code, bank]));

    // Convert the Map's values back into an array
    const uniqueBankList = Array.from(bankMap.values());
    
    // Sort the list alphabetically by bank name
    uniqueBankList.sort((a, b) => a.name.localeCompare(b.name));

    return uniqueBankList;
    // --- END OF FIX ---

  } catch (error) {
    console.error('Error in getPaystackBankList:', error);
    return [];
  }
}
// --- END OF FUNCTION ---

export default async function VerificationPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [seller, bankList] = await Promise.all([
    getSellerData(supabase, user.id),
    getPaystackBankList(), // This now returns a unique, sorted list
  ]);

  if (!seller) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Seller Profile Not Found
          </h2>
          <p className="text-gray-500">
            Please create a seller profile first.
          </p>
        </div>
      </div>
    );
  }

  return <BankVerificationPage seller={seller} bankList={bankList} />;
}