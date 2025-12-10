'use server';


import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface WithdrawalState {
  error?: string | null;
  message?: string | null;
}

const MIN_WITHDRAWAL = 1000; // ₦1000 minimum

export async function requestWithdrawal(
  prevState: WithdrawalState,
  formData: FormData
): Promise<WithdrawalState> {
  try {
    const supabase = await createServerSupabaseClient();
    const amount = parseFloat(formData.get('amount') as string);

    if (!amount || amount < MIN_WITHDRAWAL) {
      return { error: `Minimum withdrawal amount is ₦${MIN_WITHDRAWAL.toLocaleString()}` };
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: 'You must be logged in' };
    }

    // Get seller info with available_balance field
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, available_balance, wallet_balance, bank_name, account_name, bank_account_number, bank_code, bank_verified')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return { error: 'Seller profile not found' };
    }

    if (!seller.bank_verified) {
      return { error: 'Please verify your bank account first' };
    }

    // CHECK AGAINST AVAILABLE BALANCE
    const availableBalance = parseFloat((seller.available_balance || 0).toString());
    const currentWalletBalance = parseFloat((seller.wallet_balance || 0).toString());

    if (availableBalance < amount) {
      return { error: `Insufficient available balance. Available: ₦${availableBalance.toLocaleString()}` };
    }

    const newAvailableBalance = availableBalance - amount;
    const newWalletBalance = currentWalletBalance - amount;

    // DEDUCT FROM BOTH BALANCES
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ 
        available_balance: newAvailableBalance,
        wallet_balance: newWalletBalance,
        updated_at: new Date().toISOString()
      } as any) 
      .eq('id', seller.id);

    if (updateError) {
      console.error('Balance update error:', updateError);
      return { error: 'Failed to update wallet balance' };
    }

    // Log the withdrawal in wallet_transactions - FIXED COLUMN NAMES
    const { error: logError } = await supabase
      .from('wallet_transactions')
      .insert({
        seller_id: seller.id,
        order_id: null,
        transaction_type: 'debit', // FIXED: was 'type'
        amount: amount,
        balance_after: newWalletBalance, // ADDED
        description: 'Withdrawal Request',
        reference: null, // FIXED: was missing
        status: 'pending',
        clears_at: null
      });

    if (logError) {
      console.error('Transaction log error:', logError);
      // Rollback balance update
      await supabase
        .from('sellers')
        .update({ 
          available_balance: availableBalance,
          wallet_balance: currentWalletBalance
        } as any)
        .eq('id', seller.id);
      return { error: 'Failed to log transaction' };
    }

    // Create withdrawal request
    const { error: insertError } = await supabase
      .from('withdrawal_requests')
      .insert({
        seller_id: seller.id,
        amount: amount,
        bank_name: seller.bank_name,
        account_number: seller.bank_account_number,
        account_name: seller.account_name,
        bank_code: seller.bank_code,
        status: 'pending'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      // ROLLBACK: Add money back if withdrawal creation fails
      await supabase
        .from('sellers')
        .update({ 
          available_balance: availableBalance,
          wallet_balance: currentWalletBalance
        } as any)
        .eq('id', seller.id);
      
      // Also mark transaction as cancelled
      await supabase
        .from('wallet_transactions')
        .update({ status: 'cancelled' })
        .eq('seller_id', seller.id)
        .eq('transaction_type', 'debit')
        .eq('amount', amount)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      
      return { error: 'Failed to create withdrawal request' };
    }

    revalidatePath('/dashboard/finance');
    revalidatePath('/dashboard/finance/withdraw');
    return { message: `Withdrawal request for ₦${amount.toLocaleString()} submitted successfully!` };

  } catch (error) {
    console.error('Withdrawal error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

export async function cancelWithdrawal(withdrawalId: string): Promise<WithdrawalState> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: 'You must be logged in' };
    }

    const { data: seller } = await supabase
      .from('sellers')
      .select('id, available_balance, wallet_balance')
      .eq('user_id', user.id)
      .single();

    if (!seller) {
      return { error: 'Seller not found' };
    }

    // Get withdrawal details before cancelling
    const { data: withdrawal } = await supabase
      .from('withdrawal_requests')
      .select('amount, status')
      .eq('id', withdrawalId)
      .eq('seller_id', seller.id)
      .eq('status', 'pending')
      .single();

    if (!withdrawal) {
      return { error: 'Withdrawal not found or already processed' };
    }

    // ADD MONEY BACK TO BOTH BALANCES
    const currentAvailableBalance = parseFloat((seller.available_balance || 0).toString());
    const currentWalletBalance = parseFloat((seller.wallet_balance || 0).toString());
    const refundAmount = parseFloat(withdrawal.amount.toString());
    
    const newAvailableBalance = currentAvailableBalance + refundAmount;
    const newWalletBalance = currentWalletBalance + refundAmount;
    
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ 
        available_balance: newAvailableBalance,
        wallet_balance: newWalletBalance,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', seller.id);

    if (updateError) {
      console.error('Balance refund error:', updateError);
      return { error: 'Failed to refund balance' };
    }

    // Update transaction log to cancelled - FIXED COLUMN NAMES
    await supabase
      .from('wallet_transactions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('transaction_type', 'debit') // FIXED: was 'type'
      .eq('amount', refundAmount)
      .eq('seller_id', seller.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1); 

    // Cancel withdrawal request
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', withdrawalId);

    if (error) {
      // ROLLBACK: Remove money if cancellation fails
      await supabase
        .from('sellers')
        .update({ 
          available_balance: currentAvailableBalance,
          wallet_balance: currentWalletBalance
        } as any)
        .eq('id', seller.id);
      return { error: 'Failed to cancel withdrawal' };
    }

    revalidatePath('/dashboard/finance');
    return { message: `Withdrawal cancelled. ₦${refundAmount.toLocaleString()} has been returned to your wallet.` };

  } catch (error) {
    console.error('Cancel withdrawal error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// FUNCTION: Credit available balance when order is completed
// ============================================================================
export async function creditAvailableBalance(sellerId: string, amount: number) {
  const supabase = await createServerSupabaseClient();
  
  // Get current balances
  const { data: seller } = await supabase
    .from('sellers')
    .select('available_balance, wallet_balance')
    .eq('id', sellerId)
    .single();

  if (!seller) {
    console.error('Seller not found for creditAvailableBalance');
    return;
  }

  const currentAvailable = parseFloat((seller.available_balance || 0).toString());
  const currentWallet = parseFloat((seller.wallet_balance || 0).toString());
  const newAvailable = currentAvailable + amount;
  const newWallet = currentWallet + amount;

  // Update both balances
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      available_balance: newAvailable,
      wallet_balance: newWallet,
      updated_at: new Date().toISOString()
    })
    .eq('id', sellerId);

  if (updateError) {
    console.error('Failed to update balances:', updateError);
    return;
  }

  // Log the transaction - FIXED COLUMN NAMES
  const { error: logError } = await supabase
    .from('wallet_transactions')
    .insert({
      seller_id: sellerId,
      order_id: null,
      transaction_type: 'credit', // FIXED: was 'type'
      amount: amount,
      balance_after: newWallet, // ADDED
      description: 'Earnings cleared and moved to available balance',
      reference: null, // ADDED
      status: 'completed',
      clears_at: null
    });

  if (logError) {
    console.error('Failed to log transaction:', logError);
  }
  
  revalidatePath('/dashboard/finance');
}