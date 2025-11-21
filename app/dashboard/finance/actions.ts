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

    // Get seller info
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, wallet_balance, bank_name, account_name, bank_account_number, bank_code, bank_verified')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return { error: 'Seller profile not found' };
    }

    if (!seller.bank_verified) {
      return { error: 'Please verify your bank account first' };
    }

    const walletBalance = parseFloat(seller.wallet_balance || '0');

    if (walletBalance < amount) {
      return { error: `Insufficient balance. Available: ₦${walletBalance.toLocaleString()}` };
    }

    // IMMEDIATELY DEDUCT FROM WALLET BALANCE
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ 
        wallet_balance: (walletBalance - amount).toString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', seller.id);

    if (updateError) {
      console.error('Balance update error:', updateError);
      return { error: 'Failed to update wallet balance' };
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
          wallet_balance: walletBalance.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', seller.id);
      return { error: 'Failed to create withdrawal request' };
    }

    revalidatePath('/dashboard/finance');
    revalidatePath('/dashboard/finance/withdraw');
    return { message: `Withdrawal request for ₦${amount.toLocaleString()} submitted successfully! Your balance has been updated.` };

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
      .select('id, wallet_balance')
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

    // ADD MONEY BACK TO WALLET
    const currentBalance = parseFloat(seller.wallet_balance || '0');
    const refundAmount = parseFloat(withdrawal.amount);
    
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ 
        wallet_balance: (currentBalance + refundAmount).toString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', seller.id);

    if (updateError) {
      console.error('Balance refund error:', updateError);
      return { error: 'Failed to refund balance' };
    }

    // Cancel withdrawal
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', withdrawalId);

    if (error) {
      // ROLLBACK: Remove money if cancellation fails
      await supabase
        .from('sellers')
        .update({ 
          wallet_balance: currentBalance.toString(),
          updated_at: new Date().toISOString()
        })
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