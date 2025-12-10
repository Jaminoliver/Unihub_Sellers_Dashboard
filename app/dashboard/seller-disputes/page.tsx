import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SellerDisputesTable } from '@/components/features/seller-disputes/SellerDisputesTable';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function SellerDisputesPage() {
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

  // Fetch SELLER disputes (seller's complaints against platform)
  const { data: disputes } = await supabase
    .from('seller_disputes')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  // Calculate stats
  const openDisputes = (disputes || []).filter(d => d.status === 'open' || d.status === 'under_review').length;
  const resolvedDisputes = (disputes || []).filter(d => d.status === 'resolved').length;
  const totalDisputes = (disputes || []).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Disputes</h1>
              <p className="text-gray-600 mt-1">
                Your complaints and concerns about platform actions or policies
              </p>
            </div>
            <Link href="/dashboard/seller-disputes/new">
              <Button className="bg-[#1DA1F2] hover:bg-[#1a8cd8]">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Dispute
              </Button>
            </Link>
          </div>
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
                <p className="text-sm text-amber-700">Active</p>
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

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">What can you dispute?</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Account suspension or restrictions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Product rejection decisions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Commission calculation errors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Delayed or incorrect payouts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Verification issues</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Policy disagreements or unfair treatment</span>
            </li>
          </ul>
        </div>

        {/* Disputes Table */}
        <SellerDisputesTable disputes={disputes || []} />
      </div>
    </div>
  );
}