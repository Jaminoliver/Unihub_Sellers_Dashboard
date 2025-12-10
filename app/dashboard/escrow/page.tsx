import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EscrowCard } from '@/components/features/finance/EscrowCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function EscrowPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // Fetch Seller Data
  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    return <div>Seller profile not found. Please contact support.</div>;
  }

  // Fetch Full Escrow Details with order information
  const { data: escrowTransactions } = await supabase
    .from('escrow')
    .select(`
      *,
      order:orders(
        order_number,
        product:products(name, image_urls),
        buyer:profiles!orders_buyer_id_fkey(full_name, email)
      )
    `)
    .eq('seller_id', user.id)
    .eq('status', 'holding')
    .order('hold_until', { ascending: true });

  // Calculate total
  const totalInEscrow = (escrowTransactions || []).reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/finance" 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Finance
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-3xl font-bold text-gray-900">Escrow Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track your funds held in escrow with live countdown timers
          </p>
          
          {escrowTransactions && escrowTransactions.length > 0 && (
            <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total in Escrow</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₦{totalInEscrow.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Active Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {escrowTransactions.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Escrow Cards with Countdown */}
        <EscrowCard escrowTransactions={escrowTransactions || []} />

        {/* Info Section */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How Escrow Works</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Funds are held in escrow for 7 days after delivery confirmation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>This protects both you and the buyer in case of disputes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Funds are automatically released to your wallet when the countdown reaches zero</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>If a dispute is opened, the escrow period is extended until resolution</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}