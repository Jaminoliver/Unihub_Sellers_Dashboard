import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BankVerificationPage } from '@/components/features/sellers/BankVerificationPage';
import { redirect } from 'next/navigation';

// Helper function to get the seller's data
async function getSellerData(supabase: any, userId: string) {
  const { data: seller, error } = await supabase
    .from('sellers')
    .select(
      'id, full_name, bank_name, account_name, bank_account_number, bank_verified, bank_code'
    )
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching seller data:', error);
    return null;
  }
  return seller;
}

export default async function VerificationPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const seller = await getSellerData(supabase, user.id);

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

  return <BankVerificationPage seller={seller} />;
}