import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CreateSellerDisputeForm } from '@/components/features/seller-disputes/CreateSellerDisputeForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewSellerDisputePage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/seller-disputes" 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to My Disputes
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Dispute</h1>
          <p className="text-gray-600 mt-1">
            Raise a concern about platform actions, policies, or decisions
          </p>
        </div>

        {/* Form */}
        <CreateSellerDisputeForm sellerId={seller.id} />
      </div>
    </div>
  );
}