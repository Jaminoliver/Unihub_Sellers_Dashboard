import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WalletCard } from '@/components/features/finance/WalletCard';
import { FinanceTabs } from '@/components/features/finance/FinanceTabs';
import { EscrowSummaryCard } from '@/components/features/finance/EscrowSummaryCard';

export default async function FinancePage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // 1. Fetch Seller Data
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, available_balance, pending_balance, bank_verified, total_earnings')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    return <div>Seller profile not found. Please contact support.</div>;
  }

  // 2. Fetch Withdrawal History
  const { data: withdrawals } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  // 3. Fetch Wallet Transactions
  const { data: walletTransactions } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  // 4. ✅ Fetch Escrow Summary (just totals, no full details)
  const { data: escrowSummary } = await supabase
    .from('escrow')
    .select('amount')
    .eq('seller_id', user.id)
    .eq('status', 'holding');

  const escrowTotal = (escrowSummary || []).reduce((sum, e) => sum + Number(e.amount), 0);
  const escrowCount = (escrowSummary || []).length;

  // 5. Transform Ledger Data for UI
  const formattedTransactions = (walletTransactions || []).map((txn) => {
    const isRefund = txn.transaction_type === 'debit' && 
                     txn.description?.toLowerCase().includes('refund');
    
    let type: 'earning' | 'withdrawal' | 'refund';
    if (isRefund) {
      type = 'refund';
    } else if (txn.transaction_type === 'credit') {
      type = 'earning';
    } else {
      type = 'withdrawal';
    }
    
    return {
      id: txn.id,
      type: type,
      amount: parseFloat(txn.amount.toString()),
      status: txn.status || 'completed',
      date: txn.created_at,
      description: txn.description || (txn.transaction_type === 'credit' ? 'Earnings' : 'Debit'),
      created_at: txn.created_at,
      processedAt: txn.clears_at || txn.updated_at || undefined,
    };
  });

  // 6. Calculate Stats
  const totalWithdrawals = (withdrawals || [])
    .filter(w => ['approved', 'processing', 'completed'].includes(w.status))
    .reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);

  const pendingWithdrawals = (withdrawals || [])
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);

  return (
    <div className="space-y-6 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-500 mt-1">Manage your wallet and withdrawals</p>
      </div>

      <WalletCard 
        availableBalance={seller.available_balance ?? 0}
        pendingBalance={seller.pending_balance ?? 0}
        bankVerified={seller.bank_verified ?? false}
        totalEarnings={seller.total_earnings ?? 0} 
        totalWithdrawals={totalWithdrawals}
        pendingWithdrawals={pendingWithdrawals}
      />

      {/* ✅ NEW: Escrow Summary Card (click to view details) */}
      <EscrowSummaryCard totalAmount={escrowTotal} orderCount={escrowCount} />

      <FinanceTabs 
        transactions={formattedTransactions as any[]}
        withdrawals={withdrawals || []}
      />
    </div>
  );
}