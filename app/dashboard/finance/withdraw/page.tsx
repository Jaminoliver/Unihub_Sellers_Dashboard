import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WithdrawalForm } from '@/components/features/finance/WithdrawalForm';

export default async function WithdrawPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, wallet_balance, bank_name, account_name, bank_account_number, bank_verified')
    .eq('user_id', user.id)
    .single();

  if (!seller) redirect('/dashboard');

  if (!seller.bank_verified) {
    redirect('/dashboard/account/verification');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Withdraw Funds</h1>
        <p className="text-gray-500 mt-1">Request a withdrawal to your bank account</p>
      </div>

      <WithdrawalForm 
        walletBalance={parseFloat(seller.wallet_balance || '0')}
        bankName={seller.bank_name || ''}
        accountNumber={seller.bank_account_number || ''}
        accountName={seller.account_name || ''}
      />
    </div>
  );
}