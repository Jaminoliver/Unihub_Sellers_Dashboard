import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WalletCard } from '@/components/features/finance/WalletCard';
import { TransactionList } from '@/components/features/finance/TransactionList';
import { WithdrawalHistory } from '@/components/features/finance/WithdrawalHistory';

export default async function FinancePage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get seller data
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, wallet_balance, bank_verified')
    .eq('user_id', user.id)
    .single();

  if (!seller) redirect('/dashboard');

  // Get recent transactions
  const { data: transactions } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get pending withdrawals
  const { data: withdrawals } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-500 mt-1">Manage your wallet and withdrawals</p>
      </div>

      <WalletCard 
        balance={parseFloat(seller.wallet_balance || '0')} 
        bankVerified={seller.bank_verified}
      />

      <WithdrawalHistory withdrawals={withdrawals || []} />

      <TransactionList transactions={transactions || []} />
    </div>
  );
}