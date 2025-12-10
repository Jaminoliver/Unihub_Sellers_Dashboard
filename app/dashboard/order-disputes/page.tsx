import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrderDisputesTable } from '@/components/features/order-disputes/OrderDisputesTable';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default async function OrderDisputesPage() {
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

  // Fetch all ORDER disputes (raised by buyers about seller's orders)
  const { data: disputes } = await supabase
    .from('disputes')
    .select(`
      *,
      order:orders(
        order_number,
        total_amount,
        product:products(name, image_urls),
        buyer:profiles!orders_buyer_id_fkey(full_name, email)
      )
    `)
    .eq('order.seller_id', seller.id)
    .order('created_at', { ascending: false });

  // Calculate stats
  const openDisputes = (disputes || []).filter(d => d.status === 'open').length;
  const resolvedDisputes = (disputes || []).filter(d => d.status === 'resolved').length;
  const totalDisputes = (disputes || []).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-3xl font-bold text-gray-900">Order Disputes</h1>
          <p className="text-gray-600 mt-1">
            Buyer complaints about your orders - respond professionally to resolve issues
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-white border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Disputes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalDisputes}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-gray-400" />
            </div>
          </Card>

          <Card className="p-6 bg-amber-50 border-2 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">Open Disputes</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{openDisputes}</p>
              </div>
              <Clock className="h-10 w-10 text-amber-500" />
            </div>
          </Card>

          <Card className="p-6 bg-green-50 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Resolved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{resolvedDisputes}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Disputes Table */}
        <OrderDisputesTable disputes={disputes || []} />
      </div>
    </div>
  );
}
