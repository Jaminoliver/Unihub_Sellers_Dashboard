import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WalletCard } from '@/components/features/finance/WalletCard';
import { FinanceTabs } from '@/components/features/finance/FinanceTabs';

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

  // Get wallet transactions (money IN from orders) - for display only
  const { data: walletTransactions } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('seller_id', seller.id)
    .eq('transaction_type', 'credit')
    .order('created_at', { ascending: false });

  // Get all withdrawals (money OUT)
  const { data: withdrawals } = await supabase
    .from('withdrawal_requests')
    .select('id, amount, status, created_at, processed_at, bank_name, account_number, failure_reason')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  // Combine wallet transactions and withdrawals into unified transaction history
  const combinedTransactions = [
    // Add wallet credits (money IN)
    ...(walletTransactions || []).map(transaction => ({
      id: `credit-${transaction.id}`,
      type: 'earning' as const,
      amount: parseFloat(transaction.amount),
      status: 'completed',
      date: transaction.created_at,
      description: transaction.description || 'Payment received',
      created_at: transaction.created_at,
      balance_after: transaction.balance_after,
      reference: transaction.reference,
    })),
    // Add withdrawals (money OUT)
    ...(withdrawals || []).map(withdrawal => ({
      id: `withdrawal-${withdrawal.id}`,
      type: 'withdrawal' as const,
      amount: parseFloat(withdrawal.amount),
      status: withdrawal.status,
      date: withdrawal.created_at,
      description: 'Withdrawal to bank account',
      processedAt: withdrawal.processed_at,
      created_at: withdrawal.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate statistics - SOURCE OF TRUTH approach
  // Available balance comes directly from database (most reliable)
  const availableBalance = parseFloat(seller.wallet_balance || '0');
  
  // Total completed withdrawals
  const totalWithdrawals = (withdrawals || [])
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + parseFloat(w.amount), 0);
  
  // Pending withdrawals
  const pendingWithdrawals = (withdrawals || [])
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + parseFloat(w.amount), 0);
  
  // Calculate total earnings: Available Balance + Total Withdrawals
  // This gives us lifetime earnings
  const totalEarnings = availableBalance + totalWithdrawals;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-500 mt-1">Manage your wallet and withdrawals</p>
      </div>

      <WalletCard 
        balance={availableBalance}
        bankVerified={seller.bank_verified}
        totalEarnings={totalEarnings}
        totalWithdrawals={totalWithdrawals}
        pendingWithdrawals={pendingWithdrawals}
      />

      <FinanceTabs 
        transactions={combinedTransactions}
        withdrawals={withdrawals || []}
      />
    </div>
  );
}